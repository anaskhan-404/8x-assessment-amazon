'use client'

import { Headphones, Search, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { categories, categoryProducts, electronicsCategories, products } from '../data'
import { headphoneFilters, queryProducts, sortOptions } from '../catalogue-query'
import { useCatalogueQuery } from '../use-catalogue-query'
import { ProductCard } from './ProductCard'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const clearedFilters = { brands: [], minPrice: undefined, maxPrice: undefined, minRating: undefined, features: [] }

export function CatalogueBrowser() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { query, category, update, categoryHref } = useCatalogueQuery()
  const results = queryProducts(products, query, category?.slug)
  const scope = category ? categoryProducts(category.slug) : products
  const brands = [...new Set(scope.map((product) => product.brand))].sort((a, b) => a.localeCompare(b))
  const hasFilters = query.brands.length > 0 || query.minPrice !== undefined || query.maxPrice !== undefined || query.minRating !== undefined || query.features.length > 0
  const title = category?.slug === 'headphones' ? 'Find your headphones' : category ? `Explore ${category.name.toLowerCase()}` : 'Explore products'

  function applyPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const minPrice = String(values.get('min')).trim() ? Number(values.get('min')) : undefined
    const maxPrice = String(values.get('max')).trim() ? Number(values.get('max')) : undefined
    const maximum = form.elements.namedItem('max') as HTMLInputElement
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      maximum.setCustomValidity('Maximum price must be at least the minimum price.')
      maximum.reportValidity()
      return
    }
    update({ minPrice, maxPrice })
  }

  return (
    <div className="catalogue-browser">
      {(category?.slug === 'electronics' || category?.parentSlug === 'electronics') && (
        <nav className="subcategory-nav" aria-label="Electronics categories">
          <Link href={categoryHref('electronics')} aria-current={category.slug === 'electronics' ? 'page' : undefined}>All electronics</Link>
          {electronicsCategories.map((child) => <Link key={child.slug} href={categoryHref(child.slug)} aria-current={category.slug === child.slug ? 'page' : undefined}>{child.name}{child.compareEnabled && <small>Compare</small>}</Link>)}
        </nav>
      )}

      <div className="catalogue-toolbar">
        <div>
          <h2>{title}</h2>
          <p role="status" aria-live="polite" aria-atomic="true">{results.length} {results.length === 1 ? 'product' : 'products'}{query.q && <> matching “{query.q}”</>}</p>
        </div>
        <label className="sort-control">
          <span>Sort by</span>
          <select value={query.sort} onChange={(event) => update({ sort: event.target.value as typeof query.sort })}>
            {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="catalogue-filter-toggle button button--outline" type="button" aria-expanded={filtersOpen} aria-controls="catalogue-filter-controls" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} aria-hidden="true" />{filtersOpen ? 'Hide filters' : 'Filters'}</button>
      </div>

      <div id="catalogue-filter-controls" className={`catalogue-filters ${filtersOpen ? 'catalogue-filters--open' : ''}`} role="group" aria-label="Filter products">
        <h3 className="catalogue-filter-heading">Narrow your search</h3>
        <label className="catalogue-field">
          <span>Category</span>
          <select value={category?.slug ?? ''} onChange={(event) => {
            const selected = categories.find(({ slug }) => slug === event.target.value)
            update({}, selected?.slug ?? null)
          }}>
            <option value="">All categories</option>
            {categories.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.parentSlug ? `Electronics / ${entry.name}` : entry.name}</option>)}
          </select>
        </label>

        <form className="price-filter" key={`${query.minPrice}-${query.maxPrice}`} onSubmit={applyPrice} onInput={(event) => {
          const form = event.currentTarget
          ;(form.elements.namedItem('max') as HTMLInputElement).setCustomValidity('')
        }}>
          <fieldset>
            <legend>Price range (USD)</legend>
            <div className="price-filter__inputs">
              <label><span className="sr-only">Minimum price</span><input name="min" type="number" min="0" step="0.01" defaultValue={query.minPrice ?? ''} placeholder="Min" /></label>
              <span aria-hidden="true">–</span>
              <label><span className="sr-only">Maximum price</span><input name="max" type="number" min="0" step="0.01" defaultValue={query.maxPrice ?? ''} placeholder="Max" /></label>
              <button className="button button--small button--dark" type="submit">Apply</button>
            </div>
          </fieldset>
        </form>

        <label className="catalogue-field">
          <span>Brand</span>
          <select value="" onChange={(event) => { if (event.target.value) update({ brands: [...query.brands, event.target.value] }) }}>
            <option value="">{query.brands.length ? 'Add another brand' : 'All brands'}</option>
            {brands.filter((brand) => !query.brands.includes(brand)).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </label>

        <label className="catalogue-field">
          <span>Minimum rating</span>
          <select value={query.minRating ?? ''} onChange={(event) => update({ minRating: event.target.value ? Number(event.target.value) : undefined })}>
            <option value="">All ratings</option>
            {[4, 4.5, 4.8].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}
            {query.minRating !== undefined && ![4, 4.5, 4.8].includes(query.minRating) && <option value={query.minRating}>{query.minRating}+ stars</option>}
          </select>
        </label>
      </div>

      {(category?.slug === 'headphones' || query.features.length > 0) && (
        <div className="filter-row catalogue-quick-filters" role="group" aria-label="Headphone filters">
          <span><Headphones size={17} aria-hidden="true" /> Quick filters</span>
          {headphoneFilters.map(([value, label]) => (
            <button key={value} type="button" className={query.features.includes(value) ? 'active' : undefined} aria-pressed={query.features.includes(value)} onClick={() => update({ features: query.features.includes(value) ? query.features.filter((feature) => feature !== value) : [...query.features, value] })}>{label}</button>
          ))}
        </div>
      )}

      {(query.q || hasFilters || category) && (
        <div className="active-filters" role="group" aria-label="Active filters">
          <span>Active:</span>
          {category && <Link className="filter-chip" href={categoryHref()} aria-label={`Remove category: ${category.name}`}>{category.name}<X size={14} aria-hidden="true" /></Link>}
          {query.q && <FilterChip label={`Search: ${query.q}`} remove={() => update({ q: '' })} />}
          {query.brands.map((brand) => <FilterChip key={brand} label={`Brand: ${brand}`} remove={() => update({ brands: query.brands.filter((value) => value !== brand) })} />)}
          {query.minPrice !== undefined && <FilterChip label={`Min: ${money.format(query.minPrice)}`} remove={() => update({ minPrice: undefined })} />}
          {query.maxPrice !== undefined && <FilterChip label={`Max: ${money.format(query.maxPrice)}`} remove={() => update({ maxPrice: undefined })} />}
          {query.minRating !== undefined && <FilterChip label={`Rating: ${query.minRating}+`} remove={() => update({ minRating: undefined })} />}
          {headphoneFilters.filter(([value]) => query.features.includes(value)).map(([value, label]) => <FilterChip key={value} label={label} remove={() => update({ features: query.features.filter((feature) => feature !== value) })} />)}
          <button className="text-button" type="button" onClick={() => update({ ...clearedFilters, q: '' }, null)}>Clear all filters</button>
        </div>
      )}

      {results.length > 0 ? (
        <div className="product-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <div className="empty-state">
          <span className="empty-state__icon"><Search aria-hidden="true" /></span>
          <h2>No products match your search</h2>
          <p>Try a different name, brand or feature, or remove filters to broaden your results.</p>
          <button className="button button--primary" type="button" onClick={() => update({ ...clearedFilters, q: '' })}>Reset search and filters</button>
          {category && <Link className="text-button" href={categoryHref()}>Search all categories</Link>}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, remove }: { label: string; remove: () => void }) {
  return <button className="filter-chip" type="button" onClick={remove} aria-label={`Remove ${label}`}>{label}<X size={14} aria-hidden="true" /></button>
}
