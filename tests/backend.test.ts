import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import * as schema from '../src/db/schema'
import type { Database } from '../src/db'
import { seedCatalogue } from '../src/db/seed'
import { products } from '../src/data'
import { createAuth } from '../src/server/auth'
import { guestOwner, mergeCart, mutateCart, readCart, userOwner } from '../src/server/cart'
import { ownedOrder, prepareOrder } from '../src/server/orders'
import { applyPaymentEvent } from '../src/server/payments'
import { cartMutationSchema, priceToCents } from '../src/server/validation'
import { checkOrigin } from '../src/server/http'
import { POST as webhook } from '../src/app/api/stripe/webhook/route'

process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.BETTER_AUTH_SECRET = 'integration-test-secret-with-at-least-32-characters'
process.env.STRIPE_SECRET_KEY = 'sk_test_local_signature_tests_only'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_test_only'

test('input and money boundaries reject tampering', () => {
  assert.equal(priceToCents('349.95'), 34995)
  assert.equal(priceToCents('0.01'), 1)
  for (const amount of ['NaN', '-1', '1.234', '0', '1000000']) assert.throws(() => priceToCents(amount))
  for (const quantity of [0, -1, 1.5, 100, '2', null]) assert.equal(cartMutationSchema.safeParse({ productId: 'valid-id', quantity }).success, false)
  assert.equal(cartMutationSchema.safeParse({ productId: 'valid-id', quantity: 1, price: 1 }).success, false)
  assert.throws(() => checkOrigin(new Request('http://localhost:3000/api/cart', { method: 'POST', headers: { origin: 'https://evil.example' } })))
  assert.throws(() => checkOrigin(new Request('http://localhost:3000/api/cart', { method: 'POST' })))
  assert.doesNotThrow(() => checkOrigin(new Request('http://localhost:3000/api/cart', { method: 'POST', headers: { origin: 'http://localhost:3000' } })))
})

test('webhook rejects missing, forged, and modified signatures', async () => {
  const missing = await webhook(new Request('http://localhost:3000/api/stripe/webhook', { method: 'POST', body: '{}' }))
  assert.equal(missing.status, 400)
  const forged = await webhook(new Request('http://localhost:3000/api/stripe/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=123,v1=forged' } }))
  assert.equal(forged.status, 400)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const payload = JSON.stringify({ id: 'evt_signature', object: 'event', type: 'unhandled.event', livemode: false, data: { object: {} } })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! })
  const verified = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  assert.equal(verified.id, 'evt_signature')
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', signature, process.env.STRIPE_WEBHOOK_SECRET!))
})

