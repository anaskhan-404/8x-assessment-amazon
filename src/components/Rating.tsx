import { Star } from 'lucide-react'

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function Rating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="rating" aria-label={`${rating} out of 5 stars from ${count} reviews`}>
      <Star size={15} fill="currentColor" aria-hidden="true" />
      <strong>{rating.toFixed(1)}</strong>
      <span>({compactNumber.format(count)})</span>
    </div>
  )
}
