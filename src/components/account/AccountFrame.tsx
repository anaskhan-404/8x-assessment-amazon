import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="account-page">
      <header className="account-brand-area">
        <Link href="/?browse=1" prefetch={false} className="account-brand" aria-label="Parallel storefront">
          <span className="account-brand-mark" aria-hidden="true"><i /><i /></span>
          <span>Parallel<span className="account-brand-dot">.</span></span>
        </Link>
        <p>Good finds. Clearer choices.</p>
      </header>
      <div className="account-content">{children}</div>
      <Link className="account-guest" href="/?browse=1" prefetch={false}>Explore the marketplace <ArrowRight size={15} aria-hidden="true" /></Link>
      <footer className="account-footer">
        <nav aria-label="Account information">
          <Link href="/account/terms">Terms of use</Link>
          <Link href="/account/privacy">Privacy notice</Link>
          <Link href="/account/help">Help</Link>
        </nav>
        <p>© 2026 Parallel. An assessment demo.</p>
      </footer>
    </div>
  )
}
