import { applyPaymentEvent } from '@/server/payments'
import { requiredEnv, ServiceError } from '@/server/errors'
import { endpoint, json } from '@/server/http'
import { getStripe } from '@/server/stripe'
export const runtime = 'nodejs'
export function POST(request: Request) { return endpoint(async () => {
  const signature = request.headers.get('stripe-signature')
  if (!signature) throw new ServiceError(400, 'Missing Stripe signature.')
  const payload = await request.text()
  if (payload.length > 1_000_000) throw new ServiceError(413, 'Webhook is too large.')
  const stripe = getStripe()
  const secret = requiredEnv('STRIPE_WEBHOOK_SECRET')
  let event
  try { event = stripe.webhooks.constructEvent(payload, signature, secret) }
  catch { throw new ServiceError(400, 'Invalid Stripe signature.') }
  return json(await applyPaymentEvent(event))
}) }
