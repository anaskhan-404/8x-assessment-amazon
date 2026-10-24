// Run against a production server on :3012 and an isolated Chrome CDP session on :9225.
// Uses Node's built-in WebSocket; no browser-testing dependency is added to the app.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = 'http://localhost:3012'
const tabs = await (await fetch('http://localhost:9225/json')).json()
const socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let sequence = 0
const pending = new Map()
const errors = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((a) => a.value ?? a.description).join(' '))
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timeout } = pending.get(message.id)
    clearTimeout(timeout)
    pending.delete(message.id)
    if (message.error) reject(new Error(JSON.stringify(message.error)))
    else resolve(message.result)
  }
})
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 25000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Condition not met: ${expression}`)
}
async function visit(path) {
  await cdp('Page.navigate', { url: origin + path })
  await until(`location.pathname + location.search === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('h1')`)
}
async function select(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', { bubbles: true })); })()`)
}
async function search(value) {
  await evaluate(`(() => { const input = document.querySelector('#site-search'); input.value = ${JSON.stringify(value)}; input.form.requestSubmit(); })()`)
}
async function noOverflow() {
  const metrics = await evaluate('({ viewport: innerWidth, page: document.documentElement.scrollWidth })')
  assert.ok(metrics.page <= metrics.viewport + 1, JSON.stringify(metrics))
}
async function screenshot(name) {
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const path = join(tmpdir(), `parallel-${name}.png`)
  writeFileSync(path, Buffer.from(result.data, 'base64'))
  console.log(`Screenshot: ${path}`)
}

