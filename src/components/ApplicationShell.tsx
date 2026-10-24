'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { CompareTray } from '@/components/CompareTray'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Toast } from '@/components/Toast'
import { ShoppingNotice } from '@/components/shopping/ShoppingNotice'

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAccount = pathname === '/account' || pathname.startsWith('/account/')

  return (
    <div className={isAccount ? 'account-shell' : 'site-shell'}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {!isAccount && <Suspense fallback={<div className="header-placeholder" aria-label="Loading navigation" />}><Header /></Suspense>}
      <main id="main-content" tabIndex={-1}>{children}</main>
      {!isAccount && <><Footer /><CompareTray /><Toast /><ShoppingNotice /></>}
    </div>
  )
}
