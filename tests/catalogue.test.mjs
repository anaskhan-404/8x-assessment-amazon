import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

// Compile the pure catalogue modules using the project's existing TypeScript dependency.
const output = mkdtempSync(join(tmpdir(), 'parallel-catalogue-test-'))
const program = ts.createProgram(['src/data.ts', 'src/comparison-selection.ts', 'src/product-specifications.ts', 'src/catalogue-query.ts'], {
  outDir: output, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10, skipLibCheck: true, strict: true,
})
const diagnostics = ts.getPreEmitDiagnostics(program)
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: (name) => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}))
program.emit()
const require = createRequire(import.meta.url)
const { products, departments, categories, categoryProducts, categoryBySlug, getSpec } = require(join(output, 'data.js'))
const { sanitizeComparisonIds, parseComparisonIds, addComparisonId } = require(join(output, 'comparison-selection.js'))
const { productSpecifications } = require(join(output, 'product-specifications.js'))
const { parseCatalogueQuery, catalogueParams, catalogueHref, queryProducts } = require(join(output, 'catalogue-query.js'))
const { groupComparisonProducts, compatibleProducts, comparisonSpecs, specIsDifferent, bestProductFor } = require(join(output, 'comparison-engine.js'))
const { MAX_COMPARISON_ITEMS, MAX_COMPARISON_PER_CATEGORY, comparisonLimitReason } = require(join(output, 'comparison-selection.js'))
// Only remove the exact compiler-owned temporary directory, never a workspace path.
rmSync(output, { recursive: true })

test('six populated departments preserve all existing electronics routes', () => {
  assert.equal(departments.length, 6)
  assert.equal(products.length, 44)
  for (const department of departments) assert.ok(categoryProducts(department.slug).length >= 6, department.slug)
  assert.equal(categoryProducts('electronics').length, 14)
  assert.equal(categoryProducts('headphones').length, 6)
  for (const category of categories) assert.ok(categoryProducts(category.slug).length > 0, category.slug)
  assert.deepEqual(categoryProducts('not-a-category'), [])
})

test('every product has unique identity, valid merchandising data and structured specs', () => {
  assert.equal(new Set(products.map((p) => p.id)).size, products.length)
  assert.equal(new Set(products.map((p) => p.slug)).size, products.length)
  for (const product of products) {
    assert.ok(categoryBySlug(product.category), product.id)
    assert.ok(product.name && product.brand && product.description && product.highlights.length >= 3, product.id)
    assert.ok(Number.isFinite(product.price) && product.price > 0, product.id)
    assert.ok(product.rating > 0 && product.rating <= 5, product.id)
    assert.ok(Number.isInteger(product.reviewCount) && product.reviewCount > 0, product.id)
    assert.ok(productSpecifications(product).length >= 4, product.id)
    for (const value of Object.values(product.specs)) {
      if (value === null) continue
      assert.ok(value.display)
      assert.ok(['string', 'number', 'boolean'].includes(typeof value.comparable))
    }
  }
})

test('all catalogue, category and fallback images exist locally with valid file signatures', () => {
  const images = new Set([...products, ...categories].map((entry) => entry.image))
  images.add('/images/product-unavailable.svg')
  for (const image of images) {
    assert.ok(image.startsWith('/images/'), image)
    const file = resolve('public', image.slice(1))
    assert.ok(existsSync(file), image)
    const content = readFileSync(file)
    assert.ok(content.length > 100, image)
    if (image.endsWith('.webp')) assert.equal(content.toString('ascii', 8, 12), 'WEBP', image)
    if (image.endsWith('.jpg')) assert.equal(content.readUInt16BE(0), 0xffd8, image)
  }
})

test('comparison retains valid categories and sanitizes corrupt, stale and duplicate selections', () => {
  assert.deepEqual(parseComparisonIds('not json'), [])
  assert.deepEqual(parseComparisonIds('{"id":"sony-wh1000xm5"}'), [])
  assert.deepEqual(sanitizeComparisonIds(['sony-wh1000xm5', 'sony-wh1000xm5', 'basketball', 'keychron-q1-max', 'missing', 4, null, 'bose-qc-ultra']), ['sony-wh1000xm5', 'basketball', 'keychron-q1-max', 'bose-qc-ultra'])
  const ids = categoryProducts('headphones').map((product) => product.id)
  assert.equal(sanitizeComparisonIds(ids).length, 4)
  assert.deepEqual(parseComparisonIds(JSON.stringify(ids.slice(0, 3))), ids.slice(0, 3))
})

