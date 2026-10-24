import { ArrowRight, BadgeCheck, Layers3, ScanSearch } from 'lucide-react'
import { CatalogueImage as Image } from '../components/CatalogueImage'
import Link from 'next/link'
import { ProductCollection } from '../components/ProductCollection'
import { MarketplaceCollections } from '../components/MarketplaceCollections'
import { categoryProducts, departments, products } from '../data'

const featuredIds = [
  'sony-wh1000xm5',
  'carbon-steel-wok',
  'pride-and-prejudice',
  'tennis-racket',
]

export function HomePage() {
  const featured = featuredIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product) => product !== undefined)
  const deals = products
    .filter((product) => product.previousPrice && product.previousPrice > product.price)
    .sort((a, b) => (1 - b.price / b.previousPrice!) - (1 - a.price / a.previousPrice!))
    .slice(0, 4)

  return (
    <>
      <section className="container marketplace-hero">
        <div className="marketplace-hero__image hero-showcase" aria-label="Finds for every part of your day">
          {[
            { image: '/images/products/carbon-steel-wok.webp', label: 'For your home', href: '/category/home-and-kitchen' },
            { image: '/images/products/blue-handbag.webp', label: 'For your everyday', href: '/category/fashion' },
            { image: '/images/products/tennis-racket.webp', label: 'For your downtime', href: '/category/sports-and-fitness' },
          ].map((item) => <Link href={item.href} key={item.href} className="hero-showcase__item"><span><Image src={item.image} alt="" fill priority sizes="(max-width: 680px) 30vw, 200px" /></span><strong>{item.label}</strong></Link>)}
        </div>
        <div className="marketplace-hero__content">
          <p className="eyebrow">A little of everything. A lot to discover.</p>
          <h1>Good finds.<br />Clearer choices.</h1>
          <p>
            Thoughtful upgrades and everyday favourites for your home, your routine and whatever comes next.
          </p>
          <div className="hero-actions">
            <a className="button button--primary button--large" href="#categories">
              Shop categories <ArrowRight size={19} aria-hidden="true" />
            </a>
            <Link className="text-link" href="/#deals">
              See deals <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="marketplace-hero__note">{departments.length} departments. Plenty of possibilities.</p>
        </div>
      </section>

      <div className="container discovery-strip"><span>One marketplace. Every part of your day.</span><Link href="/search?max=25">Finds under $25 <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/search?sort=rating">Top-rated picks <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/wishlist">Save your favourites <ArrowRight size={15} aria-hidden="true" /></Link></div>

      <section className="section container category-discovery" id="categories">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>What are you looking for?</h2>
          </div>
          <p>For your home, your routine and whatever comes next.</p>
        </div>

        <div className="category-grid department-grid">
          {departments.map((category) => (
            <Link
              className="department-card"
              key={category.slug}
              href={`/category/${category.slug}`}
            >
              <span className={`department-card__image department-card__image--${category.slug}`}><Image
                src={category.image}
                alt=""
                fill
                sizes="(max-width: 680px) 45vw, (max-width: 1100px) 30vw, 180px"
                style={{ objectPosition: category.imagePosition }}
              /></span>
              <span className="department-card__content">
                <strong>{category.name}</strong>
                <span>{categoryProducts(category.slug).length} products <ArrowRight size={14} aria-hidden="true" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <MarketplaceCollections />

      <ProductCollection eyebrow="The current shortlist" title="Worth a closer look" products={featured} href="/search" linkLabel="Browse all products" />

      <div className="section--soft">
        <ProductCollection id="deals" eyebrow="Good finds, lower prices" title="Deals for your next upgrade" description="Savings against previous prices in our demonstration catalogue." products={deals} href="/category/electronics?sort=price-low" linkLabel="Explore electronics" />
      </div>

      <section className="section container" id="about">
        <div className="principles-panel">
          <div className="principles-panel__intro">
            <p className="eyebrow">Why Parallel</p>
            <h2>Shopping tools designed around the decision.</h2>
            <p>
              We surface the details that change a purchase instead of making you dig
              through long descriptions and mismatched specification lists.
            </p>
          </div>
          <div className="principle-list">
            <article>
              <span><ScanSearch /></span>
              <div>
                <h3>Useful context</h3>
                <p>Concise product facts selected for the way each category is actually shopped.</p>
              </div>
            </article>
            <article>
              <span><Layers3 /></span>
              <div>
                <h3>Fair comparisons</h3>
                <p>Like-for-like specifications make meaningful differences easy to see.</p>
              </div>
            </article>
            <article>
              <span><BadgeCheck /></span>
              <div>
                <h3>No mystery winners</h3>
                <p>We highlight objective standouts while leaving the final choice to you.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
