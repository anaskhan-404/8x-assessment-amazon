import { canCompareProduct, productById } from './data'

export const MAX_COMPARISON_ITEMS = 20
export const MAX_COMPARISON_PER_CATEGORY = 4

export function comparisonLimitReason(current: readonly string[], id: string): string | null {
  const product = productById(id)
  if (!canCompareProduct(product)) return 'This product is no longer available for comparison.'
  if (current.includes(id)) return null
  if (current.length >= MAX_COMPARISON_ITEMS) return `Your tray holds up to ${MAX_COMPARISON_ITEMS} products. Remove one to add another.`
  if (current.filter((entry) => productById(entry)?.category === product!.category).length >= MAX_COMPARISON_PER_CATEGORY) {
    return `Choose up to ${MAX_COMPARISON_PER_CATEGORY} products per category. Remove one from this group to add another.`
  }
  return null
}

export function sanitizeComparisonIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const clean: string[] = []
  for (const id of value) {
    if (typeof id !== 'string' || clean.includes(id) || comparisonLimitReason(clean, id)) continue
    clean.push(id)
    if (clean.length === MAX_COMPARISON_ITEMS) break
  }
  return clean
}

export function parseComparisonIds(raw: string): string[] {
  try { return sanitizeComparisonIds(JSON.parse(raw)) } catch { return [] }
}

export function addComparisonId(current: string[], id: string): string[] {
  const clean = sanitizeComparisonIds(current)
  if (clean.includes(id) || comparisonLimitReason(clean, id)) return clean
  return [...clean, id]
}
