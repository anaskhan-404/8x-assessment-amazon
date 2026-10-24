import 'server-only'
import { ZodError } from 'zod'
import { requiredEnv, ServiceError } from './errors'

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}
export function checkOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(requiredEnv('BETTER_AUTH_URL')).origin) {
    throw new ServiceError(403, 'Request origin is not allowed.')
  }
}
export async function body(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ServiceError(415, 'Expected application/json.')
  const text = await request.text()
  if (text.length > 16_384) throw new ServiceError(413, 'Request is too large.')
  try { return JSON.parse(text) as unknown } catch { throw new ServiceError(400, 'Invalid JSON.') }
}
export async function endpoint(run: () => Promise<Response>) {
  try { return await run() } catch (error) {
    if (error instanceof ServiceError) return json({ error: error.message }, error.status)
    if (error instanceof ZodError) return json({ error: 'Invalid input.', issues: error.issues.map(({ path, message }) => ({ path, message })) }, 400)
    // Do not log database URLs, SQL parameters, credentials, or payment payloads.
    console.error('Backend request failed', error instanceof Error ? error.name : 'UnknownError')
    return json({ error: 'The service is temporarily unavailable. Please try again.' }, 503)
  }
}
