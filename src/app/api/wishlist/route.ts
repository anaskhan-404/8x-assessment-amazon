import { and, desc, eq } from 'drizzle-orm'
import { getDatabase } from '@/db'
import { productsTable, wishlistItems } from '@/db/schema'
import { requireUser } from '@/server/auth'
import { ServiceError } from '@/server/errors'
import { body, checkOrigin, endpoint, json } from '@/server/http'
import { productMutationSchema } from '@/server/validation'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return endpoint(async () => {
  const user = await requireUser(request.headers)
  const items = await getDatabase().select({ productId: productsTable.id, name: productsTable.name, slug: productsTable.slug,
    image: productsTable.image, price: productsTable.price, available: productsTable.active }).from(wishlistItems)
    .innerJoin(productsTable, eq(productsTable.id, wishlistItems.productId)).where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.createdAt))
  return json({ items })
}) }
export function POST(request: Request) { return endpoint(async () => {
  checkOrigin(request)
  const user = await requireUser(request.headers)
  const { productId } = productMutationSchema.parse(await body(request))
  const db = getDatabase()
  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.active, true)))
  if (!product) throw new ServiceError(404, 'Product is unavailable.')
  await db.insert(wishlistItems).values({ userId: user.id, productId }).onConflictDoNothing()
  return json({ saved: true })
}) }
export function DELETE(request: Request) { return endpoint(async () => {
  checkOrigin(request)
  const user = await requireUser(request.headers)
  const { productId } = productMutationSchema.parse(await body(request))
  await getDatabase().delete(wishlistItems).where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, productId)))
  return json({ saved: false })
}) }
