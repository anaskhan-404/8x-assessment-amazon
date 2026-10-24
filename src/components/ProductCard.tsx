'use client'

import { Check, Heart, Scale, ShoppingCart } from 'lucide-react'
import { CatalogueImage as Image } from './CatalogueImage'
import Link from 'next/link'
import { useComparison } from '../comparison-context'
import type { Product } from '../types'
import { Rating } from './Rating'
import { canCompareProduct } from '../data'
import { useShopping } from '../shopping-context'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function ProductCard({ product, unavailable = false }: { product: Product; unavailable?: boolean }) {
  const { addToCart, wishlist, toggleWishlist, busy } = useShopping()
  const saved = wishlist.includes(product.id)
  const { isSelected, limitReason, toggle } = useComparison()
  const selected = isSelected(product.id)
  const canCompare = canCompareProduct(product)
  const reason = !selected ? limitReason(product.id) : null
  const compareDisabled = Boolean(reason)
  const savings = product.previousPrice && product.previousPrice > product.price
    ? Math.round((1 - product.price / product.previousPrice) * 100)
    : 0

  return (
    <article className={`product-card ${selected ? 'product-card--selected' : ''} ${product.image.endsWith('.webp') || product.category === 'books' ? 'product-card--contained' : ''}`}>
      <button className={`product-save ${saved ? 'is-saved' : ''}`} type="button" disabled={busy} aria-label={`${saved ? 'Remove from wishlist:' : 'Save to wishlist:'} ${product.name}`} aria-pressed={saved} onClick={() => { void toggleWishlist(product.id) }}><Heart size={19} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      <Link className="product-card__image" href={`/product/${product.slug}`}>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <Image
          src={product.image}
          alt={`${product.brand} ${product.name}`}
          fill
          sizes="(max-width: 540px) 50vw, (max-width: 1100px) 33vw, 25vw"
          style={{ objectPosition: product.imagePosition }}
        />
      </Link>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.brand}</span>
          <Rating rating={product.rating} count={product.reviewCount} />
        </div>
        <Link className="product-card__title" href={`/product/${product.slug}`}>
          {product.name}
        </Link>
        <p className="product-card__description">{product.description}</p>

        <dl className="product-highlights">
          {product.highlights.slice(0, 3).map((highlight) => (
            <div key={highlight.label}>
              <dt>{highlight.label}</dt>
              <dd>{highlight.value}</dd>
            </div>
          ))}
        </dl>

        <div className="product-card__price-row">
          <div>
            <span className="product-price">{money.format(product.price)}</span>
            {product.previousPrice && (
              <del>{money.format(product.previousPrice)}</del>
            )}
          </div>
          <span className="stock-status">Demo price</span>
        </div>
        {savings > 0 && <p className="product-saving">Save {savings}% <span>on the previous price</span></p>}

        <div className="product-card__actions">
          <button className="button shop-primary button--small" type="button" disabled={busy || unavailable} onClick={() => { void addToCart(product.id) }} aria-label={`Add to cart: ${product.name}`}><ShoppingCart size={17} aria-hidden="true" />{unavailable ? 'Unavailable' : 'Add to cart'}</button>
          {canCompare ? (
            <button
              type="button"
              className={`button button--compare button--small ${selected ? 'is-selected' : ''}`}
              onClick={() => toggle(product.id)}
              disabled={compareDisabled}
              aria-pressed={selected}
              title={reason ?? undefined}
              aria-label={`${selected ? 'Remove from comparison:' : 'Add to compare:'} ${product.brand} ${product.name}`}
            >
              {selected ? <Check size={17} /> : <Scale size={17} />}
              {selected ? 'Added to compare' : 'Add to compare'}
            </button>
          ) : null}
        </div>
        {canCompare && reason && <p className="comparison-limit-note">{reason}</p>}
      </div>
    </article>
  )
}
