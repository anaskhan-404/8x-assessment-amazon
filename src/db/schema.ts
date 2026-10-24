import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { user } from './auth-schema'

export * from './auth-schema'

export const categoriesTable = pgTable('categories', {
  slug: varchar('slug', { length: 80 }).primaryKey(),
  name: text('name').notNull(), parentSlug: varchar('parent_slug', { length: 80 }),
  description: text('description').notNull(),
})

export const productsTable = pgTable('products', {
  id: varchar('id', { length: 120 }).primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  category: varchar('category', { length: 80 }).notNull().references(() => categoriesTable.slug),
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
}, (t) => [check('product_price_positive', sql`${t.price} > 0`), index('product_category_idx').on(t.category)])

export type ProductRow = typeof productsTable.$inferSelect
export type NewProductRow = typeof productsTable.$inferInsert

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // user:<auth ID> or guest:<SHA256 of a cryptographically random cookie>.
  ownerKey: text('owner_key').notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
export const cartItems = pgTable('cart_items', {
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 120 }).notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
}, (t) => [primaryKey({ columns: [t.cartId, t.productId] }), check('cart_quantity_range', sql`${t.quantity} BETWEEN 1 AND 99`)])

export type ShippingAddress = {
  name: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}
export const addresses = pgTable('customer_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  address: jsonb('address').$type<ShippingAddress>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('address_user_idx').on(t.userId)])

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id),
  cartId: uuid('cart_id').notNull().references(() => carts.id),
  cartVersion: integer('cart_version').notNull(),
  status: text('status', { enum: ['pending', 'paid', 'failed', 'expired'] }).notNull().default('pending'),
  paymentStatus: text('payment_status', { enum: ['unpaid', 'paid', 'failed'] }).notNull().default('unpaid'),
  currency: text('currency').notNull().default('usd'),
  totalCents: integer('total_cents').notNull(),
  customerEmail: text('customer_email').notNull(),
  stripeSessionId: text('stripe_session_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  shippingAddress: jsonb('shipping_address').$type<ShippingAddress>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('order_cart_version_unique').on(t.cartId, t.cartVersion), index('order_user_idx').on(t.userId, t.createdAt),
  check('order_total_positive', sql`${t.totalCents} > 0 AND ${t.totalCents} <= 99999999`),
  check('order_currency_usd', sql`${t.currency} = 'usd'`),
  check('order_status_valid', sql`${t.status} IN ('pending', 'paid', 'failed', 'expired')`),
  check('order_payment_valid', sql`${t.paymentStatus} IN ('unpaid', 'paid', 'failed')`),
])
export const orderItems = pgTable('order_items', {
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 120 }).notNull().references(() => productsTable.id),
  name: text('name').notNull(), unitPriceCents: integer('unit_price_cents').notNull(), quantity: integer('quantity').notNull(),
}, (t) => [primaryKey({ columns: [t.orderId, t.productId] }),
  check('order_item_quantity_valid', sql`${t.quantity} BETWEEN 1 AND 99`), check('order_item_price_valid', sql`${t.unitPriceCents} > 0`)])
export const paymentEvents = pgTable('payment_events', {
  id: text('id').primaryKey(), orderId: uuid('order_id').notNull().references(() => orders.id), type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})
export const wishlistItems = pgTable('wishlist_items', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 120 }).notNull().references(() => productsTable.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })])
