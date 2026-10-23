import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="section container compare-empty">
      <p className="eyebrow">404</p>
      <h1>That page is not on the shelf.</h1>
      <p>Return to the store and keep exploring.</p>
      <Link className="button button--primary" href="/">
        Back to Parallel
      </Link>
    </section>
  )
}
