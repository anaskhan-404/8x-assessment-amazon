export default function Loading() {
  return <div className="container marketplace-loading" role="status" aria-label="Loading page"><span className="sr-only">Loading page…</span><div className="loading-line" /><div className="loading-cards">{[0, 1, 2, 3].map((item) => <div key={item} />)}</div></div>
}
