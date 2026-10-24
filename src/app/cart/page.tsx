import { Cart } from '@/components/commerce/Cart'
export const metadata = { title: 'Shopping bag' }
export default async function CartPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) { return <Cart cancelled={(await searchParams).checkout === 'cancelled'} /> }
