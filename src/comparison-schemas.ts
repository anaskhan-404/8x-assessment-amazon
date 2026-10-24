import type { ProductCategory, SpecDefinition, SpecKeysByCategory } from './types'

export const headphoneSpecs: SpecDefinition<'headphones'>[] = [
  {
    key: 'formFactor',
    label: 'Form factor',
    group: 'Essentials',
  },
  {
    key: 'noiseCancellation',
    label: 'Noise cancellation',
    group: 'Essentials',
    keyDifference: true,
  },
  {
    key: 'battery',
    label: 'Battery life (hours)',
    note: 'Reported battery life; listening mode and test conditions vary. Not ranked.',
    group: 'Essentials',
    keyDifference: true,
  },
  {
    key: 'weight',
    label: 'Weight',
    group: 'Essentials',
    keyDifference: true,
    lowerIsBetter: true,
  },
  {
    key: 'codecs',
    label: 'Audio codecs',
    group: 'Sound & calls',
    keyDifference: true,
  },
  {
    key: 'microphones',
    label: 'Call microphones',
    group: 'Sound & calls',
  },
  {
    key: 'waterResistance',
    label: 'Water resistance',
    group: 'Comfort & durability',
  },
  {
    key: 'folding',
    label: 'Travel design',
    group: 'Comfort & durability',
  },
  {
    key: 'multipoint',
    label: 'Multi-device',
    group: 'Connectivity & charging',
    keyDifference: true,
  },
  {
    key: 'bluetooth',
    label: 'Bluetooth',
    group: 'Connectivity & charging',
  },
  {
    key: 'fastCharge',
    label: 'Fast charge',
    compareDisplay: true,
    note: 'Charge duration and playback conditions differ. Not ranked.',
    group: 'Connectivity & charging',
  },
  {
    key: 'charging',
    label: 'Charging port',
    group: 'Connectivity & charging',
  },
]


function details<C extends ProductCategory>(fields: ReadonlyArray<readonly [SpecKeysByCategory[C], string]>): SpecDefinition<C>[] {
  return fields.map(([key, label]) => ({ key, label, group: 'Product details', keyDifference: true }))
}

// Every catalogue leaf category must have a schema. Departments such as Electronics
// are navigation containers, never compatibility groups.
export const comparisonSchemas: { [C in ProductCategory]: SpecDefinition<C>[] } = {
  headphones: headphoneSpecs,
  keyboards: details<'keyboards'>([['layout', 'Layout'], ['switches', 'Switches'], ['connection', 'Connection'], ['profile', 'Key profile']]),
  monitors: details<'monitors'>([['screenSize', 'Screen size (inches)'], ['resolution', 'Resolution'], ['panel', 'Panel type'], ['connection', 'Connection']]),
  mice: details<'mice'>([['sensor', 'Sensor (DPI)'], ['weight', 'Weight (g)'], ['connection', 'Connection'], ['battery', 'Battery life (days)']]),
  accessories: details<'accessories'>([['ports', 'Port count'], ['bandwidth', 'Bandwidth (Gbps)'], ['power', 'Power delivery (W)'], ['connection', 'Connection']]),
  'home-and-kitchen': details<'home-and-kitchen'>([['material', 'Material'], ['dimensions', 'Dimensions (cm)'], ['capacity', 'Capacity (litres)'], ['care', 'Care instructions']]),
  fashion: details<'fashion'>([['material', 'Material'], ['size', 'Size'], ['fit', 'Fit / carry'], ['care', 'Care instructions']]),
  books: details<'books'>([['author', 'Author'], ['format', 'Format'], ['language', 'Language'], ['genre', 'Genre']]),
  'beauty-and-personal-care': details<'beauty-and-personal-care'>([['volume', 'Pack size (g or ml; not interchangeable)'], ['skinType', 'Skin type'], ['finish', 'Finish'], ['usage', 'Use']]),
  'sports-and-fitness': details<'sports-and-fitness'>([['material', 'Material'], ['size', 'Size / dimensions'], ['weight', 'Weight (g)'], ['activity', 'Activity']]),
}

export function isComparisonCategory(value: string | null): value is ProductCategory {
  return value !== null && Object.prototype.hasOwnProperty.call(comparisonSchemas, value)
}

