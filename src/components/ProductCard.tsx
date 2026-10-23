'use client'

import { Check, Plus, Scale, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useComparison } from '../comparison-context'
import type { Product } from '../types'
import { Rating } from './Rating'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function ProductCard({ product }: { product: Product }) {
  const { isSelected, isAtLimit, toggle } = useComparison()
  const selected = isSelected(product.id)
  const canCompare = product.category === 'headphones'
  const compareDisabled = canCompare && isAtLimit && !selected

  return (
    <article className={`product-card ${selected ? 'product-card--selected' : ''}`}>
      <Link className="product-card__image" href={`/product/${product.slug}`}>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <Image
          src={product.image}
          alt={`${product.brand} ${product.name}`}
          fill
          sizes="(max-width: 680px) 100vw, (max-width: 900px) 50vw, 33vw"
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
          <span className="stock-status">In stock</span>
        </div>

        <div className="product-card__actions">
          <Link className="button button--dark button--small" href={`/product/${product.slug}`}>
            <ShoppingBag size={17} />
            View product
          </Link>
          {canCompare ? (
            <button
              type="button"
              className={`button button--compare button--small ${selected ? 'is-selected' : ''}`}
              onClick={() => toggle(product.id)}
              disabled={compareDisabled}
              aria-pressed={selected}
              title={compareDisabled ? 'Remove a product before adding another' : undefined}
            >
              {selected ? <Check size={17} /> : <Scale size={17} />}
              {selected ? 'Added' : 'Compare'}
            </button>
          ) : (
            <button type="button" className="icon-action" aria-label={`Add ${product.name} to bag`}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
