import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { getDatabase } from '../db'
import { orderItems, orders } from '../db/schema'
import { lockCart, pricedItems, userOwner } from './cart'
import { ServiceError } from './errors'
import { totalCents } from './validation'

export async function prepareOrder(user: { id: string; email: string }, db = getDatabase()) {
  return db.transaction(async (tx) => {
    const cart = await lockCart(tx, { key: userOwner(user.id), userId: user.id })
    const [existing] = await tx.select().from(orders).where(and(eq(orders.cartId, cart.id), eq(orders.cartVersion, cart.version)))
    if (existing) {
      if (existing.status !== 'pending') throw new ServiceError(409, 'This bag has already been checked out. Refresh your bag.')
      return { order: existing, items: await tx.select().from(orderItems).where(eq(orderItems.orderId, existing.id)) }
    }
    const lines = await pricedItems(tx, cart.id)
    if (!lines.length) throw new ServiceError(400, 'Your bag is empty.')
    if (lines.some((line) => !line.available)) throw new ServiceError(409, 'Remove unavailable products before checkout.')
    let amount: number
    try { amount = totalCents(lines) } catch { throw new ServiceError(400, 'The order total exceeds the supported limit.') }
    const [order] = await tx.insert(orders).values({ userId: user.id, customerEmail: user.email,
      cartId: cart.id, cartVersion: cart.version, totalCents: amount }).returning()
    const items = await tx.insert(orderItems).values(lines.map((line) => ({ orderId: order.id, productId: line.productId,
      name: line.name, unitPriceCents: line.unitPriceCents, quantity: line.quantity }))).returning()
    return { order, items }
  })
}
export async function listOrders(userId: string, db = getDatabase()) {
  return db.select({ id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus,
    totalCents: orders.totalCents, currency: orders.currency, createdAt: orders.createdAt })
    .from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(100)
}
export async function ownedOrder(userId: string, id: string, db = getDatabase()) {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, userId)))
  if (!order) throw new ServiceError(404, 'Order not found.')
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  return { order, items }
}