try {
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Network.setCookie', { name: 'parallel-demo-browsing', value: '1', url: origin })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await visit('/')
  await evaluate("localStorage.clear()")
  assert.equal(await evaluate("document.querySelectorAll('.department-card').length"), 6)
  await noOverflow()
  await screenshot('marketplace-desktop')
  const categories = ['electronics', 'home-and-kitchen', 'fashion', 'books', 'beauty-and-personal-care', 'sports-and-fitness']
  for (const category of categories) {
    await visit(`/category/${category}`)
    assert.equal(await evaluate("document.querySelectorAll('.product-card').length"), category === 'electronics' ? 14 : 6, category)
    await evaluate("document.querySelectorAll('img').forEach(img => img.loading = 'eager')")
    await until("[...document.images].every(img => img.complete && img.naturalWidth > 0)")
    assert.equal(await evaluate("document.querySelectorAll('.button--compare').length"), category === 'electronics' ? 14 : 6)
    await noOverflow()
    console.log(`PASS desktop category: ${category}`)
  }
  await visit('/product/blue-check-shirt')
  assert.ok((await evaluate("document.querySelector('.detail-specs').textContent")).includes('Cotton blend'))
  await noOverflow()
  await visit('/search?q=electronics')
  assert.equal(await evaluate("document.querySelectorAll('.product-card').length"), 14)

  await visit('/search?q=paperback')
  await until("document.querySelector('#site-search')?.value === 'paperback'")
  await select('.catalogue-field select', 'books')
  await until("location.pathname === '/category/books' && document.querySelectorAll('.product-card').length === 6")
  assert.ok((await evaluate('location.search')).includes('q=paperback'))
  await select('.catalogue-field:nth-of-type(2) select', 'Jane Austen')
  await until("document.querySelectorAll('.product-card').length === 1")
  await select('.catalogue-field:nth-of-type(2) select', 'Arthur Conan Doyle')
  await until("document.querySelectorAll('.product-card').length === 2")
  await select('.sort-control select', 'price-high')
  await until("document.querySelector('.product-card__title').textContent.includes('Sherlock')")
  await select('.catalogue-field:last-child select', '4.8')
  await until("new URLSearchParams(location.search).get('rating') === '4.8'")
  await evaluate("document.querySelector('[name=min]').value = '10'; document.querySelector('[name=max]').value = '12'; document.querySelector('.price-filter').requestSubmit()")
  await until("document.querySelectorAll('.product-card').length === 1 && document.querySelector('.product-card__title').textContent.includes('Sherlock')")
  await evaluate("document.querySelector('[aria-label=\"Remove Min: $10.00\"]').click()")
  await until("document.querySelectorAll('.product-card').length === 2")
  await evaluate('history.back()')
  await until("document.querySelectorAll('.product-card').length === 1 && document.querySelector('[name=min]').value === '10'")
  await evaluate('history.forward()')
  await until("document.querySelectorAll('.product-card').length === 2")
  const combinedUrl = await evaluate('location.pathname + location.search')
  await visit(combinedUrl)
  await until("document.querySelector('#site-search')?.value === 'paperback'")
  assert.equal(await evaluate("document.querySelectorAll('.product-card').length"), 2)
  await search('no-matching-book')
  await until("document.querySelector('.empty-state') !== null")
  assert.equal(await evaluate("new URLSearchParams(location.search).getAll('brand').length"), 2)
  assert.equal(await evaluate("document.querySelector('.sort-control select').value"), 'price-high')
  await evaluate("document.querySelector('.empty-state .button').click()")
  await until("document.querySelectorAll('.product-card').length === 6 && document.querySelector('#site-search').value === ''")
  await evaluate("document.querySelector('[name=min]').value = '20'; document.querySelector('[name=max]').value = '10'; document.querySelector('.price-filter').requestSubmit()")
  assert.equal(await evaluate("document.querySelector('[name=max]').validity.customError"), true)
  assert.equal(await evaluate("document.querySelectorAll('.product-card').length"), 6)
  await evaluate("document.querySelector('.active-filters .text-button').click()")
  await until("location.pathname === '/search' && document.querySelectorAll('.product-card').length === 44")
  for (const category of ['headphones', 'keyboards', 'monitors', 'mice', 'accessories']) {
    await select('.catalogue-field select', category)
    await until(`location.pathname === '/category/${category}' && document.querySelector('.catalogue-field select').value === '${category}'`)
    assert.ok(await evaluate("document.querySelectorAll('.product-card').length > 0"))
  }
  await select('.catalogue-field select', '')
  await until("location.pathname === '/search' && document.querySelectorAll('.product-card').length === 44")
  await noOverflow()
  await screenshot('search-desktop')
  console.log('PASS combined search, categories, brand OR, price validation, rating, sorting, chips, reset, refresh and history')

  await visit('/category/headphones')
  await evaluate("document.querySelectorAll('.button--compare')[0].click()")
  await until("document.querySelector('.count-badge')?.textContent === '1'")
  await evaluate("document.querySelectorAll('.button--compare')[1].click()")
  await until("document.querySelector('.count-badge')?.textContent === '2'")
  await select('.catalogue-field:nth-of-type(2) select', 'Sony')
  await until("document.querySelectorAll('.product-card').length === 1")
  assert.equal(await evaluate("document.querySelector('.count-badge').textContent"), '2')
  await select('.sort-control select', 'rating')
  await until("new URLSearchParams(location.search).get('sort') === 'rating'")
  assert.equal(await evaluate("document.querySelector('.count-badge').textContent"), '2')
  await visit('/category/books')
  await until("document.querySelector('.count-badge')?.textContent === '2'")
  assert.equal(await evaluate("document.querySelector('.count-badge').textContent"), '2')
  await visit('/compare')
  await until("document.querySelectorAll('.compare-product-header').length === 2")
  await noOverflow()
  await screenshot('comparison-desktop')
  await visit('/category/headphones')
  await evaluate("document.querySelectorAll('.button--compare')[2].click()")
  await until("document.querySelector('.count-badge')?.textContent === '3'")
  await evaluate("document.querySelectorAll('.button--compare')[3].click()")
  await until("document.querySelector('.count-badge')?.textContent === '4'")
  assert.equal(await evaluate("document.querySelectorAll('.button--compare:disabled').length"), 2)
  await evaluate("localStorage.setItem('parallel:comparison:v1', JSON.stringify(['sony-wh1000xm5','basketball','sony-wh1000xm5','bose-qc-ultra']))")
  await visit('/compare')
  await until("document.querySelectorAll('.compare-product-header').length === 2")
  assert.equal(await evaluate("document.querySelector('.count-badge').textContent"), '3')
  console.log('PASS comparison: selection, refresh, cross-category navigation, per-category cap, stored-data sanitization')

  await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
  await visit('/search?q=paperback&min=8&max=15&rating=4.5&sort=price-low')
  await until("document.querySelector('#site-search')?.value === 'paperback'")
  await noOverflow()
  await select('.catalogue-field select', 'books')
  await until("location.pathname === '/category/books'")
  await select('.catalogue-field:nth-of-type(2) select', 'Jane Austen')
  await until("document.querySelectorAll('.product-card').length === 1")
  await evaluate("document.querySelector('[aria-label=\"Remove Brand: Jane Austen\"]').click()")
  await until("document.querySelectorAll('.product-card').length === 6")
  await evaluate("document.querySelector('.catalogue-toolbar').scrollIntoView()")
  await noOverflow()
  await screenshot('search-mobile')
  console.log('PASS mobile search controls and filter removal')
  for (const path of ['/', ...categories.map((category) => `/category/${category}`), '/product/blue-check-shirt', '/compare']) {
    await visit(path)
    await noOverflow()
    if (path === '/') await screenshot('marketplace-mobile')
    if (path === '/category/home-and-kitchen') await screenshot('kitchen-mobile')
    if (path === '/compare') await screenshot('comparison-mobile')
    console.log(`PASS mobile layout: ${path}`)
  }
  await evaluate("document.querySelector('.mobile-product-pair article > button').click()")
  await until("document.querySelector('.comparison-singleton') !== null")
  assert.equal(await evaluate("document.querySelector('.count-badge').textContent"), '2')
  await visit('/')
  await evaluate("document.querySelector('.menu-toggle').click()")
  await until("document.querySelector('.category-nav--open') !== null")
  await evaluate("document.querySelector('#category-navigation a[href=\"/category/books\"]').click()")
  await until("location.pathname === '/category/books' && !document.querySelector('.category-nav--open')")
  console.log('PASS mobile menu navigation and comparison removal')
  assert.deepEqual(errors, [], 'Browser console/runtime errors')
  await evaluate("document.querySelector('.product-card img').dispatchEvent(new Event('error'))")
  await until("document.querySelector('.product-card img').src.includes('product-unavailable.svg')")
  console.log('PASS image fallback')
} finally {
  socket.close()
}
