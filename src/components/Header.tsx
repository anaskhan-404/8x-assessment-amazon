'use client'

import { ArrowRight, Heart, Menu, Package, Search, ShoppingCart, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { departments } from '../data'
import { useComparison } from '../comparison-context'
import { useCatalogueQuery } from '../use-catalogue-query'
import { useShopping } from '../shopping-context'
import type { CategorySlug } from '../types'

type OpenPanel = 'categories' | null

export function Header() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const headerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { query, category: activeCategory, update, categoryHref } = useCatalogueQuery()
  const { selectedIds } = useComparison()
  const { count, loading, loadError } = useShopping()
  const menuOpen = openPanel === 'categories'

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-offset', `${header.getBoundingClientRect().height}px`)
    })
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--header-offset')
    }
  }, [])

  useEffect(() => {
    if (!openPanel) return
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenPanel(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [openPanel])

  const togglePanel = (panel: OpenPanel, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger
    setOpenPanel((current) => current === panel ? null : panel)
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    const department = String(new FormData(event.currentTarget).get('department') ?? '') as CategorySlug
    update({ q: trimmed }, department || null)
    setOpenPanel(null)
  }

  return (
    <header ref={headerRef} className="site-header" onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpenPanel(null)
    }}>
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <span>Good finds. Clearer choices.</span>
          <nav aria-label="Marketplace information">
            <Link href="/#deals" onClick={() => setOpenPanel(null)}>Discover deals</Link>
            <Link href="/wishlist" onClick={() => setOpenPanel(null)}><Heart size={12} aria-hidden="true" /> Saved favourites</Link>
            <span className="utility-bar__right">Demo marketplace · USD</span>
          </nav>
        </div>
      </div>

      <div className="container header-main">
        <Link className="brand" href="/" aria-label="Parallel home" onClick={() => setOpenPanel(null)}>
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>Parallel</span>
        </Link>

        <form className="header-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="search-department">Search department</label>
          <select id="search-department" name="department" key={activeCategory?.slug ?? 'all'} defaultValue={activeCategory?.slug ?? ''}>
            <option value="">All</option>
            {departments.map((department) => <option key={department.slug} value={department.slug}>{department.name}</option>)}
            {activeCategory?.parentSlug && <option value={activeCategory.slug}>{activeCategory.name}</option>}
          </select>
          <label className="sr-only" htmlFor="site-search">
            {activeCategory ? `Search in ${activeCategory.name}` : 'Search products'}
          </label>
          <input
            id="site-search"
            key={`${activeCategory?.slug ?? ''}:${query.q}`}
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder={activeCategory ? `Search in ${activeCategory.name.toLowerCase()}` : 'Search products, brands and everyday finds'}
          />
          <button type="submit" aria-label="Search products"><Search size={21} aria-hidden="true" /><span>Search</span></button>
        </form>

        <div className="header-actions">
          <Link className="header-action" href="/account" aria-label="Account" onClick={() => setOpenPanel(null)}><UserRound size={20} aria-hidden="true" /><span>Account</span></Link>
          <Link className="header-action header-orders" href="/orders" aria-label="Orders" onClick={() => setOpenPanel(null)}><Package size={20} aria-hidden="true" /><span>Orders</span></Link>
          <Link className="header-action" href="/compare" aria-label={`Open comparison${selectedIds.length ? `, ${selectedIds.length} products` : ''}`} onClick={() => setOpenPanel(null)}>
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>Compare</span>
            {selectedIds.length > 0 && <b className="count-badge">{selectedIds.length}</b>}
          </Link>
          <Link className="header-action bag-button" href="/cart" aria-label={loading ? 'Shopping cart, loading' : loadError ? 'Shopping cart, details unavailable' : `Shopping cart, ${count} items`} onClick={() => setOpenPanel(null)}><ShoppingCart size={22} aria-hidden="true" /><span>Cart</span><b className="cart-count">{loading ? '…' : loadError ? '–' : count}</b></Link>
          <button className="menu-toggle" type="button" onClick={(event) => togglePanel('categories', event.currentTarget)} aria-expanded={menuOpen} aria-controls="category-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

      </div>

      <nav id="category-navigation" className={`category-nav ${menuOpen ? 'category-nav--open' : ''}`} aria-label="Product categories">
        <div className="container category-nav__inner">
          <Link className={!activeCategory ? 'category-nav__all' : undefined} href={categoryHref()} onClick={() => setOpenPanel(null)}><Menu size={16} aria-hidden="true" /> All products</Link>
          {departments.map((category) => (
            <Link key={category.slug} href={categoryHref(category.slug)} onClick={() => setOpenPanel(null)} className={activeCategory?.slug === category.slug || activeCategory?.parentSlug === category.slug ? 'active' : undefined} aria-current={activeCategory?.slug === category.slug ? 'page' : undefined}>
              {category.name}
            </Link>
          ))}
          <Link className="category-nav__deals" href="/#deals" onClick={() => setOpenPanel(null)}>Deals & finds <ArrowRight size={14} aria-hidden="true" /></Link>
          <Link className="category-nav__saved" href="/wishlist" onClick={() => setOpenPanel(null)}><Heart size={15} aria-hidden="true" />Wishlist</Link>
        </div>
      </nav>
    </header>
  )
}
