import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { departments } from '../data'

export function Footer() {
  return (
    <footer className="site-footer">
      <a href="#main-content" className="footer-back-top">Back to top</a>
      <div className="container footer-grid">
        <div className="footer-intro">
          <Link className="brand brand--footer" href="/">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
            </span>
            <span>Parallel</span>
          </Link>
          <p>Good finds. Clearer choices. Everyday essentials with useful context, without the marketplace noise.</p>
        </div>
        <div>
          <h2>Shop</h2>
          <div className="footer-links">
            {departments.map((category) => (
              <Link key={category.slug} href={`/category/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2>Parallel</h2>
          <div className="footer-links">
            <Link href="/compare">
              Compare products <ArrowUpRight size={14} />
            </Link>
            <Link href="/#about">How we choose</Link>
            <Link href="/account/help">Help & demo information</Link>
            <Link href="/account/privacy">Privacy notice</Link>
            <Link href="/account/terms">Terms of use</Link>
          </div>
        </div>
        <div><h2>Your shopping</h2><div className="footer-links"><Link href="/account">Your account</Link><Link href="/orders">Your orders</Link><Link href="/cart">Shopping cart</Link><Link href="/wishlist">Your wishlist</Link></div></div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Parallel</span>
        <span>Demo catalogue · sample prices, ratings and specifications · illustrative images.</span>
      </div>
    </footer>
  )
}
