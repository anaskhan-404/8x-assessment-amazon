'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="container commerce-page"><h1>Unable to load this page</h1><p>The service is temporarily unavailable. Please try again.</p><button className="button button--primary" onClick={reset}>Try again</button></section>
}
