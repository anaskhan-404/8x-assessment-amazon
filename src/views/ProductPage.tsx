'use client'

import { CheckCircle2, ChevronRight, Heart, PackageCheck, Scale, ShoppingCart, Truck } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { notFound, useParams, useRouter } from 'next/navigation'
import { Rating } from '../components/Rating'
import { useComparison } from '../comparison-context'
import { canCompareProduct, categoryBySlug, categoryProducts, productBySlug } from '../data'
import { productSpecifications } from '../product-specifications'
import { ProductCollection } from '@/components/ProductCollection'
import { ProductGallery } from '@/components/shopping/ProductGallery'
import { QuantityControl } from '@/components/shopping/QuantityControl'
import { useShopping } from '@/shopping-context'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function ProductPage() {
  const params = useParams<{ productSlug: string }>()
  const productSlug = params?.productSlug
  const product = productBySlug(productSlug)
  const [quantity, setQuantity] = useState(1)
  const { addToCart, wishlist, toggleWishlist, busy } = useShopping()
  const router = useRouter()
  const { isSelected, limitReason, toggle } = useComparison()

  if (!product) notFound()

  const category = categoryBySlug(product.category)
  const compareEnabled = canCompareProduct(product)
  const specifications = productSpecifications(product)
  const selected = isSelected(product.id)
  const reason = !selected ? limitReason(product.id) : null
  const compareDisabled = Boolean(reason)

  return (
    <><section className="product-page container">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={14} />
        {category?.parentSlug && <><Link href={`/category/${category.parentSlug}`}>Electronics</Link><ChevronRight size={14} /></>}
        <Link href={`/category/${product.category}`}>{category?.name}</Link>
        <ChevronRight size={14} />
        <span>{product.name}</span>
      </nav>

      <div className="product-detail">
        <ProductGallery product={product} />

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

          {specifications.length > 0 && (
            <div className="detail-specs">
              <div className="detail-specs__heading">
                <h2>Useful details</h2>
                <span>{compareEnabled ? 'Normalized for comparison' : 'Product specifications'}</span>
              </div>
              {specifications.map((definition) => (
                <div key={definition.key}>
                  <span>{definition.label}</span>
                  <strong>{definition.value?.display ?? 'Not provided'}</strong>
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
          <p className="payment-note">USD · illustrative catalogue price</p>
          <div className="delivery-note">
            <Truck size={20} />
            <div>
              <strong>Delivery options</strong>
              <span>Rates and dates confirmed at checkout</span>
            </div>
          </div>
          <p className="product-availability"><PackageCheck size={16} aria-hidden="true" />Listed in our demo catalogue</p>
          <div className="purchase-quantity"><span>Quantity</span><QuantityControl name={product.name} quantity={quantity} onChange={setQuantity} /></div>
          <button className="button shop-primary button--full" type="button" disabled={busy} onClick={() => { void addToCart(product.id, quantity) }}><ShoppingCart size={18} aria-hidden="true" />{busy ? 'Please wait…' : 'Add to cart'}</button>
          <button className="button shop-buy button--full" type="button" disabled={busy} onClick={async () => { if (await addToCart(product.id, quantity)) router.push('/checkout') }}>Buy now</button>
          {compareEnabled && (
            <button
              className={`button button--outline button--full ${selected ? 'is-selected' : ''}`}
              type="button"
              onClick={() => toggle(product.id)}
              disabled={compareDisabled}
              aria-pressed={selected}
              title={reason ?? undefined}
            >
              {selected ? <CheckCircle2 size={18} /> : <Scale size={18} />}
              {selected ? 'Added to compare' : 'Add to compare'}
            </button>
          )}
          {compareEnabled && reason && <p className="comparison-limit-note">{reason}</p>}
          <button className="button button--outline button--full" type="button" disabled={busy} onClick={() => { void toggleWishlist(product.id) }} aria-pressed={wishlist.includes(product.id)}><Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} aria-hidden="true" />{wishlist.includes(product.id) ? 'Saved to wishlist' : 'Save to wishlist'}</button>
          <small>Assessment store. Stock and prices are verified before checkout. Payments use Stripe test mode.</small>
        </aside>
      </div>
    </section><ProductCollection eyebrow="More to discover" title={`More in ${category?.name.toLowerCase() ?? 'this category'}`} products={categoryProducts(product.category).filter((item) => item.id !== product.id).slice(0, 4)} href={`/category/${product.category}`} linkLabel="Browse category" /></>
  )
}
