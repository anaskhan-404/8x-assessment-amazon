import { requirePageUser } from '@/server/auth'
import { Wishlist } from '@/components/commerce/Wishlist'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your wishlist' }
export default async function WishlistPage() { await requirePageUser(); return <Wishlist /> }
