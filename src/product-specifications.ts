import type { Product } from './types'
import { getSpec } from './data'
import { comparisonSpecs } from './comparison-engine'

export function productSpecifications(product: Product) {
  return comparisonSpecs(product.category).map(({ key, label }) => ({
    key,
    label,
    value: getSpec(product, key),
  }))
}