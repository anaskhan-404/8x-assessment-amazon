import { ProductPage } from '@/views/ProductPage'

export default async function Page({ params }: { params: Promise<{ productSlug: string }> }) {
  return <ProductPage key={(await params).productSlug} />
}
