import { config } from 'dotenv'
import { getStripe } from '../src/server/stripe'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })
try {
  const balance = await getStripe().balance.retrieve()
  if (balance.livemode) throw new Error('Live mode is disabled')
  console.log('Stripe credentials verified: test mode. No payment or checkout session was created.')
} catch (error) {
  console.error('Stripe verification failed:', error instanceof Error ? error.name : 'UnknownError')
  process.exitCode = 1
}
