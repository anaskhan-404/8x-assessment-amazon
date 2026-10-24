import { OrderDetailView } from '@/views/OrdersPage'
import { notFound } from 'next/navigation'
import { requirePageUser } from '@/server/auth'
import { ownedOrder } from '@/server/orders'
import { ServiceError } from '@/server/errors'
import { orderIdSchema } from '@/server/validation'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Order details' }
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser()
  const id = orderIdSchema.safeParse((await params).id)
  if (!id.success) notFound()
  const result = await ownedOrder(user.id, id.data).catch((error: unknown) => {
    if (error instanceof ServiceError && error.status === 404) notFound()
    throw error
  })
  const { order, items } = result
  return <OrderDetailView order={order} items={items} />
}
