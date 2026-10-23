'use client'

import { Menu, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { categories } from '../data'
import { useComparison } from '../comparison-context'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const { selectedIds } = useComparison()

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
      setMenuOpen(false)
    }
  }

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <span>Independent product guidance, built for clearer decisions.</span>
          <span className="utility-bar__right">Free delivery over $75</span>
        </div>
      </div>

      <div className="container header-main">
        <Link className="brand" href="/" aria-label="Parallel home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>Parallel</span>
        </Link>

        <form className="header-search" role="search" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="site-search">
            Search products
          </label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products and brands"
          />
          <button type="submit">Search</button>
        </form>

        <div className="header-actions">
          <Link className="header-action" href="/compare" aria-label="Open comparison">
            <SlidersHorizontal size={20} />
            <span>Compare</span>
            {selectedIds.length > 0 && (
              <b className="count-badge">{selectedIds.length}</b>
            )}
          </Link>
          <button className="header-action bag-button" type="button" aria-label="Shopping bag">
            <ShoppingBag size={20} />
            <span>Bag</span>
          </button>
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="category-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <nav
        id="category-navigation"
        className={`category-nav ${menuOpen ? 'category-nav--open' : ''}`}
        aria-label="Product categories"
      >
        <div className="container category-nav__inner">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              onClick={() => setMenuOpen(false)}
              className={pathname === `/category/${category.slug}` ? 'active' : undefined}
            >
              {category.name}
              {category.compareEnabled && <span>Compare</span>}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
