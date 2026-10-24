import { eq } from 'drizzle-orm'
import { getDatabase } from '@/db'
import { orders } from '@/db/schema'
import { requireUser } from '@/server/auth'
import { cartContext, GUEST_COOKIE, mergeCart } from '@/server/cart'
import { cookies } from 'next/headers'
import { requiredEnv, ServiceError } from '@/server/errors'
import { checkOrigin, endpoint, json } from '@/server/http'
import { prepareOrder } from '@/server/orders'
import { getStripe } from '@/server/stripe'

export const runtime = 'nodejs'
export function POST(request: Request) { return endpoint(async () => {
  checkOrigin(request)
  const user = await requireUser(request.headers)
  const stripe = getStripe()
  // Never offer checkout without the ability to verify its payment notification.
  requiredEnv('STRIPE_WEBHOOK_SECRET')
  const baseURL = new URL(requiredEnv('BETTER_AUTH_URL')).origin
  const { guestKey } = await cartContext()
  if (guestKey) { await mergeCart(user.id, guestKey); (await cookies()).delete(GUEST_COOKIE) }
  const { order, items } = await prepareOrder(user)
  let session
  if (order.stripeSessionId) session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  else {
    // Stable order snapshots + Stripe idempotency protect double-clicks/retries.
    // Do not reuse a pruned Stripe idempotency key after its guaranteed 24h window.
    if (Date.now() - order.createdAt.getTime() > 23 * 60 * 60 * 1000) throw new ServiceError(409, 'This checkout attempt is too old. Update your bag to start a new checkout.')
    session = await stripe.checkout.sessions.create({ mode: 'payment', allowed_payment_method_types: ['card'],
      client_reference_id: order.id, customer_email: order.customerEmail,
      metadata: { orderId: order.id, userId: user.id },
      line_items: items.map((item) => ({ quantity: item.quantity, price_data: { currency: order.currency,
        unit_amount: item.unitPriceCents, product_data: { name: item.name, metadata: { productId: item.productId } } } })),
      billing_address_collection: 'required', shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'PK'] },
      success_url: `${baseURL}/orders/${order.id}?checkout=returned`,
      cancel_url: `${baseURL}/cart?checkout=cancelled`,
    }, { idempotencyKey: `parallel-order-${order.id}` })
    await getDatabase().update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id))
  }
  if (session.livemode) throw new ServiceError(503, 'Only Stripe test mode is supported.')
  if (session.status !== 'open' || !session.url) throw new ServiceError(409, 'Checkout is closed. Check your order status or update your bag.')
  return json({ url: session.url, orderId: order.id })
}) }
