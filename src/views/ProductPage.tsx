'use client'

import { Check, CheckCircle2, ChevronRight, PackageCheck, Scale, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { Rating } from '../components/Rating'
import { useComparison } from '../comparison-context'
import { categoryBySlug, headphoneSpecs, productBySlug } from '../data'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function ProductPage() {
  const params = useParams<{ productSlug: string }>()
  const productSlug = params?.productSlug
  const product = productBySlug(productSlug)
  const [addedToBag, setAddedToBag] = useState(false)
  const { isSelected, isAtLimit, toggle } = useComparison()

  if (!product) notFound()

  const category = categoryBySlug(product.category)
  const compareEnabled = product.category === 'headphones'
  const selected = isSelected(product.id)
  const compareDisabled = compareEnabled && isAtLimit && !selected

  return (
    <section className="product-page container">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={14} />
        <Link href={`/category/${product.category}`}>{category?.name}</Link>
        <ChevronRight size={14} />
        <span>{product.name}</span>
      </nav>

      <div className="product-detail">
        <div className="product-detail__gallery">
          {product.badge && <span className="product-badge">{product.badge}</span>}
          <Image
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            fill
            priority
            sizes="(max-width: 680px) 100vw, 45vw"
          />
          <span>Selected product photography</span>
        </div>

        <div className="product-detail__info">
          <p className="eyebrow">{product.brand}</p>
          <h1>{product.name}</h1>
          <Rating rating={product.rating} count={product.reviewCount} />
          <p className="product-detail__description">{product.description}</p>

          <dl className="detail-highlights">
            {product.highlights.map((highlight) => (
              <div key={highlight.label}>
                <dt>{highlight.label}</dt>
                <dd>{highlight.value}</dd>
              </div>
            ))}
          </dl>

          {compareEnabled && product.specs && (
            <div className="detail-specs">
              <div className="detail-specs__heading">
                <h2>Useful details</h2>
                <span>Normalized for comparison</span>
              </div>
              {headphoneSpecs.slice(0, 6).map((definition) => (
                <div key={definition.key}>
                  <span>{definition.label}</span>
                  <strong>{product.specs?.[definition.key]?.display ?? 'Not provided'}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="purchase-panel">
          <div className="purchase-panel__price">
            <span>{money.format(product.price)}</span>
            {product.previousPrice && <del>{money.format(product.previousPrice)}</del>}
          </div>
          <p className="payment-note">or 4 interest-free payments at checkout</p>
          <div className="delivery-note">
            <Truck size={20} />
            <div>
              <strong>Free delivery</strong>
              <span>Arrives in 2–4 business days</span>
            </div>
          </div>
          <button
            className={`button button--primary button--full ${addedToBag ? 'is-complete' : ''}`}
            type="button"
            onClick={() => setAddedToBag(true)}
          >
            {addedToBag ? <Check size={18} /> : null}
            {addedToBag ? 'Added to bag' : 'Add to bag'}
          </button>
          {compareEnabled && (
            <button
              className={`button button--outline button--full ${selected ? 'is-selected' : ''}`}
              type="button"
              onClick={() => toggle(product.id)}
              disabled={compareDisabled}
              aria-pressed={selected}
            >
              {selected ? <CheckCircle2 size={18} /> : <Scale size={18} />}
              {selected ? 'Added to compare' : 'Add to compare'}
            </button>
          )}
          <div className="purchase-assurances">
            <span><PackageCheck size={17} /> 30-day returns</span>
            <span><ShieldCheck size={17} /> 2-year warranty</span>
          </div>
          <small>Prices and availability are shown for this product prototype.</small>
        </aside>
      </div>
    </section>
  )
}
