import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock3, PackageOpen } from 'lucide-react'
import { CatalogueImage } from '@/components/CatalogueImage'
import { productById } from '@/data'
import { formatMoney } from '@/commerce'
import type { ShippingAddress } from '@/db/schema'

type OrderEntry = { id: string; status: string; paymentStatus: string; totalCents: number; createdAt: Date }
type OrderItem = { productId: string; name: string; quantity: number; unitPriceCents: number }

export function OrdersPage({ orders }: { orders: OrderEntry[] }) {
  return <section className="container shopping-page"><div className="shopping-heading"><div><p className="eyebrow">Your account</p><h1>Your orders</h1><p>Your latest orders and their payment status.</p></div><Link className="text-link" href="/account/profile">Your account</Link></div>
    {orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id} className="shop-panel"><div className="order-meta"><h2>Order {order.id.slice(0, 8)}</h2><span className={order.paymentStatus === 'paid' ? 'order-status--paid' : 'order-status--pending'}>{order.paymentStatus === 'paid' ? 'Payment confirmed' : order.status === 'pending' ? 'Awaiting payment' : 'Checkout ' + order.status}</span></div><p>Placed {order.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p><div className="order-list-bottom"><strong>{formatMoney(order.totalCents / 100)}</strong><Link className="text-link" href={'/orders/' + order.id}>View order<ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div> : <div className="shopping-empty"><span><PackageOpen size={36} aria-hidden="true" /></span><h2>No orders yet</h2><p>Your orders will appear here after you check out.</p><Link className="button shop-primary" href="/search">Explore products</Link></div>}
  </section>
}

export function OrderDetailView({ order, items }: { order: OrderEntry & { shippingAddress?: ShippingAddress | null }; items: OrderItem[] }) {
  const paid = order.paymentStatus === 'paid'
  return <section className="container shopping-page order-detail-page"><div className="confirmation-intro">{paid ? <CheckCircle2 size={44} aria-hidden="true" /> : <Clock3 size={44} aria-hidden="true" />}<p className="eyebrow">Order {order.id.slice(0, 8)}</p><h1>{paid ? 'Thank you for your order' : order.status === 'pending' ? 'Awaiting payment confirmation' : 'Checkout ' + order.status}</h1><p role="status">{paid ? 'Your payment has been verified by the store. Your order details are below.' : order.status === 'pending' ? 'We are waiting for confirmation from the payment provider. Returning from checkout does not confirm payment. Refresh this page shortly.' : 'No payment has been confirmed for this checkout.'}</p>{!paid && order.status === 'pending' && <a className="button button--outline" href={'/orders/' + order.id}>Refresh order status</a>}</div>
    <div className="shopping-layout"><div className="cart-items">{items.map((item) => {
      const product = productById(item.productId)
      return <article key={item.productId} className="cart-item">{product && <Link className="cart-item__image" href={'/product/' + product.slug}><CatalogueImage src={product.image} alt={item.name} fill sizes="140px" /></Link>}<div className="cart-item__body"><h2 className="cart-item__title">{item.name}</h2><p>Quantity: {item.quantity}</p><p>{formatMoney(item.unitPriceCents / 100)} each</p></div><strong className="cart-item__total">{formatMoney(item.unitPriceCents * item.quantity / 100)}</strong></article>
    })}</div><aside className="order-summary"><h2>Order summary</h2><dl><div><dt>Order date</dt><dd>{order.createdAt.toLocaleDateString('en-US', { timeZone: 'UTC' })}</dd></div><div><dt>Payment</dt><dd>{paid ? 'Confirmed' : 'Not confirmed'}</dd></div><div className="summary-total"><dt>Total</dt><dd>{formatMoney(order.totalCents / 100)}</dd></div></dl>{order.shippingAddress && <div className="order-delivery"><h3>Delivery address</h3><p>{order.shippingAddress.name}<br />{order.shippingAddress.line1}<br />{order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}</p></div>}</aside></div>
    <div className="confirmation-actions"><Link className="button shop-primary" href="/search">Continue shopping</Link><Link className="button button--outline" href="/orders">All orders</Link></div>
  </section>
}

export function OrderConfirmationView({ preview = false }: { preview?: boolean }) {
  return <section className="container shopping-page confirmation-page"><div className="confirmation-intro"><PackageOpen size={44} aria-hidden="true" /><p className="eyebrow">{preview ? 'Layout preview · no order placed' : 'Order confirmation'}</p><h1>{preview ? 'A clearer view of your order' : 'Find your order confirmation'}</h1><p>{preview ? 'A completed checkout opens your protected order page with its verified payment status, items and total. This preview does not create an order or take a payment.' : 'Your confirmation is available in your order history. Payment status is verified by the store.'}</p></div><div className="confirmation-actions"><Link className="button shop-primary" href="/orders">View your orders</Link><Link className="button button--outline" href="/search">Continue shopping</Link></div></section>
}

