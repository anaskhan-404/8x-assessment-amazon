'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export function ShoppingRouteError({ reset }: { reset: () => void }) {
  return <section className="container shopping-page"><div className="shopping-empty" role="alert"><AlertCircle size={36} aria-hidden="true" /><h1>Shopping details are unavailable</h1><p>We couldn’t connect to your account or order service. Please try again in a moment.</p><div className="confirmation-actions"><button className="button shop-primary" type="button" onClick={reset}>Try again</button><Link className="button button--outline" href="/search">Continue browsing</Link></div></div></section>
}
