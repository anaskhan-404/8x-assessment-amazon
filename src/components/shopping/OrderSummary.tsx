'use client'

import { Info } from 'lucide-react'
import { formatMoney } from '@/commerce'
import { useShopping } from '@/shopping-context'

export function OrderSummary({ children, showItems = false }: { children?: React.ReactNode; showItems?: boolean }) {
  const { lines, count, subtotalCents } = useShopping()
  return <aside className="order-summary">
    <h2>Order summary</h2>
    {showItems && <ul className="summary-items">{lines.map(({ productId, name, quantity, lineTotalCents }) => <li key={productId}><span>{name}<small>Qty: {quantity}</small></span><strong>{formatMoney(lineTotalCents / 100)}</strong></li>)}</ul>}
    <dl><div><dt>Subtotal ({count} {count === 1 ? 'item' : 'items'})</dt><dd>{formatMoney(subtotalCents / 100)}</dd></div><div><dt>Delivery</dt><dd>Free</dd></div><div><dt>Additional tax</dt><dd>{formatMoney(0)}</dd></div><div className="summary-total"><dt>Total</dt><dd>{formatMoney(subtotalCents / 100)}</dd></div></dl>
    {children}
    <p className="shopping-disclaimer"><Info size={15} aria-hidden="true" /><span>Assessment checkout uses Stripe test mode. Prices and availability are checked by the store before payment.</span></p>
  </aside>
}
