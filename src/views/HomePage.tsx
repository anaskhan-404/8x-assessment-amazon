import { ArrowRight, BadgeCheck, Layers3, ScanSearch } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductCard } from '../components/ProductCard'
import { categories, products } from '../data'

const featuredIds = [
  'sony-wh1000xm5',
  'keychron-q1-max',
  'lg-ultrafine-4k',
  'logitech-mx-master',
]

export function HomePage() {
  const featured = featuredIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product) => Boolean(product))

  return (
    <>
      <section className="home-hero">
        <Image
          src="/images/parallel-hero.png"
          alt="Headphones, keyboard, monitor and mouse in a modern workspace"
          fill
          priority
          sizes="100vw"
        />
        <div className="home-hero__veil" />
        <div className="container home-hero__content">
          <p className="eyebrow">Technology, considered</p>
          <h1>Tech that earns its place.</h1>
          <p>
            Thoughtfully selected products, clearer specifications and side-by-side
            comparisons when the details matter.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--large" href="/category/headphones">
              Shop headphones <ArrowRight size={19} />
            </Link>
            <a className="button button--glass button--large" href="#categories">
              Browse categories
            </a>
          </div>
          <div className="hero-proof">
            <span><strong>4</strong> products side by side</span>
            <span><strong>12</strong> useful headphone specs</span>
            <span><strong>0</strong> marketplace clutter</span>
          </div>
        </div>
      </section>

      <section className="section container" id="categories">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Build a better setup</h2>
          </div>
          <p>Essential technology for work, play and everything in between.</p>
        </div>

        <div className="category-grid">
          {categories.map((category, index) => (
            <Link
              className={`category-card ${index === 0 ? 'category-card--featured' : ''}`}
              key={category.slug}
              href={`/category/${category.slug}`}
            >
              <Image
                src={category.image}
                alt=""
                fill
                sizes={index === 0 ? '(max-width: 680px) 100vw, 50vw' : '(max-width: 900px) 50vw, 25vw'}
                style={{ objectPosition: category.imagePosition }}
              />
              <span className="category-card__overlay" />
              <span className="category-card__content">
                <small>{category.eyebrow}</small>
                <strong>{category.name}</strong>
                <span>
                  Explore <ArrowRight size={16} />
                </span>
              </span>
              {category.compareEnabled && <b>Compare enabled</b>}
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">The current shortlist</p>
              <h2>Products worth a closer look</h2>
            </div>
            <Link className="text-link" href="/category/headphones">
              See all headphones <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid product-grid--four">
            {featured.map((product) => product && <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

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