test('comparison enforces four per category and twenty overall at the mutation boundary', () => {
  const ids = categoryProducts('headphones').map((product) => product.id)
  assert.deepEqual(addComparisonId([], 'basketball'), ['basketball'])
  assert.deepEqual(addComparisonId([], 'missing'), [])
  assert.deepEqual(addComparisonId(ids.slice(0, 4), ids[4]), ids.slice(0, 4))
  assert.deepEqual(addComparisonId([ids[0]], ids[0]), [ids[0]])
  assert.deepEqual(addComparisonId([ids[0]], ids[1]), ids.slice(0, 2))
  assert.equal(getSpec(products.find((p) => p.id === 'basketball'), 'battery'), null)
  assert.equal(getSpec(products.find((p) => p.id === ids[0]), 'battery').comparable, 30)
  const full = sanitizeComparisonIds(products.map((product) => product.id))
  assert.equal(full.length, MAX_COMPARISON_ITEMS)
  for (const group of groupComparisonProducts(full.map((id) => products.find((p) => p.id === id)))) assert.ok(group.products.length <= MAX_COMPARISON_PER_CATEGORY)
  const extra = products.find((p) => !full.includes(p.id))
  assert.deepEqual(addComparisonId(full, extra.id), full)
  assert.ok(comparisonLimitReason(full, extra.id).includes('20'))
  assert.equal(comparisonLimitReason(full, full[0]), null)
  assert.deepEqual(addComparisonId(ids.slice(0, 4), 'basketball'), [...ids.slice(0, 4), 'basketball'])
})

test('every category uses its schema and mixed selections never form one table', () => {
  const groups = groupComparisonProducts(products)
  assert.equal(groups.length, 10)
  for (const group of groups) {
    const specs = comparisonSpecs(group.category)
    assert.ok(specs.length >= 4)
    assert.equal(new Set(specs.map((spec) => spec.key)).size, specs.length)
    assert.deepEqual(compatibleProducts(products, group.category), group.products)
    assert.ok(group.products.every((product) => product.category === group.category))
    assert.ok(specs.every((spec) => group.products.some((product) => Object.hasOwn(product.specs, spec.key))))
  }
  assert.deepEqual(comparisonSpecs('books').map((spec) => spec.key), ['author', 'format', 'language', 'genre'])
  assert.equal(groupComparisonProducts([products[0], products[0]]).flatMap((g) => g.products).length, 1)
})

test('differences distinguish unknowns and units; standouts require compatible complete measurements', () => {
  const sony = products.find((p) => p.id === 'sony-wh1000xm5')
  const bose = products.find((p) => p.id === 'bose-qc-ultra')
  const weight = comparisonSpecs('headphones').find((spec) => spec.key === 'weight')
  assert.equal(bestProductFor(weight, [sony, bose]), sony.id)
  const missing = { ...bose, specs: { ...bose.specs, weight: null } }
  assert.equal(specIsDifferent(weight, [sony, missing]), true)
  assert.equal(bestProductFor(weight, [sony, missing]), null)
  assert.equal(specIsDifferent(weight, [missing, missing]), false)
  const tied = { ...bose, specs: { ...bose.specs, weight: sony.specs.weight } }
  assert.equal(bestProductFor(weight, [sony, tied]), null)
  const differentBasis = { ...bose, specs: { ...bose.specs, weight: { ...bose.specs.weight, basis: 'with case' } } }
  assert.equal(bestProductFor(weight, [sony, differentBasis]), null)
  assert.equal(bestProductFor(weight, [sony, products.find((p) => p.id === 'basketball')]), null)
  const size = comparisonSpecs('beauty-and-personal-care').find((spec) => spec.key === 'volume')
  const lipstick = products.find((p) => p.id === 'red-lipstick')
  const liquid = { ...lipstick, id: 'liquid', specs: { ...lipstick.specs, volume: { ...lipstick.specs.volume, unit: 'ml' } } }
  assert.equal(specIsDifferent(size, [lipstick, liquid]), true)
  assert.equal(bestProductFor({ ...size, higherIsBetter: true }, [lipstick, liquid]), null)
  const battery = comparisonSpecs('headphones').find((spec) => spec.key === 'battery')
  assert.equal(bestProductFor(battery, [sony, bose]), null, 'Battery claims with differing test conditions are not ranked')
})

