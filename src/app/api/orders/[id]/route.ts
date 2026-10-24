import { requireUser } from '@/server/auth'
import { endpoint, json } from '@/server/http'
import { ownedOrder } from '@/server/orders'
import { orderIdSchema } from '@/server/validation'
export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return endpoint(async () => {
  const user = await requireUser(request.headers)
  return json(await ownedOrder(user.id, orderIdSchema.parse((await params).id)))
}) }
