import { CategoryPage } from '@/views/CategoryPage'
import { Suspense } from 'react'

export default function Page() {
  return <Suspense fallback={<div className="section container">Loading products…</div>}><CategoryPage /></Suspense>
}
