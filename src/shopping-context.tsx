'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { productById } from './data'

export type CartResponse = { items: Array<{ productId: string; name: string; slug: string; image: string; quantity: number; unitPriceCents: number; available: boolean }>; totalCents: number; currency: string }
export type WishlistItem = { productId: string; name: string; slug: string; image: string; price: string; available: boolean }
class ShoppingError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const result = await response.json()
  if (!response.ok) throw new ShoppingError(result.error || 'The shop is temporarily unavailable. Please try again.', response.status)
  return result as T
}

function useShoppingValue() {
  const pathname = usePathname()
  const [cartData, setCartData] = useState<CartResponse | null>(null)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [wishlistError, setWishlistError] = useState('')
  const [message, setMessage] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const version = useRef(0)
  const mutation = useRef(false)
  const mergedUser = useRef<string | null>(null)

  const refresh = useCallback(async (background = false) => {
    if (mutation.current) return
    const current = ++version.current
    if (!background) setLoading(true)
    setLoadError('')
    setWishlistError('')
    try {
      const session = await request<{ user?: { id: string } } | null>('/api/auth/get-session')
      if (current !== version.current) return
      setSignedIn(Boolean(session?.user))
      const cart = session?.user && mergedUser.current !== session.user.id
        ? await request<CartResponse>('/api/cart/merge', 'POST')
        : await request<CartResponse>('/api/cart')
      if (current !== version.current) return
      mergedUser.current = session?.user?.id ?? null
      setCartData(cart)
      if (session?.user) {
        try {
          const list = await request<{ items: WishlistItem[] }>('/api/wishlist')
          if (current === version.current) setWishlistItems(list.items)
        } catch { if (current === version.current) setWishlistError('Your wishlist could not be loaded. Please try again.') }
      } else setWishlistItems([])
    } catch (error) {
      if (current === version.current) setLoadError(error instanceof Error ? error.message : 'Your cart could not be loaded. Please try again.')
    } finally { if (current === version.current) setLoading(false) }
  }, [])

  const invalidate = useCallback(() => { ++version.current }, [])
  useEffect(() => {
    if (pathname === '/account' || pathname.startsWith('/account/')) return
    const timer = window.setTimeout(() => { void refresh() }, 0)
    const onFocus = () => { void refresh(true) }
    window.addEventListener('focus', onFocus)
    return () => { window.clearTimeout(timer); invalidate(); window.removeEventListener('focus', onFocus) }
  }, [pathname, refresh, invalidate])

  async function mutate(operation: () => Promise<void>, success: string) {
    if (mutation.current) return false
    mutation.current = true
    ++version.current
    setLoading(false)
    setBusy(true)
    setMessage('')
    setNeedsSignIn(false)
    try {
      await operation()
      setLoadError('')
      setNoticeError(false)
      setMessage(success)
      return true
    } catch (error) {
      setNoticeError(true)
      setNeedsSignIn(error instanceof ShoppingError && error.status === 401)
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      return false
    } finally { mutation.current = false; setBusy(false) }
  }
  const addToCart = (productId: string, quantity = 1) => mutate(async () => {
    setCartData(await request<CartResponse>('/api/cart', 'POST', { productId, quantity }))
  }, (productById(productId)?.name ?? 'Item') + ' added to your cart.')
  const setQuantity = (productId: string, quantity: number) => mutate(async () => {
    setCartData(await request<CartResponse>('/api/cart', 'PATCH', { productId, quantity }))
  }, 'Cart quantity updated.')
  const removeFromCart = (productId: string) => mutate(async () => {
    setCartData(await request<CartResponse>('/api/cart', 'DELETE', { productId }))
  }, 'Item removed from your cart.')
  const toggleWishlist = (productId: string) => {
    const saved = wishlistItems.some((item) => item.productId === productId)
    return mutate(async () => {
      await request('/api/wishlist', saved ? 'DELETE' : 'POST', { productId })
      const list = await request<{ items: WishlistItem[] }>('/api/wishlist')
      setWishlistItems(list.items)
    }, saved ? 'Removed from your wishlist.' : 'Saved to your wishlist.')
  }
  const saveForLater = (productId: string) => mutate(async () => {
    // Only remove the cart line after the wishlist write succeeds.
    await request('/api/wishlist', 'POST', { productId })
    setWishlistItems((await request<{ items: WishlistItem[] }>('/api/wishlist')).items)
    setCartData(await request<CartResponse>('/api/cart', 'DELETE', { productId }))
  }, 'Moved to your wishlist.')
  const checkout = async () => {
    const result = await request<{ url: string }>('/api/checkout', 'POST')
    const url = new URL(result.url)
    if (url.protocol !== 'https:') throw new Error('Checkout returned an invalid payment destination.')
    return url.href
  }
  const dismissMessage = useCallback(() => setMessage(''), [])
  const lines = (cartData?.items ?? []).map((item) => ({ ...item, product: productById(item.productId), lineTotalCents: item.unitPriceCents * item.quantity }))
  return { lines, count: lines.reduce((sum, item) => sum + item.quantity, 0), subtotalCents: cartData?.totalCents ?? 0,
    wishlist: wishlistItems.map((item) => item.productId), wishlistItems, signedIn, loading, busy, loadError, wishlistError,
    addToCart, setQuantity, removeFromCart, toggleWishlist, saveForLater, checkout, refresh, message, noticeError, needsSignIn, dismissMessage }
}
const ShoppingContext = createContext<ReturnType<typeof useShoppingValue> | null>(null)
export function ShoppingProvider({ children }: { children: ReactNode }) {
  const value = useShoppingValue()
  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}
export function useShopping() {
  const value = useContext(ShoppingContext)
  if (!value) throw new Error('useShopping must be used within ShoppingProvider')
  return value
}

