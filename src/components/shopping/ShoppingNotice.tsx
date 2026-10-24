'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useShopping } from '@/shopping-context'

export function ShoppingNotice() {
  const { message, dismissMessage, noticeError, needsSignIn } = useShopping()
  useEffect(() => {
    if (!message || noticeError) return
    const timer = setTimeout(dismissMessage, 5000)
    return () => clearTimeout(timer)
  }, [message, dismissMessage, noticeError])
  return <div className="shopping-notice-region" aria-live="polite" aria-atomic="true">
    {message && <div className={`shopping-notice ${noticeError ? 'shopping-notice--error' : ''}`}>{noticeError ? <AlertCircle size={19} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />}<p>{message}</p><Link href={needsSignIn ? '/account' : '/cart'}>{needsSignIn ? 'Sign in' : 'View cart'}</Link><button type="button" aria-label="Dismiss shopping notice" onClick={dismissMessage}><X size={18} aria-hidden="true" /></button></div>}
  </div>
}
