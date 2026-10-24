import { z } from 'zod'

export const productIdSchema = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/)
export const cartMutationSchema = z.object({ productId: productIdSchema, quantity: z.number().int().min(1).max(99) }).strict()
export const productMutationSchema = z.object({ productId: productIdSchema }).strict()
export const orderIdSchema = z.string().uuid()

// Database NUMERIC stays a string: convert decimal dollars to integer cents exactly.
export function priceToCents(price: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(price)) throw new Error('Invalid catalogue price')
  const [dollars, cents = ''] = price.split('.')
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99_999_999) throw new Error('Invalid catalogue price')
  return amount
}
export function totalCents(items: { unitPriceCents: number; quantity: number }[]) {
  const total = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  if (!Number.isSafeInteger(total) || total <= 0 || total > 99_999_999) throw new Error('Order total out of range')
  return total
}
