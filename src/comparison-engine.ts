import { canCompareProduct, categoryBySlug, getSpec } from './data'
import { comparisonSchemas } from './comparison-schemas'
import type { Product, ProductCategory, SpecDefinition } from './types'

export interface ComparisonGroup {
  category: ProductCategory
  name: string
  products: Product[]
}

export function groupComparisonProducts(products: readonly Product[]): ComparisonGroup[] {
  const groups = new Map<ProductCategory, ComparisonGroup>()
  const seen = new Set<string>()
  for (const product of products) {
    if (!canCompareProduct(product) || seen.has(product.id)) continue
    seen.add(product.id)
    const group = groups.get(product.category) ?? { category: product.category, name: categoryBySlug(product.category)!.name, products: [] }
    group.products.push(product)
    groups.set(product.category, group)
  }
  return [...groups.values()]
}

export function compatibleProducts(products: readonly Product[], category: ProductCategory) {
  return groupComparisonProducts(products).find((group) => group.category === category)?.products ?? []
}

// Unit and measurement basis are part of a value's identity. Missing values
// remain visible in the differences view, but never become zero or a winner.
export function specIsDifferent(definition: SpecDefinition, products: readonly Product[]) {
  const values = products.map((product) => {
    const value = getSpec(product, definition.key)
    return value ? JSON.stringify([definition.compareDisplay ? value.display : value.comparable, value.unit ?? null, value.basis ?? null]) : 'missing'
  })
  return new Set(values).size > 1
}

export function bestProductFor(definition: SpecDefinition, products: readonly Product[]) {
  if ((!definition.higherIsBetter && !definition.lowerIsBetter) || products.length < 2) return null
  if (new Set(products.map((product) => product.category)).size !== 1) return null
  const values = products.map((product) => ({ id: product.id, spec: getSpec(product, definition.key) }))
  if (values.some(({ spec }) => !spec || typeof spec.comparable !== 'number' || !Number.isFinite(spec.comparable))) return null
  if (new Set(values.map(({ spec }) => JSON.stringify([spec!.unit ?? null, spec!.basis ?? null]))).size !== 1) return null
  const numbers = values.map(({ spec }) => spec!.comparable as number)
  const target = definition.lowerIsBetter ? Math.min(...numbers) : Math.max(...numbers)
  const winners = values.filter(({ spec }) => spec!.comparable === target)
  return winners.length === 1 ? winners[0].id : null
}

export function comparisonSpecs(category: ProductCategory): SpecDefinition[] {
  return comparisonSchemas[category]
}
