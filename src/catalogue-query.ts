import { categoryBySlug } from './data'
import type { CategorySlug, Product } from './types'

export const sortOptions = [
  ['relevance', 'Relevance'],
  ['price-low', 'Price: low to high'],
  ['price-high', 'Price: high to low'],
  ['rating', 'Highest rated'],
] as const

export const headphoneFilters = [
  ['under-350', 'Under $350'],
  ['battery-40', '40+ hour battery'],
  ['adaptive-anc', 'Adaptive ANC'],
] as const

export type SortOption = typeof sortOptions[number][0]
export type HeadphoneFilter = typeof headphoneFilters[number][0]
export interface CatalogueQuery {
  q: string
  brands: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort: SortOption
  features: HeadphoneFilter[]
}

function nonNegativeNumber(value: string | null) {
  if (!value?.trim()) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function parseCatalogueQuery(params: Pick<URLSearchParams, 'get' | 'getAll'>): CatalogueQuery {
  const sort = params.get('sort')
  const rating = nonNegativeNumber(params.get('rating'))
  return {
    q: params.get('q')?.trim() ?? '',
    brands: [...new Set(params.getAll('brand').map((brand) => brand.trim()).filter(Boolean))],
    minPrice: nonNegativeNumber(params.get('min')),
    maxPrice: nonNegativeNumber(params.get('max')),
    minRating: rating !== undefined && rating > 0 && rating <= 5 ? rating : undefined,
    sort: sortOptions.some(([value]) => value === sort) ? sort as SortOption : 'relevance',
    features: headphoneFilters.filter(([value]) => params.getAll('feature').includes(value)).map(([value]) => value),
  }
}

export function catalogueParams(query: CatalogueQuery) {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  query.brands.forEach((brand) => params.append('brand', brand))
  if (query.minPrice !== undefined) params.set('min', String(query.minPrice))
  if (query.maxPrice !== undefined) params.set('max', String(query.maxPrice))
  if (query.minRating !== undefined) params.set('rating', String(query.minRating))
  if (query.sort !== 'relevance') params.set('sort', query.sort)
  query.features.forEach((feature) => params.append('feature', feature))
  return params
}

export function catalogueHref(category: CategorySlug | undefined, query: CatalogueQuery) {
  const path = category ? `/category/${category}` : '/search'
  const params = catalogueParams(query).toString()
  return params ? `${path}?${params}` : path
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function searchScore(product: Product, query: string): number | null {
  if (!query) return 0
  const category = categoryBySlug(product.category)
  const fields = [
    { text: `${product.brand} ${product.name}`, weight: 12 },
    { text: product.name, weight: 10 },
    { text: product.brand, weight: 8 },
    { text: `${category?.name ?? ''} ${categoryBySlug(category?.parentSlug)?.name ?? ''}`, weight: 5 },
    { text: product.highlights.map(({ label, value }) => `${label} ${value}`).join(' '), weight: 3 },
    { text: Object.values(product.specs).map((spec) => spec?.display ?? '').join(' '), weight: 3 },
    { text: product.description, weight: 1 },
  ].map(({ text, weight }) => ({ text: normalize(text), weight }))
  const normalized = normalize(query)
  if (!normalized) return null
  const terms = normalized.split(/\s+/)
  let score = 0
  for (const term of terms) {
    const matches = fields.filter(({ text }) => text.includes(term) || text.replace(/\s/g, '').includes(term))
    if (!matches.length) return null
    score += Math.max(...matches.map(({ weight }) => weight))
  }
  for (const { text, weight } of fields) {
    if (text === normalized) score += weight * 5
    else if (text.includes(normalized)) score += weight * 2
  }
  return score
}

function matchesFeature(product: Product, feature: HeadphoneFilter) {
  if (product.category !== 'headphones') return false
  if (feature === 'under-350') return product.price < 350
  if (feature === 'battery-40') {
    const battery = product.specs.battery?.comparable
    return typeof battery === 'number' && battery >= 40
  }
  return String(product.specs.noiseCancellation?.comparable).includes('adaptive')
}

// Brand selections are ORed; all other constraints and search terms are ANDed.
// Keep catalogue order as a stable tie-breaker without mutating the source array.
export function queryProducts(source: readonly Product[], query: CatalogueQuery, category?: CategorySlug): Product[] {
  return source.flatMap((product, index) => {
    if (category && product.category !== category && categoryBySlug(product.category)?.parentSlug !== category) return []
    if (query.brands.length && !query.brands.some((brand) => normalize(brand) === normalize(product.brand))) return []
    if (query.minPrice !== undefined && product.price < query.minPrice) return []
    if (query.maxPrice !== undefined && product.price > query.maxPrice) return []
    if (query.minRating !== undefined && product.rating < query.minRating) return []
    if (!query.features.every((feature) => matchesFeature(product, feature))) return []
    const score = searchScore(product, query.q)
    return score === null ? [] : [{ product, score, index }]
  }).sort((a, b) => {
    let difference = b.score - a.score
    if (query.sort === 'price-low') difference = a.product.price - b.product.price
    if (query.sort === 'price-high') difference = b.product.price - a.product.price
    if (query.sort === 'rating') difference = b.product.rating - a.product.rating
    return difference || a.index - b.index
  }).map(({ product }) => product)
}
