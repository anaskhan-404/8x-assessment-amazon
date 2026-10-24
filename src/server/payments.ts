import 'server-only'
import type Stripe from 'stripe'
import { and, eq, sql } from 'drizzle-orm'
import { getDatabase } from '../db'
import { addresses, cartItems, carts, orders, paymentEvents } from '../db/schema'
import { ServiceError } from './errors'

const handledEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'])

// Call only with an event verified against the endpoint's Stripe signing secret.
export async function applyPaymentEvent(event: Stripe.Event, db = getDatabase()) {
  if (event.livemode) throw new ServiceError(400, 'Live payment events are not supported.')
  if (!handledEvents.has(event.type)) return { ignored: true }
  const checkout = event.data.object as Stripe.Checkout.Session
  const orderId = checkout.metadata?.orderId
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new ServiceError(400, 'Missing order reference.')
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order) throw new ServiceError(400, 'Unknown order reference.')
    // A webhook may race the API response that saves the session ID. Metadata is
    // signed by Stripe; bind the first matching session under the order row lock.
    if (checkout.livemode || checkout.mode !== 'payment' || checkout.client_reference_id !== order.id ||
      checkout.metadata?.userId !== order.userId || (order.stripeSessionId && checkout.id !== order.stripeSessionId) ||
      checkout.amount_total !== order.totalCents || checkout.currency !== order.currency) {
      throw new ServiceError(400, 'Payment does not match the pending order.')
    }
    const inserted = await tx.insert(paymentEvents).values({ id: event.id, orderId: order.id, type: event.type }).onConflictDoNothing().returning()
    if (!inserted.length) return { duplicate: true }
    // Paid is terminal: late expiration/failure notifications cannot undo it.
    if (order.paymentStatus === 'paid') return { duplicate: true }
    const paid = (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && checkout.payment_status === 'paid'
    const failed = event.type === 'checkout.session.async_payment_failed'
    const expired = event.type === 'checkout.session.expired'
    const shipping = checkout.collected_information?.shipping_details
    const address = shipping ? { name: shipping.name, line1: shipping.address.line1, line2: shipping.address.line2,
      city: shipping.address.city, state: shipping.address.state, postalCode: shipping.address.postal_code, country: shipping.address.country } : null
    await tx.update(orders).set({ stripeSessionId: checkout.id,
      stripePaymentIntentId: typeof checkout.payment_intent === 'string' ? checkout.payment_intent : checkout.payment_intent?.id,
      ...(paid ? { status: 'paid' as const, paymentStatus: 'paid' as const, paidAt: new Date(), shippingAddress: address } : {}),
      ...(failed ? { status: 'failed' as const, paymentStatus: 'failed' as const } : {}),
      ...(expired ? { status: 'expired' as const } : {}),
    }).where(eq(orders.id, order.id))
    if (paid && address) await tx.insert(addresses).values({ userId: order.userId, address })
    if (paid || failed || expired) {
      // Do not erase items added or changed while Stripe Checkout was open.
      const updated = await tx.update(carts).set({ version: sql`${carts.version} + 1`, updatedAt: new Date() })
        .where(and(eq(carts.id, order.cartId), eq(carts.version, order.cartVersion))).returning()
      if (paid && updated.length) await tx.delete(cartItems).where(eq(cartItems.cartId, order.cartId))
    }
    return { processed: true }
  })
}
