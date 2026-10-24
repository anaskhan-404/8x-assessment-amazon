import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '../types'
import { ProductCard } from './ProductCard'

export function ProductCollection({ id, eyebrow, title, description, products, href, linkLabel }: {
  id?: string
  eyebrow: string
  title: string
  description?: string
  products: Product[]
  href: string
  linkLabel: string
}) {
  return (
    <section className="section container product-collection" id={id}>
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description && <p className="section-description">{description}</p>}
        </div>
        <Link className="text-link" href={href}>{linkLabel}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className={`product-grid ${products.length >= 4 ? 'product-grid--four' : ''}`}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  )
}
