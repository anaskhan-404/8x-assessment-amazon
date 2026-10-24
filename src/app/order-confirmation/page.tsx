import { OrderConfirmationView } from '@/views/OrdersPage'
export const metadata = { title: 'Order confirmation' }
export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  return <OrderConfirmationView preview={(await searchParams).preview === '1'} />
}
