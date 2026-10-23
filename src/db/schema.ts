import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const productsTable = pgTable('products', {
  id: varchar('id', { length: 120 }).primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  category: varchar('category', { length: 80 }).notNull(),
  brand: varchar('brand', { length: 120 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  previousPrice: numeric('previous_price', { precision: 10, scale: 2 }),
  ratingTenths: integer('rating_tenths').notNull(),
  reviewCount: integer('review_count').notNull().default(0),
  image: text('image').notNull(),
  badge: varchar('badge', { length: 80 }),
  highlights: jsonb('highlights').notNull(),
  specs: jsonb('specs'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ProductRow = typeof productsTable.$inferSelect
export type NewProductRow = typeof productsTable.$inferInsert
