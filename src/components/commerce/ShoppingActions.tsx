'use client'
import Link from 'next/link'
import { useState } from 'react'

export async function commerceRequest(path: string, method = 'GET', data?: unknown) {
  const response = await fetch(path, { method, headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined, cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Unable to complete this request.')
  return payload
}
export function ShoppingActions({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function act(wishlist: boolean) {
    setBusy(true); setError(''); setMessage('')
    try {
      await commerceRequest(wishlist ? '/api/wishlist' : '/api/cart', 'POST', { productId, ...(!wishlist ? { quantity: 1 } : {}) })
      setMessage(wishlist ? 'Saved to wishlist.' : 'Added to your bag.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  return <>
    <button className="button button--primary button--full" disabled={busy} onClick={() => act(false)}>{busy ? 'Please wait…' : 'Add to bag'}</button>
    <button className="button button--outline button--full" disabled={busy} onClick={() => act(true)}>Save to wishlist</button>
    {message && <p role="status">{message} <Link href="/cart">View bag</Link> · <Link href="/wishlist">Wishlist</Link></p>}
    {error && <p role="alert">{error}</p>}
  </>
}
