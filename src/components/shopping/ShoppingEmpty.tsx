import Link from 'next/link'
import { ArrowRight, Heart, PackageOpen, ShoppingCart } from 'lucide-react'

export function ShoppingEmpty({ kind = 'cart' }: { kind?: 'cart' | 'wishlist' | 'orders' }) {
  const Icon = kind === 'wishlist' ? Heart : kind === 'orders' ? PackageOpen : ShoppingCart
  const copy = {
    cart: ['Your cart is waiting for a good find', 'Explore everyday favourites and add something you love.'],
    wishlist: ['Keep your favourites close', 'Tap the heart on a product to save it here for later.'],
    orders: ['Your orders will appear here', 'Order history will be available when account and checkout services are connected. No orders have been placed by this frontend.'],
  }[kind]
  return <div className="shopping-empty"><span><Icon size={36} strokeWidth={1.4} aria-hidden="true" /></span><h2>{copy[0]}</h2><p>{copy[1]}</p><Link href="/search" className="button shop-primary">Explore products <ArrowRight size={17} aria-hidden="true" /></Link></div>
}
