'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { catalogueHref, parseCatalogueQuery, type CatalogueQuery } from './catalogue-query'
import { categoryBySlug } from './data'
import type { CategorySlug } from './types'

export function useCatalogueQuery() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = categoryBySlug(pathname.split('/category/')[1])
  const isCatalogue = pathname === '/search' || Boolean(category)
  const query = parseCatalogueQuery(isCatalogue ? searchParams : new URLSearchParams())

  function update(patch: Partial<CatalogueQuery>, targetCategory: CategorySlug | null | undefined = category?.slug) {
    // Read the latest URL at the mutation boundary so rapid changes cannot lose
    // a preceding selection that React has not rendered yet.
    const current = parseCatalogueQuery(isCatalogue ? new URLSearchParams(window.location.search) : new URLSearchParams())
    const href = catalogueHref(targetCategory ?? undefined, { ...current, ...patch })
    if (href.split('?')[0] === pathname) {
      if (href !== window.location.pathname + window.location.search) window.history.pushState(null, '', href)
    } else {
      router.push(href, { scroll: false })
    }
  }

  return { query, category, update, categoryHref: (slug?: CategorySlug) => catalogueHref(slug, query) }
}
