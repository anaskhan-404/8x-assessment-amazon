import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getDatabase, type Database } from '../db'
import { cartItems, carts, productsTable } from '../db/schema'
import { currentSession } from './auth'
import { ServiceError } from './errors'
import { priceToCents } from './validation'

export const GUEST_COOKIE = 'parallel-guest-cart'
export const MAX_CART_LINES = 50
export const guestOwner = (token: string) => `guest:${createHash('sha256').update(token).digest('hex')}`
export const userOwner = (id: string) => `user:${id}`
export type CartOwner = { key: string; userId?: string }
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export async function lockCart(tx: Transaction, owner: CartOwner) {
  await tx.insert(carts).values({ ownerKey: owner.key, userId: owner.userId }).onConflictDoNothing({ target: carts.ownerKey })
  const [cart] = await tx.select().from(carts).where(eq(carts.ownerKey, owner.key)).for('update')
  return cart
}
export async function pricedItems(db: Database | Transaction, cartId: string) {
  const rows = await db.select({ product: productsTable, quantity: cartItems.quantity }).from(cartItems)
    .innerJoin(productsTable, eq(cartItems.productId, productsTable.id)).where(eq(cartItems.cartId, cartId))
  return rows.map(({ product, quantity }) => ({ productId: product.id, name: product.name,
    slug: product.slug, image: product.image, quantity, unitPriceCents: priceToCents(product.price), available: product.active }))
}
export async function readCart(owner: CartOwner, db = getDatabase()) {
  const [cart] = await db.select().from(carts).where(eq(carts.ownerKey, owner.key))
  const items = cart ? await pricedItems(db, cart.id) : []
  return { items, currency: 'usd', totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) }
}
export async function mutateCart(owner: CartOwner, productId: string, quantity: number, operation: 'add' | 'set' | 'remove', db = getDatabase()) {
  await db.transaction(async (tx) => {
    const cart = await lockCart(tx, owner)
    const condition = and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId))
    if (operation === 'remove') {
      await tx.delete(cartItems).where(condition)
    } else {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new ServiceError(400, 'Quantity must be between 1 and 99.')
      const [product] = await tx.select().from(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.active, true)))
      if (!product) throw new ServiceError(404, 'Product is unavailable.')
      const existing = await tx.select().from(cartItems).where(eq(cartItems.cartId, cart.id))
      const line = existing.find((item) => item.productId === productId)
      if (!line && existing.length >= MAX_CART_LINES) throw new ServiceError(400, 'Your bag can contain up to 50 different products.')
      const next = operation === 'add' ? (line?.quantity ?? 0) + quantity : quantity
      if (next > 99) throw new ServiceError(400, 'The maximum quantity per product is 99.')
      await tx.insert(cartItems).values({ cartId: cart.id, productId, quantity: next })
        .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], set: { quantity: next } })
    }
    await tx.update(carts).set({ version: sql`${carts.version} + 1`, updatedAt: new Date() }).where(eq(carts.id, cart.id))
  })
  return readCart(owner, db)
}

export async function mergeCart(userId: string, guestKey: string, db = getDatabase()) {
  const owner = { key: userOwner(userId), userId }
  await db.transaction(async (tx) => {
    // Deterministic lock ordering; delete the guest cart only after all lines transfer.
    const guest = await lockCart(tx, { key: guestKey })
    const target = await lockCart(tx, owner)
    const guestLines = await tx.select().from(cartItems).where(eq(cartItems.cartId, guest.id))
    const targetLines = await tx.select().from(cartItems).where(eq(cartItems.cartId, target.id))
    if (new Set([...targetLines, ...guestLines].map((i) => i.productId)).size > MAX_CART_LINES) {
      throw new ServiceError(409, 'Your combined bags exceed 50 products. Remove items from your saved bag and retry merging.')
    }
    for (const line of guestLines) {
      const quantity = Math.min(99, line.quantity + (targetLines.find((i) => i.productId === line.productId)?.quantity ?? 0))
      await tx.insert(cartItems).values({ cartId: target.id, productId: line.productId, quantity })
        .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], set: { quantity } })
    }
    if (guestLines.length) await tx.update(carts).set({ version: sql`${carts.version} + 1`, updatedAt: new Date() }).where(eq(carts.id, target.id))
    await tx.delete(carts).where(eq(carts.id, guest.id))
  })
  return readCart(owner, db)
}

export async function cartContext(createGuest = false) {
  const session = await currentSession()
  const jar = await cookies()
  let token = jar.get(GUEST_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) token = undefined
  if (!session && !token && createGuest) {
    token = randomBytes(32).toString('hex')
    jar.set(GUEST_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  }
  return { session, guestKey: token ? guestOwner(token) : null,
    owner: session ? { key: userOwner(session.user.id), userId: session.user.id } : token ? { key: guestOwner(token) } : null }
}