const query = (params = '') => parseCatalogueQuery(new URLSearchParams(params))
const find = (params, category) => queryProducts(products, query(params), category)

test('search matches names, brands, categories, highlights and specifications across departments', () => {
  assert.equal(find('q=  SONY   wh1000xm5  ')[0].id, 'sony-wh1000xm5')
  assert.equal(find('q=electronics').length, 14)
  assert.equal(find('q=Jane Austen paperback')[0].id, 'pride-and-prejudice')
  assert.ok(find('q=cotton machine wash', 'fashion').some((p) => p.id === 'blue-check-shirt'))
  assert.ok(find('q=LDAC').some((p) => p.id === 'sony-wh1000xm5'))
  assert.ok(find('q=dishwasher safe', 'home-and-kitchen').some((p) => p.id === 'fine-mesh-strainer'))
  assert.deepEqual(find('q=nonexistent-product'), [])
  assert.deepEqual(find('q=!!!'), [])
  assert.equal(find('q=  ').length, products.length)
})

test('every category is scoped correctly and composes with query, brand, price, rating and sorting', () => {
  for (const category of categories) {
    assert.deepEqual(find('', category.slug), categoryProducts(category.slug))
  }
  assert.deepEqual(find('q=paperback&brand=Jane+Austen&brand=Arthur+Conan+Doyle&min=9.99&max=11.99&rating=4.8&sort=price-high', 'books').map((p) => p.id), ['sherlock-holmes', 'pride-and-prejudice'])
  assert.deepEqual(find('q=paperback&brand=Sony', 'books'), [])
  assert.deepEqual(find('min=50&max=10'), [])
  assert.deepEqual(find('max=0'), [])
  assert.equal(find('min=9.99&max=9.99', 'books')[0].id, 'pride-and-prejudice')
})

test('all sort modes preserve filters, stable ties and source catalogue order', () => {
  const original = products.map((p) => p.id)
  for (const [sort, direction, property] of [['price-low', 1, 'price'], ['price-high', -1, 'price'], ['rating', -1, 'rating']]) {
    const result = find(`q=paperback&rating=4.7&sort=${sort}`, 'books')
    assert.equal(result.length, 4)
    for (let i = 1; i < result.length; i++) assert.ok((result[i][property] - result[i - 1][property]) * direction >= 0)
  }
  assert.deepEqual(products.map((p) => p.id), original)
  assert.deepEqual(find('sort=relevance'), products)
  // A direct brand match outranks a mention only in another product's description.
  const sample = products.find((p) => p.id === 'sony-wh1000xm5')
  const mention = { ...sample, id: 'mention', brand: 'Other', name: 'Other model', description: 'An alternative to Sony.' }
  assert.deepEqual(queryProducts([mention, sample], query('q=sony')).map((p) => p.id), [sample.id, mention.id])
})

test('headphone quick filters combine with each other and standard constraints', () => {
  // Eligible models cost $349.95 and $349.99; a $349 maximum excludes both.
  const result = find('feature=battery-40&feature=under-350&max=349.99&rating=4.5&sort=price-low', 'headphones')
  assert.deepEqual(result.map((product) => product.id), ['sennheiser-momentum-4', 'beats-studio-pro'])
  assert.deepEqual(find('feature=battery-40&feature=under-350&max=349&rating=4.5', 'headphones'), [])
  for (const product of result) {
    assert.ok(product.specs.battery.comparable >= 40)
    assert.ok(product.price < 350 && product.rating >= 4.5)
  }
  assert.deepEqual(find('feature=adaptive-anc', 'books'), [])
  assert.ok(find('feature=adaptive-anc', 'headphones').every((p) => String(p.specs.noiseCancellation.comparable).includes('adaptive')))
})

test('URL state round-trips special characters and safely handles malformed parameters', () => {
  const state = query('q=rock+%26+roll&brand=Jane+Austen&brand=Sony&min=0&max=399.99&rating=4.8&sort=price-high&feature=adaptive-anc')
  assert.deepEqual(parseCatalogueQuery(catalogueParams(state)), state)
  assert.ok(catalogueHref('books', state).startsWith('/category/books?q=rock+%26+roll'))
  assert.equal(catalogueHref(undefined, query()), '/search')
  assert.deepEqual(query('min=-1&max=Infinity&rating=6&sort=bad&feature=bad'), query())
  assert.deepEqual(query('brand=Sony&brand=Sony&brand=').brands, ['Sony'])
})
