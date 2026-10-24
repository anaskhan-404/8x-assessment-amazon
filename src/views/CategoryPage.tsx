'use client'

import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import { CatalogueImage as Image } from '../components/CatalogueImage'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { CatalogueBrowser } from '../components/CatalogueBrowser'
import { categoryBySlug, categoryProducts } from '../data'
import { useCatalogueQuery } from '../use-catalogue-query'

export function CategoryPage() {
  const params = useParams<{ categorySlug: string }>()
  const category = categoryBySlug(params?.categorySlug)
  const { categoryHref } = useCatalogueQuery()

  if (!category) notFound()

  return (
    <>
      <section className="category-hero">
        <div className="container category-hero__inner">
          <div className="category-hero__copy">
            <p className="breadcrumb"><Link href="/">Home</Link> / {category.parentSlug && <><Link href={categoryHref(category.parentSlug)}>Electronics</Link> / </>}{category.name}</p>
            <p className="eyebrow">{category.eyebrow}</p>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
            {category.slug !== 'electronics' && (
              <div className="compare-callout">
                <span><SlidersHorizontal size={20} /></span>
                <div>
                  <strong>Make the differences clear</strong>
                  <p>Select up to four products in this category, then compare their specifications side by side.</p>
                </div>
                <Link href={`/compare?category=${category.slug}`}>Open comparison <ArrowRight size={16} /></Link>
              </div>
            )}
          </div>
          <div className={`category-hero__image ${!category.parentSlug && category.slug !== 'electronics' ? 'category-hero__image--contained' : ''}`}>
            <Image src={category.image} alt="" fill sizes="(max-width: 900px) 100vw, 45vw" style={{ objectPosition: category.imagePosition }} />
            <span>{categoryProducts(category.slug).length} products in this category</span>
          </div>
        </div>
      </section>

      <section className="section container catalogue-section">
        <CatalogueBrowser />
      </section>
    </>
  )
}
