import Link from 'next/link'
import { AlertCircle, LoaderCircle } from 'lucide-react'

export function ShoppingStatus({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <div className="shop-panel shopping-status" role="status"><LoaderCircle className="shopping-spinner" size={24} aria-hidden="true" /><h2>Loading your shopping details…</h2><p>Checking the latest items and prices.</p></div>
  if (error) return <div className="shop-panel shopping-status" role="alert"><AlertCircle size={28} aria-hidden="true" /><h2>We couldn’t load your shopping details</h2><p>{error}</p><div className="confirmation-actions"><button className="button shop-primary" onClick={retry} type="button">Try again</button><Link className="button button--outline" href="/account">Your account</Link></div></div>
  return null
}
