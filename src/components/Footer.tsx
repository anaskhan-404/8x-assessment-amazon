import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { categories } from '../data'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-intro">
          <Link className="brand brand--footer" href="/">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
            </span>
            <span>Parallel</span>
          </Link>
          <p>Better tech, side by side. Useful context without the marketplace noise.</p>
        </div>
        <div>
          <h2>Shop</h2>
          <div className="footer-links">
            {categories.map((category) => (
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
            <a href="#about">How we choose</a>
            <a href="mailto:hello@parallel.example">Contact</a>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Parallel</span>
        <span>Prototype catalogue — prices shown for demonstration.</span>
      </div>
    </footer>
  )
}
