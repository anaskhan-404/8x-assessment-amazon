'use client'

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  Scale,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Rating } from '../components/Rating'
import { useComparison } from '../comparison-context'
import { getSpec, headphoneSpecs } from '../data'
import type {
  HeadphoneSpecKey,
  Product,
  SpecDefinition,
  SpecGroup,
} from '../types'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const groups: SpecGroup[] = [
  'Essentials',
  'Sound & calls',
  'Comfort & durability',
  'Connectivity & charging',
]

export function ComparePage() {
  const { selectedProducts, remove, clear } = useComparison()
  const [differencesOnly, setDifferencesOnly] = useState(false)

  const visibleSpecs = useMemo(
    () =>
      differencesOnly
        ? headphoneSpecs.filter((definition) =>
            specIsDifferent(definition.key, selectedProducts),
          )
        : headphoneSpecs,
    [differencesOnly, selectedProducts],
  )

  if (selectedProducts.length < 2) {
    return (
      <section className="section container compare-empty">
        <span className="compare-empty__icon"><Scale /></span>
        <p className="eyebrow">Comparison</p>
        <h1>{selectedProducts.length === 1 ? 'Choose one more headphone' : 'Start a comparison'}</h1>
        <p>
          {selectedProducts.length === 1
            ? 'Your first product is saved. Add another to see the important differences side by side.'
            : 'Select two to four headphones from the catalogue to compare their price, battery, weight and more.'}
        </p>
        <Link className="button button--primary button--large" href="/category/headphones">
          Browse headphones <ChevronRight size={18} />
        </Link>
      </section>
    )
  }

  const keyDifferences = headphoneSpecs.filter(
    (definition) =>
      definition.keyDifference &&
      specIsDifferent(definition.key, selectedProducts),
  )

  return (
    <section className="compare-page">
      <div className="container compare-page__heading">
        <Link className="back-link" href="/category/headphones">
          <ArrowLeft size={17} /> Back to headphones
        </Link>
        <div className="compare-title-row">
          <div>
            <p className="eyebrow">Decision view</p>
            <h1>Compare headphones</h1>
            <p>{selectedProducts.length} products selected. Differences are highlighted automatically.</p>
          </div>
          <div className="compare-title-actions">
            <label className="switch-control">
              <input
                type="checkbox"
                checked={differencesOnly}
                onChange={(event) => setDifferencesOnly(event.target.checked)}
              />
              <span aria-hidden="true"><i /></span>
              Show differences only
            </label>
            <button className="text-button text-button--danger" type="button" onClick={clear}>
              Clear comparison
            </button>
          </div>
        </div>
      </div>

      <div className="container key-differences">
        <div className="key-differences__heading">
          <span><Sparkles size={19} /></span>
          <div>
            <h2>Key differences</h2>
            <p>The details most likely to change your decision.</p>
          </div>
        </div>
        <div className="key-differences__grid">
          {keyDifferences.slice(0, 4).map((definition) => (
            <DifferenceSummary
              key={definition.key}
              definition={definition}
              products={selectedProducts}
            />
          ))}
        </div>
      </div>

      <div className="desktop-comparison container">
        <div
          className="comparison-table"
          style={{ '--compare-count': selectedProducts.length } as CSSProperties}
        >
          <div className="comparison-products comparison-grid-row">
            <div className="comparison-label comparison-label--top">
              <span>Selected products</span>
              <small>Up to 4</small>
            </div>
            {selectedProducts.map((product) => (
              <CompareProductHeader key={product.id} product={product} onRemove={remove} />
            ))}
          </div>

          {groups.map((group) => {
            const definitions = visibleSpecs.filter((definition) => definition.group === group)
            if (definitions.length === 0) return null

            return (
              <section className="comparison-group" key={group} aria-labelledby={`group-${group}`}>
                <h2 id={`group-${group}`}>{group}</h2>
                {definitions.map((definition) => {
                  const different = specIsDifferent(definition.key, selectedProducts)
                  const bestId = bestProductFor(definition, selectedProducts)

                  return (
                    <div
                      className={`comparison-grid-row comparison-spec-row ${different ? 'is-different' : ''}`}
                      key={definition.key}
                    >
                      <div className="comparison-label">
                        <span>{definition.label}</span>
                        {different && <small>Different</small>}
                      </div>
                      {selectedProducts.map((product) => {
                        const value = getSpec(product, definition.key)
                        return (
                          <div className="comparison-value" key={product.id}>
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
        <p className="comparison-disclaimer">
          <Info size={15} /> “Standout” marks a unique objective high or low, not an overall winner.
          Missing manufacturer specifications are never ranked.
        </p>
      </div>

      <MobileComparison
        products={selectedProducts}
        specs={visibleSpecs}
        onRemove={remove}
      />
    </section>
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
    <article className="compare-product-header">
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
          <small>{product.brand}</small>
          <strong>{getSpec(product, definition.key)?.display ?? 'Not provided'}</strong>
        </div>
      ))}
    </article>
  )
}

function MobileComparison({
  products,
  specs,
  onRemove,
}: {
  products: Product[]
  specs: SpecDefinition[]
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

  return (
    <div className="mobile-comparison container">
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

      {groups.map((group) => {
        const definitions = specs.filter((definition) => definition.group === group)
        if (!definitions.length) return null
        return (
          <section className="mobile-spec-group" key={group}>
            <h2>{group}</h2>
            {definitions.map((definition) => {
              const different = specIsDifferent(definition.key, pair)
              const bestId = bestProductFor(definition, pair)
              return (
                <div className={`mobile-spec-row ${different ? 'is-different' : ''}`} key={definition.key}>
                  <h3>{definition.label}{different && <span>Different</span>}</h3>
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

function specIsDifferent(key: HeadphoneSpecKey, products: Product[]) {
  const values = products
    .map((product) => getSpec(product, key)?.comparable)
    .filter((value) => value !== undefined && value !== null)
  return new Set(values.map(String)).size > 1
}

function bestProductFor(definition: SpecDefinition, products: Product[]) {
  if (!definition.higherIsBetter && !definition.lowerIsBetter) return null

  const candidates = products
    .map((product) => ({
      id: product.id,
      value: getSpec(product, definition.key)?.comparable,
    }))
    .filter(
      (candidate): candidate is { id: string; value: number } =>
        typeof candidate.value === 'number',
    )

  if (candidates.length < 2) return null
  const values = candidates.map((candidate) => candidate.value)
  const target = definition.lowerIsBetter ? Math.min(...values) : Math.max(...values)
  const winners = candidates.filter((candidate) => candidate.value === target)
  return winners.length === 1 ? winners[0].id : null
}
