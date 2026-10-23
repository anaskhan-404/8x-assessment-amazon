'use client'

import { ArrowRight, ChevronUp, Scale, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useComparison } from '../comparison-context'

export function CompareTray() {
  const pathname = usePathname()
  const { selectedProducts, remove, clear } = useComparison()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const mobileOpen = openPath === pathname

  if (selectedProducts.length === 0 || pathname === '/compare') return null

  const canCompare = selectedProducts.length >= 2

  return (
    <>
      <aside className="compare-tray" aria-label="Selected products for comparison">
        <div className="compare-tray__heading">
          <span className="compare-tray__icon">
            <Scale size={19} />
          </span>
          <div>
            <strong>{selectedProducts.length} of 4 selected</strong>
            <span>{canCompare ? 'Ready to compare' : 'Add one more headphone'}</span>
          </div>
        </div>

        <div className="compare-tray__products">
          {selectedProducts.map((product) => (
            <div className="tray-product" key={product.id}>
              <Image src={product.image} alt="" width={86} height={86} />
              <span>
                <small>{product.brand}</small>
                <strong>{product.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.brand} ${product.name}`}
              >
                <X size={15} />
              </button>
            </div>
          ))}
          {Array.from({ length: 4 - selectedProducts.length }).map((_, index) => (
            <div className="tray-slot" key={index} aria-hidden="true">
              <span>{selectedProducts.length + index + 1}</span>
            </div>
          ))}
        </div>

        <div className="compare-tray__actions">
          <button className="text-button" type="button" onClick={clear}>
            Clear
          </button>
          {canCompare ? (
            <Link className="button button--primary" href="/compare">
              Compare now <ArrowRight size={18} />
            </Link>
          ) : (
            <button className="button button--primary" type="button" disabled>
              Compare now <ArrowRight size={18} />
            </button>
          )}
        </div>
      </aside>

      <aside className="mobile-compare-bar" aria-label="Selected products for comparison">
        <button
          className="mobile-compare-bar__summary"
          type="button"
          onClick={() => setOpenPath(pathname)}
          aria-expanded={mobileOpen}
        >
          <span className="thumbnail-stack">
            {selectedProducts.slice(0, 3).map((product) => (
              <Image key={product.id} src={product.image} alt="" width={70} height={70} />
            ))}
          </span>
          <span>
            <strong>{selectedProducts.length} selected</strong>
            <small>View selection</small>
          </span>
          <ChevronUp size={18} />
        </button>
        {canCompare ? (
          <Link className="button button--primary" href="/compare">
            Compare
          </Link>
        ) : (
          <button className="button button--primary" type="button" disabled>
            Compare
          </button>
        )}
      </aside>

      {mobileOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setOpenPath(null)}>
          <section
            className="compare-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-sheet-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="compare-sheet__header">
              <div>
                <p className="eyebrow">Your shortlist</p>
                <h2 id="compare-sheet-title">Compare headphones</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpenPath(null)}>
                <X />
                <span className="sr-only">Close selection</span>
              </button>
            </div>
            <div className="compare-sheet__list">
              {selectedProducts.map((product) => (
                <div className="sheet-product" key={product.id}>
                  <Image src={product.image} alt="" width={108} height={108} />
                  <div>
                    <small>{product.brand}</small>
                    <strong>{product.name}</strong>
                  </div>
                  <button type="button" onClick={() => remove(product.id)}>
                    <Trash2 size={18} />
                    <span className="sr-only">Remove {product.name}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="compare-sheet__footer">
              <button className="text-button" type="button" onClick={clear}>
                Clear all
              </button>
              {canCompare ? (
                <Link className="button button--primary" href="/compare" onClick={() => setOpenPath(null)}>
                  Compare {selectedProducts.length} products <ArrowRight size={18} />
                </Link>
              ) : (
                <span className="sheet-note">Add one more headphone</span>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
