import { OrdersPage as OrdersView } from '@/views/OrdersPage'
import { requirePageUser } from '@/server/auth'
import { listOrders } from '@/server/orders'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your orders' }
export default async function OrdersPage() {
  const user = await requirePageUser()
  const orders = await listOrders(user.id)
  return <OrdersView orders={orders} />
}
