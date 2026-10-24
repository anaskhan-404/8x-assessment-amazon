import { sql } from 'drizzle-orm'
import { categories, products } from '../data'
import { categoriesTable, productsTable } from './schema'
import type { Database } from './index'

// The existing curated catalogue is the only authoring source. No second product model.
export async function seedCatalogue(db: Database) {
  if (new Set(products.map((p) => p.id)).size !== products.length) throw new Error('Duplicate catalogue IDs')
  await db.transaction(async (tx) => {
    for (const category of categories) {
      const row = { slug: category.slug, name: category.name, description: category.description, parentSlug: category.parentSlug ?? null }
      await tx.insert(categoriesTable).values(row).onConflictDoUpdate({ target: categoriesTable.slug, set: row })
    }
    // Preserve references from historical orders, while retiring removed products.
    await tx.update(productsTable).set({ active: false })
    for (const product of products) {
      const row = { id: product.id, slug: product.slug, category: product.category, brand: product.brand,
        name: product.name, description: product.description, price: product.price.toFixed(2),
        previousPrice: product.previousPrice?.toFixed(2) ?? null, ratingTenths: Math.round(product.rating * 10),
        reviewCount: product.reviewCount, image: product.image, badge: product.badge ?? null,
        highlights: product.highlights, specs: product.specs, active: true }
      await tx.insert(productsTable).values(row).onConflictDoUpdate({ target: productsTable.id, set: { ...row, updatedAt: sql`now()` } })
    }
  })
  return { categories: categories.length, products: products.length }
}
