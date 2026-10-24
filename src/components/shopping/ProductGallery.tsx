'use client'

import { useRef } from 'react'
import { Expand, X } from 'lucide-react'
import { CatalogueImage } from '@/components/CatalogueImage'
import type { Product } from '@/types'

export function ProductGallery({ product }: { product: Product }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <div className="product-gallery">
    <button type="button" className="product-gallery__main" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge image of ${product.name}`}>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <CatalogueImage src={product.image} alt={`${product.brand} ${product.name}`} fill priority sizes="(max-width: 680px) 100vw, 40vw" style={{ objectPosition: product.imagePosition }} />
      <span className="product-gallery__zoom"><Expand size={16} aria-hidden="true" />Click to enlarge</span>
    </button>
    <div className="product-gallery__caption"><span className="product-gallery__thumb"><CatalogueImage src={product.image} alt="" fill sizes="48px" /></span><p>Product view<small>1 image · illustrative catalogue photography</small></p></div>
    <dialog ref={dialog} className="product-zoom-dialog" aria-label={`${product.name} enlarged image`} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="product-zoom-dialog__header"><h2>{product.name}</h2><button type="button" aria-label="Close enlarged image" onClick={() => dialog.current?.close()} autoFocus><X size={22} aria-hidden="true" /></button></div>
      <div className="product-zoom-dialog__image"><CatalogueImage src={product.image} alt={`${product.brand} ${product.name}`} fill sizes="90vw" /></div>
    </dialog>
  </div>
}
