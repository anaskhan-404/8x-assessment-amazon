'use client'

import { Check, Info, ShoppingBag, Sparkles, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { CatalogueImage as Image } from './CatalogueImage'
import { Rating } from './Rating'
import { getSpec } from '../data'
import { bestProductFor, comparisonSpecs, compatibleProducts, specIsDifferent } from '../comparison-engine'
import { useComparison } from '../comparison-context'
import type { Product, ProductCategory, SpecDefinition } from '../types'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ComparisonTable({ selectedProducts, category, name }: { selectedProducts: Product[]; category: ProductCategory; name: string }) {
  // Filter again at the rendering boundary so a mixed input never becomes a table.
  const products = compatibleProducts(selectedProducts, category)
  const { remove } = useComparison()
  const [differencesOnly, setDifferencesOnly] = useState(false)
  const specs = comparisonSpecs(category)
  const visibleSpecs = differencesOnly ? specs.filter((definition) => specIsDifferent(definition, products)) : specs
  const groups = [...new Set(specs.map((definition) => definition.group))]
  const keyDifferences = specs.filter((definition) => definition.keyDifference && specIsDifferent(definition, products))
  if (products.length < 2) return null

  return (
    <div className="category-comparison" data-comparison-category={category}>
      <div className="comparison-section-heading">
        <div><h2>Compare {name.toLowerCase()}</h2><p>{products.length} compatible products. Differences are highlighted.</p></div>
        <label className="switch-control">
          <input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />
          <span aria-hidden="true"><i /></span> Show differences only
        </label>
      </div>
      {keyDifferences.length > 0 && <div className="key-differences">
        <div className="key-differences__heading"><span><Sparkles size={19} aria-hidden="true" /></span><div><h2>Key differences</h2><p>Useful details for your decision.</p></div></div>
        <div className="key-differences__grid">{keyDifferences.slice(0, 4).map((definition) => <DifferenceSummary key={definition.key} definition={definition} products={products} />)}</div>
      </div>}
      <div className="desktop-comparison">
        <div
          className="comparison-table" role="table" aria-label={`${name} comparison`}
          style={{ '--compare-count': products.length } as CSSProperties}
        >
          <div className="comparison-products comparison-grid-row" role="row">
            <div className="comparison-label comparison-label--top" role="columnheader">
              <span>Selected products</span>
              <small>Up to 4</small>
            </div>
            {products.map((product) => (
              <CompareProductHeader key={product.id} product={product} onRemove={remove} />
            ))}
          </div>

          {groups.map((group) => {
            const definitions = visibleSpecs.filter((definition) => definition.group === group)
            if (definitions.length === 0) return null

            return (
              <section role="rowgroup" className="comparison-group" key={group} aria-labelledby={`group-${group}`}>
                <div role="row"><h2 role="columnheader" aria-colspan={products.length + 1} id={`group-${group}`}>{group}</h2></div>
                {definitions.map((definition) => {
                  const different = specIsDifferent(definition, products)
                  const bestId = bestProductFor(definition, products)

                  return (
                    <div
                      className={`comparison-grid-row comparison-spec-row ${different ? 'is-different' : ''}`}
                      key={definition.key}
                      role="row"
                    >
                      <div className="comparison-label" role="rowheader">
                        <span>{definition.label}</span>
                        {definition.note && <p className="spec-note">{definition.note}</p>}
                        {different && <small>Different</small>}
                      </div>
                      {products.map((product) => {
                        const value = getSpec(product, definition.key)
                        return (
                          <div role="cell" className="comparison-value" key={product.id}>
                            <span>{value?.display ?? 'Not provided'}</span>
                            {bestId === product.id && (
                              <b><Check size={13} /> Standout</b>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
        {differencesOnly && visibleSpecs.length === 0 && <p className="comparison-no-differences">No specification differences among these products.</p>}
        <p className="comparison-disclaimer">
          <Info size={15} /> “Standout” marks a unique objective high or low, not an overall winner.
          Unknown values and differing measurement conditions are never ranked.
        </p>
      </div>

      <MobileComparison products={products} specs={specs} differencesOnly={differencesOnly} onRemove={remove} />
      <p className="comparison-data-note">Demonstration catalogue. Prices, ratings and specifications are curated sample data. “Not provided” means unknown, not zero or unavailable.</p>
    </div>
  )
}

function CompareProductHeader({
  product,
  onRemove,
}: {
  product: Product
  onRemove: (id: string) => void
}) {
  return (
    <article role="columnheader" className="compare-product-header">
      <button
        className="compare-product-header__remove"
        type="button"
        onClick={() => onRemove(product.id)}
      >
        <X size={16} />
        <span className="sr-only">Remove {product.name}</span>
      </button>
      <Image src={product.image} alt="" width={420} height={260} />
      <small>{product.brand}</small>
      <h3>{product.name}</h3>
      <Rating rating={product.rating} count={product.reviewCount} />
      <strong className="compare-product-header__price">{money.format(product.price)}</strong>
      <Link className="button button--dark button--small button--full" href={`/product/${product.slug}`}>
        <ShoppingBag size={16} /> View product
      </Link>
    </article>
  )
}

function DifferenceSummary({
  definition,
  products,
}: {
  definition: SpecDefinition
  products: Product[]
}) {
  const bestId = bestProductFor(definition, products)

  return (
    <article className="difference-card">
      <span>{definition.label}</span>
      {products.map((product) => (
        <div key={product.id} className={bestId === product.id ? 'is-standout' : undefined}>
          <small>{product.brand} {product.name}</small>
          <strong>{getSpec(product, definition.key)?.display ?? 'Not provided'}</strong>
        </div>
      ))}
    </article>
  )
}

function MobileComparison({
  products,
  specs,
  differencesOnly,
  onRemove,
}: {
  products: Product[]
  specs: SpecDefinition[]
  differencesOnly: boolean
  onRemove: (id: string) => void
}) {
  const [leftId, setLeftId] = useState(products[0]?.id ?? '')
  const [rightId, setRightId] = useState(products[1]?.id ?? '')

  const safeLeftId = products.some((product) => product.id === leftId)
    ? leftId
    : products[0]?.id ?? ''
  const safeRightId = products.some(
    (product) => product.id === rightId && product.id !== safeLeftId,
  )
    ? rightId
    : products.find((product) => product.id !== safeLeftId)?.id ?? ''

  const left = products.find((product) => product.id === safeLeftId) ?? products[0]
  const right = products.find((product) => product.id === safeRightId) ?? products[1]
  const pair = [left, right].filter((product): product is Product => Boolean(product))

  const visibleSpecs = differencesOnly ? specs.filter((definition) => specIsDifferent(definition, pair)) : specs
  const groups = [...new Set(specs.map((definition) => definition.group))]

  return (
    <div className="mobile-comparison">
      <div className="mobile-pair-picker">
        <div>
          <label htmlFor="left-product">First product</label>
          <select id="left-product" value={left.id} onChange={(event) => setLeftId(event.target.value)}>
            {products.filter((product) => product.id !== right.id).map((product) => (
              <option key={product.id} value={product.id}>{product.brand} {product.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="right-product">Second product</label>
          <select id="right-product" value={right.id} onChange={(event) => setRightId(event.target.value)}>
            {products.filter((product) => product.id !== left.id).map((product) => (
              <option key={product.id} value={product.id}>{product.brand} {product.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mobile-product-pair">
        {pair.map((product) => (
          <article key={product.id}>
            <button type="button" onClick={() => onRemove(product.id)}>
              <X size={15} /><span className="sr-only">Remove {product.name}</span>
            </button>
            <Image src={product.image} alt="" width={360} height={260} />
            <small>{product.brand}</small>
            <h2>{product.name}</h2>
            <strong>{money.format(product.price)}</strong>
          </article>
        ))}
      </div>

      {differencesOnly && visibleSpecs.length === 0 && <p className="comparison-no-differences">No specification differences in this pair.</p>}
      {groups.map((group) => {
        const definitions = visibleSpecs.filter((definition) => definition.group === group)
        if (!definitions.length) return null
        return (
          <section className="mobile-spec-group" key={group}>
            <h2>{group}</h2>
            {definitions.map((definition) => {
              const different = specIsDifferent(definition, pair)
              const bestId = bestProductFor(definition, pair)
              return (
                <div className={`mobile-spec-row ${different ? 'is-different' : ''}`} key={definition.key}>
                  <h3>{definition.label}{different && <span>Different</span>}</h3>
                  {definition.note && <p className="spec-note">{definition.note}</p>}
                  <div>
                    {pair.map((product) => (
                      <p key={product.id}>
                        <span>{getSpec(product, definition.key)?.display ?? 'Not provided'}</span>
                        {bestId === product.id && <b><Check size={12} /> Standout</b>}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}