test('PostgreSQL migrations, authentication, carts, orders, and payment processing', async (t) => {
  const pg = new PGlite()
  const localDb = drizzle(pg, { schema })
  // Both adapters execute the same Drizzle PgDatabase queries and transactions.
  const db = localDb as unknown as Database
  t.after(() => pg.close())
  await migrate(localDb, { migrationsFolder: './drizzle' })
  await migrate(localDb, { migrationsFolder: './drizzle' })
  await seedCatalogue(db)
  await seedCatalogue(db)
  const catalogue = await db.select().from(schema.productsTable)
  assert.equal(catalogue.length, products.length)
  for (const product of products) {
    const persisted = catalogue.find((row) => row.id === product.id)!
    assert.equal(persisted.price, product.price.toFixed(2))
    assert.deepEqual(persisted.specs, product.specs)
  }

  const auth = createAuth(db)
  let userId = ''
  let sessionCookie = ''
  const password = 'Valid-assessment-password-2026!'
  const email = 'backend-test@example.com'
  async function authRequest(path: string, body?: unknown, cookie?: string, origin = 'http://localhost:3000') {
    return auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: body ? 'POST' : 'GET', headers: { origin, 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }))
  }

  await t.test('registration hashes passwords and creates a real session', async () => {
    const invalid = await authRequest('sign-up/email', { name: 'Test', email: 'invalid', password: 'short' })
    assert.equal(invalid.ok, false)
    const response = await authRequest('sign-up/email', { name: 'Test Shopper', email, password })
    assert.equal(response.status, 200, await response.clone().text())
    const data = await response.json()
    userId = data.user.id
    sessionCookie = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ')
    assert.match(response.headers.get('set-cookie')!, /httponly/i)
    const [account] = await db.select().from(schema.account).where(eq(schema.account.userId, userId))
    assert.ok(account.password && account.password !== password && account.password.length > 64)
    const sessionResponse = await authRequest('get-session', undefined, sessionCookie)
    assert.equal((await sessionResponse.json()).user.id, userId)
    const duplicate = await authRequest('sign-up/email', { name: 'Duplicate', email, password })
    assert.equal(duplicate.ok, false)
  })

  await t.test('sign-out revokes session, wrong passwords and cross-origin sign-in fail', async () => {
    assert.equal((await authRequest('sign-out', {}, sessionCookie)).status, 200)
    assert.equal(await (await authRequest('get-session', undefined, sessionCookie)).json(), null)
    assert.equal((await authRequest('sign-in/email', { email, password: 'Wrong-password!' })).ok, false)
    assert.equal((await authRequest('sign-in/email', { email, password }, undefined, 'https://evil.example')).status, 403)
    const login = await authRequest('sign-in/email', { email, password })
    assert.equal(login.status, 200, await login.clone().text())
  })

  const product = products[0]
  const owner = () => ({ key: userOwner(userId), userId })
  await t.test('guest merge is repeatable, quantities are bounded, totals use seeded prices', async () => {
    const key = guestOwner('test-guest-token')
    await mutateCart({ key }, product.id, 2, 'add', db)
    await mutateCart(owner(), product.id, 1, 'add', db)
    let cart = await mergeCart(userId, key, db)
    assert.equal(cart.items[0].quantity, 3)
    assert.equal(cart.totalCents, Math.round(product.price * 100) * 3)
    cart = await mergeCart(userId, key, db)
    assert.equal(cart.items[0].quantity, 3)
    await assert.rejects(mutateCart(owner(), 'unknown-product', 1, 'add', db))
    await assert.rejects(mutateCart(owner(), product.id, 99, 'add', db))
    await mutateCart(owner(), product.id, 2, 'set', db)
    assert.equal((await readCart(owner(), db)).items[0].quantity, 2)
  })

  let orderId = ''
  let total = 0
  await t.test('checkout snapshots prices, repeated preparation reuses the order, ownership is enforced', async () => {
    const prepared = await prepareOrder({ id: userId, email }, db)
    orderId = prepared.order.id; total = prepared.order.totalCents
    assert.equal(prepared.order.status, 'pending')
    assert.equal(prepared.order.paymentStatus, 'unpaid')
    assert.equal(prepared.items[0].unitPriceCents, Math.round(product.price * 100))
    assert.equal((await prepareOrder({ id: userId, email }, db)).order.id, orderId)
    await assert.rejects(ownedOrder('different-user', orderId, db), /Order not found/)
    assert.equal((await ownedOrder(userId, orderId, db)).items.length, 1)
  })
  function event(type = 'checkout.session.completed', overrides = {}): Stripe.Event {
    return { id: `evt_${randomUUID()}`, type, livemode: false, data: { object: {
      id: `cs_test_${orderId}`, object: 'checkout.session', livemode: false, mode: 'payment',
      client_reference_id: orderId, metadata: { orderId, userId }, amount_total: total, currency: 'usd',
      payment_status: 'paid', payment_intent: `pi_test_${orderId}`,
      collected_information: { shipping_details: { name: 'Test Shopper', address: { line1: '1 Test Street', line2: null, city: 'Test City', state: 'CA', postal_code: '90210', country: 'US' } } },
      ...overrides,
    } } } as unknown as Stripe.Event
  }
  await t.test('unpaid completion stays pending; mismatched amount/owner/session/live events are rejected', async () => {
    await applyPaymentEvent(event('checkout.session.completed', { payment_status: 'unpaid' }), db)
    assert.equal((await ownedOrder(userId, orderId, db)).order.status, 'pending')
    for (const overrides of [{ amount_total: 1 }, { currency: 'eur' }, { id: 'cs_wrong' }, { metadata: { orderId, userId: 'wrong' } }, { livemode: true }]) {
      await assert.rejects(applyPaymentEvent(event('checkout.session.completed', overrides), db))
    }
    const live = event(); live.livemode = true
    await assert.rejects(applyPaymentEvent(live, db))
    assert.equal((await ownedOrder(userId, orderId, db)).order.paymentStatus, 'unpaid')
  })
  await t.test('verified payment clears matching cart; duplicate and out-of-order events are harmless', async () => {
    const paid = event()
    const payload = JSON.stringify(paid)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! })
    await applyPaymentEvent(stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!), db)
    assert.equal((await ownedOrder(userId, orderId, db)).order.paymentStatus, 'paid')
    assert.equal((await readCart(owner(), db)).items.length, 0)
    assert.deepEqual(await applyPaymentEvent(paid, db), { duplicate: true })
    await applyPaymentEvent(event('checkout.session.expired', { payment_status: 'unpaid' }), db)
    await applyPaymentEvent(event('checkout.session.async_payment_failed', { payment_status: 'unpaid' }), db)
    assert.equal((await ownedOrder(userId, orderId, db)).order.status, 'paid')
    assert.equal((await db.select().from(schema.addresses)).length, 1)
  })
  await t.test('later cart edits survive payment; expired checkout can be retried', async () => {
    await mutateCart(owner(), product.id, 1, 'add', db)
    let prepared = await prepareOrder({ id: userId, email }, db)
    orderId = prepared.order.id; total = prepared.order.totalCents
    await mutateCart(owner(), product.id, 2, 'set', db)
    await applyPaymentEvent(event(), db)
    assert.equal((await readCart(owner(), db)).items[0].quantity, 2)
    prepared = await prepareOrder({ id: userId, email }, db)
    orderId = prepared.order.id; total = prepared.order.totalCents
    await applyPaymentEvent(event('checkout.session.expired', { payment_status: 'unpaid' }), db)
    assert.equal((await ownedOrder(userId, orderId, db)).order.status, 'expired')
    assert.notEqual((await prepareOrder({ id: userId, email }, db)).order.id, orderId)
    await mutateCart(owner(), product.id, 0, 'remove', db)
    await assert.rejects(prepareOrder({ id: userId, email }, db), /bag is empty/)
  })
})
