import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { CatalogueImage } from './CatalogueImage'

const collections = [
  { title: 'Small finds. Big everyday energy.', label: 'Finds for $25 or less', href: '/search?max=25', image: '/images/products/bamboo-spatula.webp', eyebrow: 'A little goes a long way' },
  { title: 'Make room for a good story.', label: 'Discover the bookshelf', href: '/category/books', image: '/images/products/pride-and-prejudice.jpg', eyebrow: 'Your next chapter' },
  { title: 'Your routine, refreshed.', label: 'Explore daily essentials', href: '/category/beauty-and-personal-care', image: '/images/products/leaves-hand-soap.webp', eyebrow: 'Everyday rituals' },
]

export function MarketplaceCollections() {
  return (
    <section className="container marketplace-collections" aria-label="Curated collections">
      {collections.map((collection) => (
        <Link key={collection.href} href={collection.href} className="collection-card">
          <div>
            <p className="eyebrow">{collection.eyebrow}</p>
            <h2>{collection.title}</h2>
            <span className="text-link">{collection.label}<ArrowRight size={16} aria-hidden="true" /></span>
          </div>
          <div className="collection-card__image">
            <CatalogueImage src={collection.image} alt="" fill sizes="(max-width: 680px) 30vw, 140px" />
          </div>
        </Link>
      ))}
    </section>
  )
}
