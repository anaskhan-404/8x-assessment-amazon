export type CategorySlug =
  | 'headphones'
  | 'keyboards'
  | 'monitors'
  | 'mice'
  | 'accessories'

export type SpecGroup =
  | 'Essentials'
  | 'Sound & calls'
  | 'Comfort & durability'
  | 'Connectivity & charging'

export type HeadphoneSpecKey =
  | 'formFactor'
  | 'noiseCancellation'
  | 'battery'
  | 'fastCharge'
  | 'weight'
  | 'multipoint'
  | 'bluetooth'
  | 'codecs'
  | 'microphones'
  | 'waterResistance'
  | 'charging'
  | 'folding'

export interface SpecValue {
  display: string
  comparable: string | number | boolean
}

export interface ProductHighlight {
  label: string
  value: string
}

export interface Product {
  id: string
  slug: string
  category: CategorySlug
  brand: string
  name: string
  description: string
  price: number
  previousPrice?: number
  rating: number
  reviewCount: number
  image: string
  imagePosition?: string
  badge?: string
  highlights: ProductHighlight[]
  specs?: Partial<Record<HeadphoneSpecKey, SpecValue | null>>
}

export interface Category {
  slug: CategorySlug
  name: string
  eyebrow: string
  description: string
  image: string
  imagePosition?: string
  compareEnabled?: boolean
}

export interface SpecDefinition {
  key: HeadphoneSpecKey
  label: string
  group: SpecGroup
  keyDifference?: boolean
  lowerIsBetter?: boolean
  higherIsBetter?: boolean
}
