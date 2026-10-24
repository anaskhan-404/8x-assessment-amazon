'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { ShoppingEmpty } from '@/components/shopping/ShoppingEmpty'
import { ShoppingStatus } from '@/components/shopping/ShoppingStatus'
import { useShopping } from '@/shopping-context'
import { productById } from '@/data'

export function WishlistPage() {
  const { wishlistItems, loading, loadError, wishlistError, refresh, signedIn } = useShopping()
  return <section className="container shopping-page"><div className="shopping-heading"><div><p className="eyebrow">Worth coming back to</p><h1>Your wishlist <span>({wishlistItems.length})</span></h1><p>Your saved favourites, all in one place.</p></div><Link href="/cart" className="text-link"><ShoppingCart size={17} aria-hidden="true" />View cart</Link></div>
    {loading || loadError || wishlistError ? <ShoppingStatus loading={loading} error={loadError || wishlistError} retry={refresh} /> : !signedIn ? <div className="shopping-empty"><h2>Sign in to see your favourites</h2><p>Your wishlist is saved to your account.</p><Link className="button shop-primary" href="/account">Sign in</Link></div> : wishlistItems.length ? <div className="product-grid product-grid--four">{wishlistItems.map((item) => {
      const product = productById(item.productId)
      return product ? <ProductCard key={item.productId} product={{ ...product, price: Number(item.price) }} unavailable={!item.available} /> : <article className="shop-panel" key={item.productId}><h2>{item.name}</h2><p>This product is no longer listed.</p></article>
    })}</div> : <ShoppingEmpty kind="wishlist" />}
  </section>
}

