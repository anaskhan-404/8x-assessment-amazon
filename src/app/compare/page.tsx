import { ComparePage } from '@/views/ComparePage'
import { Suspense } from 'react'

export const metadata = {
  title: 'Comparison workspace',
}

export default function Page() {
  return <Suspense fallback={<section className="section container" aria-busy="true">Loading your comparison workspace…</section>}><ComparePage /></Suspense>
}
