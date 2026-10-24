import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDatabase, type Database } from '../db'
import * as schema from '../db/auth-schema'
import { requiredEnv, ServiceError } from './errors'

export function createAuth(database: Database) {
  const secret = requiredEnv('BETTER_AUTH_SECRET')
  if (secret.length < 32) throw new ServiceError(503, 'BETTER_AUTH_SECRET must contain at least 32 characters.')
  const baseURL = requiredEnv('BETTER_AUTH_URL')
  return betterAuth({
    appName: 'Parallel', baseURL, secret,
    database: drizzleAdapter(database, { provider: 'pg', schema, transaction: true }),
    trustedOrigins: [new URL(baseURL).origin],
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 10 }, '/sign-up/email': { window: 60, max: 5 } } },
  })
}
let auth: ReturnType<typeof createAuth> | undefined
export function getAuth() { return auth ??= createAuth(getDatabase()) }
export async function currentSession(requestHeaders?: Headers) {
  const { headers } = await import('next/headers')
  return getAuth().api.getSession({ headers: requestHeaders ?? await headers() })
}
export async function requireUser(requestHeaders?: Headers) {
  const session = await currentSession(requestHeaders)
  if (!session) throw new ServiceError(401, 'Please sign in to continue.')
  return session.user
}
export async function requirePageUser() {
  const { redirect } = await import('next/navigation')
  const session = await currentSession()
  if (!session) return redirect('/account')
  return session.user
}
