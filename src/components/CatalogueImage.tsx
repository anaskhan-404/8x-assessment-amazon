'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

const fallback = '/images/product-unavailable.svg'

// Keep a useful, local fallback in every catalogue surface, including the tray.
export function CatalogueImage({ src, alt, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null)
  const failed = failedSrc === src
  return (
    <Image
      {...props}
      src={failed ? fallback : src}
      alt={failed ? `Image unavailable${alt ? `: ${alt}` : ''}` : alt}
      onError={() => setFailedSrc(src)}
    />
  )
}
