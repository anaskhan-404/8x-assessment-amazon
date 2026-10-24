'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, ArrowLeft, CreditCard, LoaderCircle, MapPin } from 'lucide-react'
import { OrderSummary } from '@/components/shopping/OrderSummary'
import { ShoppingEmpty } from '@/components/shopping/ShoppingEmpty'
import { ShoppingStatus } from '@/components/shopping/ShoppingStatus'
import { useShopping } from '@/shopping-context'

export function CheckoutPage() {
  const { lines, signedIn, loading, loadError, refresh, checkout } = useShopping()
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState('')
  async function pay() {
    if (pending) return
    setPending(true)
    setFailure('')
    try { window.location.assign(await checkout()) }
    catch (error) { setFailure(error instanceof Error ? error.message : 'Checkout could not be opened. Your cart is unchanged. Please try again.'); setPending(false) }
  }
  return <section className="container shopping-page checkout-page"><Link className="text-link checkout-back" href="/cart"><ArrowLeft size={16} aria-hidden="true" />Back to cart</Link><div className="shopping-heading"><div><p className="eyebrow">One more look</p><h1>Review your order</h1></div></div>
    <ol className="checkout-steps" aria-label="Checkout progress"><li><span>1</span>Cart</li><li className="is-current" aria-current="step"><span>2</span>Review</li><li><span>3</span>Payment</li></ol>
    <p className="preview-banner"><AlertCircle size={19} aria-hidden="true" /><span><strong>Assessment checkout.</strong> Stripe runs in test mode. No real payment is taken. Your order is confirmed only after the store verifies the payment result.</span></p>
    {loading || loadError ? <ShoppingStatus loading={loading} error={loadError} retry={refresh} /> : !lines.length ? <ShoppingEmpty /> : <div className="shopping-layout"><div className="checkout-review">
      <section className="shop-panel"><h2><MapPin size={20} aria-hidden="true" />Delivery details</h2><p>Enter your shipping and billing addresses on the Stripe checkout page. Delivery is supported in the United States, Canada, United Kingdom and Pakistan.</p><p>Free shipping and no additional tax apply to this assessment checkout.</p></section>
      <section className="shop-panel"><h2><CreditCard size={20} aria-hidden="true" />Payment</h2><p>Continue to Stripe to review the final amount and use a test payment method. Card details are collected by Stripe.</p>{!signedIn && <p><Link className="text-link" href="/account">Sign in to continue to payment</Link></p>}</section>
    </div><OrderSummary showItems><button className="button shop-primary button--full" disabled={!signedIn || pending || lines.some((item) => !item.available)} onClick={pay} type="button">{pending ? <><LoaderCircle size={17} className="shopping-spinner" aria-hidden="true" />Opening checkout…</> : signedIn ? 'Continue to Stripe test checkout' : 'Sign in required'}</button>{lines.some((item) => !item.available) && <p className="checkout-error">Remove unavailable items before checkout.</p>}{failure && <p className="checkout-error" role="alert">{failure}</p>}<Link href="/cart" className="summary-shopping-link">Edit cart</Link></OrderSummary></div>}
  </section>
}

