'use client'

import Link from 'next/link'
import { ArrowRight, Heart, Trash2 } from 'lucide-react'
import { CatalogueImage } from '@/components/CatalogueImage'
import { QuantityControl } from '@/components/shopping/QuantityControl'
import { OrderSummary } from '@/components/shopping/OrderSummary'
import { ShoppingEmpty } from '@/components/shopping/ShoppingEmpty'
import { ShoppingStatus } from '@/components/shopping/ShoppingStatus'
import { useShopping } from '@/shopping-context'
import { formatMoney } from '@/commerce'

export function CartPage() {
  const { lines, count, setQuantity, removeFromCart, saveForLater, busy, loading, loadError, refresh } = useShopping()
  return <section className="container shopping-page"><div className="shopping-heading"><div><p className="eyebrow">Your good finds</p><h1>Shopping cart <span>({count})</span></h1></div><Link className="text-link" href="/wishlist"><Heart size={17} aria-hidden="true" />Your wishlist</Link></div>
    {loading || loadError ? <ShoppingStatus loading={loading} error={loadError} retry={refresh} /> : lines.length ? <div className="shopping-layout"><div className="cart-items" aria-busy={busy}><p className="cart-items__note">Your cart is saved. Adding an item does not reserve stock.</p>{lines.map((item) => <article className="cart-item" key={item.productId}>
      <Link className="cart-item__image" href={'/product/' + item.slug}><CatalogueImage src={item.image} alt={item.name} fill sizes="(max-width: 540px) 96px, 150px" /></Link>
      <div className="cart-item__body"><p className="eyebrow">{item.product?.brand ?? 'Parallel'}</p><Link className="cart-item__title" href={'/product/' + item.slug}>{item.name}</Link><p className="cart-item__spec">{item.product?.highlights.slice(0, 2).map((detail) => detail.label + ': ' + detail.value).join(' · ')}</p><p>{formatMoney(item.unitPriceCents / 100)} each{!item.available && <strong className="checkout-error"> · Currently unavailable</strong>}</p>
        <div className="cart-item__actions"><QuantityControl name={item.name} quantity={item.quantity} disabled={busy} onChange={(next) => { void setQuantity(item.productId, next) }} /><button className="text-button" type="button" disabled={busy} onClick={() => { void saveForLater(item.productId) }}><Heart size={15} aria-hidden="true" />Save for later</button><button className="text-button" type="button" disabled={busy} onClick={() => { void removeFromCart(item.productId) }} aria-label={'Remove ' + item.name + ' from cart'}><Trash2 size={15} aria-hidden="true" />Remove</button></div>
      </div><strong className="cart-item__total">{formatMoney(item.lineTotalCents / 100)}</strong>
    </article>)}</div><OrderSummary><Link className="button shop-primary button--full" href="/checkout">Continue to checkout <ArrowRight size={16} aria-hidden="true" /></Link><Link className="summary-shopping-link" href="/search">Continue shopping</Link></OrderSummary></div> : <ShoppingEmpty />}
  </section>
}

