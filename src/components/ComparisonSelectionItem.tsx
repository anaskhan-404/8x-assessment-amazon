import { X } from 'lucide-react'
import Link from 'next/link'
import { CatalogueImage } from './CatalogueImage'
import type { Product } from '../types'

export function ComparisonSelectionItem({ product, onRemove }: { product: Product; onRemove: (id: string) => void }) {
  return (
    <div className="comparison-selection-item">
      <CatalogueImage src={product.image} alt="" width={80} height={80} />
      <Link href={`/product/${product.slug}`}><small>{product.brand}</small><strong>{product.name}</strong></Link>
      <button type="button" className="icon-button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.brand} ${product.name}`}><X size={17} aria-hidden="true" /></button>
    </div>
  )
}
