'use client'

import { CatalogueBrowser } from '../components/CatalogueBrowser'
import { useCatalogueQuery } from '../use-catalogue-query'

export function SearchPage() {
  const { query } = useCatalogueQuery()

  return (
    <section className="section container search-page">
      <div className="search-page__heading">
        <p className="eyebrow">Search</p>
        <h1>{query.q ? `Results for “${query.q}”` : 'Explore the marketplace'}</h1>
        <p>Find your everyday favourites by name, brand or the details that matter.</p>
      </div>
      <CatalogueBrowser />
    </section>
  )
}
