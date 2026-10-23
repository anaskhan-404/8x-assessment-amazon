import { Suspense } from 'react'
import { SearchPage } from '@/views/SearchPage'

export const metadata = {
  title: 'Search',
}

export default function Page() {
  return (
    <Suspense fallback={<div className="section container">Loading results…</div>}>
      <SearchPage />
    </Suspense>
  )
}
