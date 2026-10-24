import { cookies } from 'next/headers'
import { cartContext, GUEST_COOKIE, mergeCart, readCart } from '@/server/cart'
import { checkOrigin, endpoint, json } from '@/server/http'
import { ServiceError } from '@/server/errors'
export const runtime = 'nodejs'
export function POST(request: Request) { return endpoint(async () => {
  checkOrigin(request)
  const { session, guestKey, owner } = await cartContext()
  if (!session || !owner) throw new ServiceError(401, 'Please sign in to merge your bag.')
  const cart = guestKey ? await mergeCart(session.user.id, guestKey) : await readCart(owner)
  if (guestKey) (await cookies()).delete(GUEST_COOKIE)
  return json(cart)
}) }
