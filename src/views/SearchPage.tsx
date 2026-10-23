'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ProductCard } from '../components/ProductCard'
import { products } from '../data'

export function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams?.get('q')?.trim() ?? ''
  const normalized = query.toLowerCase()
  const results = products.filter((product) =>
    `${product.brand} ${product.name} ${product.description} ${product.category}`
      .toLowerCase()
      .includes(normalized),
  )

  return (
    <section className="section container search-page">
      <div className="search-page__heading">
        <p className="eyebrow">Search</p>
        <h1>{query ? `Results for “${query}”` : 'Search Parallel'}</h1>
        <p>{query ? `${results.length} products found` : 'Use the search field above to explore the catalogue.'}</p>
      </div>

      {results.length > 0 ? (
        <div className="product-grid">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon"><Search /></span>
          <h2>No matching technology yet</h2>
          <p>Try a product type such as headphones, keyboards, monitors or mice.</p>
          <Link className="button button--primary" href="/">
            Browse the store
          </Link>
        </div>
      )}
    </section>
  )
}
