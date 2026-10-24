export type DepartmentSlug = 'electronics' | 'home-and-kitchen' | 'fashion' | 'books' | 'beauty-and-personal-care' | 'sports-and-fitness'

export type CategorySlug = DepartmentSlug
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
  | 'Product details'

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
  unit?: 'g' | 'ml' | 'L' | 'h' | 'days' | 'in' | 'W' | 'Gbps' | 'DPI' | 'ports' | 'min'
  basis?: string
}

export interface ProductHighlight {
  label: string
  value: string
}

export interface SpecKeysByCategory {
  headphones: HeadphoneSpecKey
  keyboards: 'layout' | 'switches' | 'connection' | 'profile'
  monitors: 'screenSize' | 'resolution' | 'panel' | 'connection'
  mice: 'sensor' | 'weight' | 'connection' | 'battery'
  accessories: 'ports' | 'bandwidth' | 'power' | 'connection'
  'home-and-kitchen': 'material' | 'dimensions' | 'capacity' | 'care'
  fashion: 'material' | 'size' | 'fit' | 'care'
  books: 'author' | 'format' | 'language' | 'genre'
  'beauty-and-personal-care': 'volume' | 'skinType' | 'finish' | 'usage'
  'sports-and-fitness': 'material' | 'size' | 'weight' | 'activity'
}

export type ProductCategory = keyof SpecKeysByCategory
export type ProductSpecKey = SpecKeysByCategory[ProductCategory]

interface ProductBase {
  id: string
  slug: string
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
}

// The category discriminant prevents, for example, book specifications on headphones.
export type Product = {
  [C in ProductCategory]: ProductBase & {
    category: C
    specs: Partial<Record<SpecKeysByCategory[C], SpecValue | null>>
  }
}[ProductCategory]

export type ProductOf<C extends ProductCategory> = Extract<Product, { category: C }>

export interface Category {
  slug: CategorySlug
  name: string
  eyebrow: string
  description: string
  image: string
  imagePosition?: string
  compareEnabled?: boolean
  parentSlug?: DepartmentSlug
}

export interface SpecDefinition<C extends ProductCategory = ProductCategory> {
  key: SpecKeysByCategory[C]
  label: string
  group: SpecGroup
  keyDifference?: boolean
  lowerIsBetter?: boolean
  higherIsBetter?: boolean
  note?: string
  compareDisplay?: boolean
}
