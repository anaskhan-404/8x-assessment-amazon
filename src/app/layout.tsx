import type { Metadata } from 'next'
import { ApplicationShell } from '@/components/ApplicationShell'
import { ComparisonProvider } from '@/comparison-context'
import { ShoppingProvider } from '@/shopping-context'
import '@/styles.css'
import '@/styles/marketplace.css'
import '@/styles/comparison.css'
import '@/styles/commerce.css'
import '@/styles/shopping.css'
import '@/styles/storefront.css'

export const metadata: Metadata = {
  title: {
    default: 'Parallel — Good finds. Clearer choices.',
    template: '%s — Parallel',
  },
  description:
    'Shop electronics, home, fashion, books, beauty and sports. Save products in one comparison tray and compare within each category.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ComparisonProvider>
          <ShoppingProvider><ApplicationShell>{children}</ApplicationShell></ShoppingProvider>
        </ComparisonProvider>
      </body>
    </html>
  )
}
