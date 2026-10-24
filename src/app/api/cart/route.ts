import { cartContext, mutateCart, readCart } from '@/server/cart'
import { body, checkOrigin, endpoint, json } from '@/server/http'
import { cartMutationSchema, productMutationSchema } from '@/server/validation'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET() { return endpoint(async () => {
  const { owner } = await cartContext()
  return json(owner ? await readCart(owner) : { items: [], currency: 'usd', totalCents: 0 })
}) }
function write(request: Request, operation: 'add' | 'set' | 'remove') { return endpoint(async () => {
  checkOrigin(request)
  const input = operation === 'remove' ? { ...productMutationSchema.parse(await body(request)), quantity: 0 } : cartMutationSchema.parse(await body(request))
  const { owner } = await cartContext(true)
  return json(await mutateCart(owner!, input.productId, input.quantity, operation))
}) }
export function POST(request: Request) { return write(request, 'add') }
export function PATCH(request: Request) { return write(request, 'set') }
export function DELETE(request: Request) { return write(request, 'remove') }
