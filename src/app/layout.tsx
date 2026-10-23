import type { Metadata } from 'next'
import { CompareTray } from '@/components/CompareTray'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Toast } from '@/components/Toast'
import { ComparisonProvider } from '@/comparison-context'
import '@/styles.css'

export const metadata: Metadata = {
  title: {
    default: 'Parallel — Better tech, side by side',
    template: '%s — Parallel',
  },
  description:
    'A comparison-first technology store with clearer product information and better buying decisions.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ComparisonProvider>
          <div className="site-shell">
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Header />
            <main id="main-content">{children}</main>
            <Footer />
            <CompareTray />
            <Toast />
          </div>
        </ComparisonProvider>
      </body>
    </html>
  )
}
