import { requireUser } from '@/server/auth'
import { endpoint, json } from '@/server/http'
import { listOrders } from '@/server/orders'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return endpoint(async () => json({ orders: await listOrders((await requireUser(request.headers)).id) })) }
