'use client'

import { ArrowLeft, ArrowRight, Scale, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ComparisonTable } from '../components/ComparisonTable'
import { ComparisonSelectionItem } from '../components/ComparisonSelectionItem'
import { useComparison, MAX_COMPARISON_ITEMS, MAX_COMPARISON_PER_CATEGORY } from '../comparison-context'
import { isComparisonCategory } from '../comparison-schemas'

export function ComparePage() {
  const { selectedProducts, groups, remove, clear, clearGroup } = useComparison()
  const params = useSearchParams()
  const requested = params.get('category')
  const active = (isComparisonCategory(requested) ? groups.find((group) => group.category === requested) : undefined) ?? groups[0]

  if (!active) return (
    <section className="section container compare-empty">
      <span className="compare-empty__icon"><Scale aria-hidden="true" /></span>
      <p className="eyebrow">Your comparison workspace</p>
      <h1>Start with something you like</h1>
      <p>Add products from any category. Your selections stay together, with separate comparisons for each category.</p>
      <Link className="button button--primary" href="/search">Explore products <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  )

  return (
    <section className="comparison-workspace container">
      <Link className="back-link" href="/search"><ArrowLeft size={17} aria-hidden="true" /> Back to shopping</Link>
      <div className="comparison-workspace__heading">
        <div>
          <p className="eyebrow">Your shortlist, in one place</p>
          <h1>Comparison workspace</h1>
          <p>{selectedProducts.length} of {MAX_COMPARISON_ITEMS} products saved across {groups.length} {groups.length === 1 ? 'category' : 'categories'}. Up to {MAX_COMPARISON_PER_CATEGORY} per category.</p>
        </div>
        <button className="button button--outline" type="button" onClick={clear}><Trash2 size={16} aria-hidden="true" /> Clear all selections</button>
      </div>

      <nav className="comparison-category-nav" aria-label="Comparison categories">
        {groups.map((group) => (
          <Link key={group.category} href={`/compare?category=${group.category}`} scroll={false} aria-current={active.category === group.category ? 'page' : undefined}>
            {group.name}<span>{group.products.length}</span>
          </Link>
        ))}
      </nav>

      <div className="comparison-group-toolbar">
        <div><h2>{active.name} <span>({active.products.length})</span></h2><p>{active.products.length < 2 ? 'Add one more product in this category to compare.' : 'Only products in this category appear in the table below.'}</p></div>
        <div>
          <Link className="text-link" href={`/category/${active.category}`}>Add products <ArrowRight size={16} aria-hidden="true" /></Link>
          <button className="text-button text-button--danger" type="button" onClick={() => clearGroup(active.category)}>Clear {active.name.toLowerCase()}</button>
        </div>
      </div>

      {active.products.length === 1 ? (
        <div className="comparison-singleton">
          <ComparisonSelectionItem product={active.products[0]} onRemove={remove} />
          <p>Your selection is saved. Choose another product from {active.name.toLowerCase()} to see its specifications side by side.</p>
          <Link className="button button--primary" href={`/category/${active.category}`}>Browse {active.name.toLowerCase()}</Link>
        </div>
      ) : <ComparisonTable key={active.category} selectedProducts={active.products} category={active.category} name={active.name} />}
    </section>
  )
}