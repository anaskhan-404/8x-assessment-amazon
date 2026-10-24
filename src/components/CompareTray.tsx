'use client'

import { ArrowRight, ChevronDown, ChevronUp, Scale, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MAX_COMPARISON_ITEMS, useComparison } from '../comparison-context'
import { ComparisonSelectionItem } from './ComparisonSelectionItem'

const subscribeLayout = (listener: () => void) => {
  const query = window.matchMedia('(min-width: 800px)')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
const wideLayout = () => window.matchMedia('(min-width: 800px)').matches
const serverLayout = () => false

export function CompareTray() {
  const pathname = usePathname()
  const { selectedProducts, groups, remove, clear, clearGroup } = useComparison()
  const desktop = useSyncExternalStore(subscribeLayout, wideLayout, serverLayout)
  const [expansion, setExpansion] = useState<{ path: string; open: boolean } | null>(null)
  const expanded = expansion?.path === pathname ? expansion.open : desktop
  const trayRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const visible = selectedProducts.length > 0 && pathname !== '/compare'

  useEffect(() => {
    const tray = trayRef.current
    if (!visible || !tray) return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--comparison-tray-height', `${tray.getBoundingClientRect().height + 24}px`)
    })
    observer.observe(tray)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--comparison-tray-height')
    }
  }, [visible])

  if (!visible) return null

  return (
    <aside ref={trayRef} className={`global-compare-tray ${expanded ? 'is-expanded' : ''}`} aria-label="Selected products for comparison" onKeyDown={(event) => {
      if (event.key === 'Escape' && expanded) {
        setExpansion({ path: pathname, open: false })
        toggleRef.current?.focus()
      }
    }}>
      <div className="global-compare-tray__bar">
        <button ref={toggleRef} className="global-compare-tray__toggle" type="button" aria-expanded={expanded} aria-controls="global-tray-selections" onClick={() => setExpansion({ path: pathname, open: !expanded })}>
          <Scale size={21} aria-hidden="true" />
          <span><strong>{selectedProducts.length} of {MAX_COMPARISON_ITEMS} selected</strong><small>{groups.length === 1 ? groups[0].name : `${groups.length} category groups`}</small></span>
          {expanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
          <span className="sr-only">{expanded ? 'Collapse tray' : 'Expand tray'}</span>
        </button>
        <Link className="button button--primary" href="/compare">View all <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>

      <div id="global-tray-selections" hidden={!expanded}>
        <div className="global-compare-tray__scroll" tabIndex={0} role="region" aria-label="Comparison selections">
          {groups.length === 1 ? (
            <div className="global-compare-tray__single">
              {selectedProducts.map((product) => <ComparisonSelectionItem key={product.id} product={product} onRemove={remove} />)}
            </div>
          ) : (
            <div className="global-compare-tray__groups">
              {groups.map((group) => (
                <section className="tray-category-group" key={group.category} aria-label={`${group.name}, ${group.products.length} products`}>
                  <div className="tray-category-group__heading"><h2>{group.name} <span>({group.products.length})</span></h2><button className="text-button" type="button" onClick={() => clearGroup(group.category)} aria-label={`Clear ${group.name}`}>Clear</button></div>
                  {group.products.map((product) => <ComparisonSelectionItem key={product.id} product={product} onRemove={remove} />)}
                  <Link className="text-link" href={`/compare?category=${group.category}`}>{group.products.length > 1 ? `Compare ${group.name.toLowerCase()}` : 'View group · add another'}<ArrowRight size={15} aria-hidden="true" /></Link>
                </section>
              ))}
            </div>
          )}
        </div>
        <div className="global-compare-tray__footer">
          <button className="text-button" type="button" onClick={clear}><Trash2 size={15} aria-hidden="true" /> Clear all</button>
          {groups.length === 1 ? <Link className="text-link" href={`/compare?category=${groups[0].category}`}>{selectedProducts.length > 1 ? `Compare ${groups[0].name.toLowerCase()}` : 'View group · add another'}<ArrowRight size={15} aria-hidden="true" /></Link> : <span>Up to 4 per category</span>}
        </div>
      </div>
    </aside>
  )
}