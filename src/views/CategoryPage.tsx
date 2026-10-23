'use client'

import { ArrowRight, Headphones, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import { ProductCard } from '../components/ProductCard'
import { categoryBySlug, categoryProducts } from '../data'
import type { Product } from '../types'

type SortOption = 'featured' | 'price-low' | 'rating'
type HeadphoneFilter = 'all' | 'under-350' | 'battery-40' | 'adaptive-anc'

export function CategoryPage() {
  const params = useParams<{ categorySlug: string }>()
  const categorySlug = params?.categorySlug
  const category = categoryBySlug(categorySlug)
  const searchParams = useSearchParams()
  const [sort, setSort] = useState<SortOption>('featured')
  const [filter, setFilter] = useState<HeadphoneFilter>('all')

  const visibleProducts = useMemo(() => {
    if (!category) return []
    const query = searchParams?.get('q')?.toLowerCase().trim()
    let result = categoryProducts(category.slug)

    if (query) {
      result = result.filter((product) =>
        `${product.brand} ${product.name} ${product.description}`.toLowerCase().includes(query),
      )
    }

    if (category.slug === 'headphones') {
      result = result.filter((product) => matchesHeadphoneFilter(product, filter))
    }

    return [...result].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'rating') return b.rating - a.rating
      return 0
    })
  }, [category, filter, searchParams, sort])

  if (!category) notFound()

  const isHeadphones = category.slug === 'headphones'

  return (
    <>
      <section className="category-hero">
        <div className="container category-hero__inner">
          <div className="category-hero__copy">
            <p className="breadcrumb"><Link href="/">Home</Link> / {category.name}</p>
            <p className="eyebrow">{category.eyebrow}</p>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
            {isHeadphones && (
              <div className="compare-callout">
                <span><SlidersHorizontal size={20} /></span>
                <div>
                  <strong>Make the differences clear</strong>
                  <p>Select up to four headphones, then compare the specifications side by side.</p>
                </div>
                <Link href="/compare">Open comparison <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
          <div className="category-hero__image">
            <Image
              src={category.image}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              style={{ objectPosition: category.imagePosition }}
            />
            <span>{visibleProducts.length} considered products</span>
          </div>
        </div>
      </section>

      <section className="section container catalogue-section">
        <div className="catalogue-toolbar">
          <div>
            <h2>{isHeadphones ? 'Find your headphones' : `Explore ${category.name.toLowerCase()}`}</h2>
            <p>{visibleProducts.length} products</p>
          </div>
          <label className="sort-control">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="rating">Highest rated</option>
            </select>
          </label>
        </div>

        {isHeadphones && (
          <div className="filter-row" aria-label="Headphone filters">
            <span><Headphones size={17} /> Quick filters</span>
            {[
              ['all', 'All headphones'],
              ['under-350', 'Under $350'],
              ['battery-40', '40+ hour battery'],
              ['adaptive-anc', 'Adaptive ANC'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'active' : undefined}
                onClick={() => setFilter(value as HeadphoneFilter)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No products match this view</h2>
            <p>Try another filter or return to the full category.</p>
            <button className="button button--primary" type="button" onClick={() => setFilter('all')}>
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  )
}

function matchesHeadphoneFilter(product: Product, filter: HeadphoneFilter) {
  if (filter === 'under-350') return product.price < 350
  if (filter === 'battery-40') {
    const battery = product.specs?.battery?.comparable
    return typeof battery === 'number' && battery >= 40
  }
  if (filter === 'adaptive-anc') {
    return String(product.specs?.noiseCancellation?.comparable).includes('adaptive')
  }
  return true
}
