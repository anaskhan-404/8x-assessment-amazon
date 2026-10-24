import 'server-only'
import Stripe from 'stripe'
import { requiredEnv, ServiceError } from './errors'
let client: Stripe | undefined
export function getStripe() {
  const key = requiredEnv('STRIPE_SECRET_KEY')
  if (!key.startsWith('sk_test_')) throw new ServiceError(503, 'Only Stripe test mode is supported.')
  return client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 })
}
