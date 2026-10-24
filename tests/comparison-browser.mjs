// Run with `node tests/marketplace-shell.mjs` against next start on :3012
// and an isolated Chrome CDP session on :9225. Screenshots go to .tmp/comparison.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

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
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '))
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
  await until(`location.pathname + location.search === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('h1') && !!document.documentElement.style.getPropertyValue('--header-offset')`)
}
async function key(key, code = key, virtualKey = key === 'Enter' ? 13 : key === 'Escape' ? 27 : 9) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey, ...(key === 'Enter' ? { text: '\r' } : {}) })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey })
}
async function click(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const r = element.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}
async function layout() {
  await until("Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) - document.querySelector('.site-header').getBoundingClientRect().height) < 1")
  const metrics = await evaluate(`(() => {
    const controls = [...document.querySelectorAll('.header-main > .brand, .header-search, .header-action, .menu-toggle')]
      .map(e => ({ name: e.getAttribute('aria-label') || e.className, r: e.getBoundingClientRect() })).filter(({ r }) => r.width && r.height);
    const overlaps = controls.flatMap((a, i) => controls.slice(i + 1).filter(b => a.r.left < b.r.right - 1 && a.r.right > b.r.left + 1 && a.r.top < b.r.bottom - 1 && a.r.bottom > b.r.top + 1).map(b => a.name + ' / ' + b.name));
    return { viewport: innerWidth, page: document.documentElement.scrollWidth, overlaps,
      outside: controls.filter(({ r }) => r.left < 0 || r.right > innerWidth).map(({ name }) => name),
      offset: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')),
      header: document.querySelector('.site-header').getBoundingClientRect().height };
  })()`)
  assert.ok(metrics.page <= metrics.viewport + 1, JSON.stringify(metrics))
  assert.deepEqual(metrics.overlaps, [], JSON.stringify(metrics))
  assert.deepEqual(metrics.outside, [], JSON.stringify(metrics))
  assert.ok(Math.abs(metrics.offset - metrics.header) < 1, JSON.stringify(metrics))
}
async function screenshot(name) {
  mkdirSync('.tmp/comparison', { recursive: true })
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`.tmp/comparison/${name}.png`, Buffer.from(result.data, 'base64'))
}

async function count(expected) {
  await until(`(document.querySelector('.count-badge')?.textContent ?? '0') === '${expected}'`)
}
async function addCard(index) {
  await click(`.product-card:nth-child(${index + 1}) .button--compare`)
}
const categories = [
  ['headphones', 'Battery life'],
  ['keyboards', 'Switches'],
  ['monitors', 'Resolution'],
  ['mice', 'Sensor'],
  ['accessories', 'Power delivery'],
  ['home-and-kitchen', 'Material'],
  ['fashion', 'Fit / carry'],
  ['books', 'Author'],
  ['beauty-and-personal-care', 'Skin type'],
  ['sports-and-fitness', 'Activity'],
]
try {
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Network.setCookie', { name: 'parallel-demo-browsing', value: '1', url: origin })
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await visit('/')
  await evaluate("localStorage.removeItem('parallel:comparison:v1')")
  await visit('/')
  await addCard(0)
  await count(1)
  assert.equal(await evaluate("document.querySelector('.global-compare-tray__single .comparison-selection-item strong').textContent"), 'WH-1000XM5')
  await visit('/product/bose-quietcomfort-ultra')
  await click('.purchase-panel .button--outline')
  await count(2)
  await visit('/search?q=paperback')
  await addCard(0)
  await count(3)
  await addCard(1)
  await count(4)
  assert.equal(await evaluate("document.querySelectorAll('.tray-category-group').length"), 2)
  await screenshot('mixed-tray-desktop')
  await visit('/product/pride-and-prejudice')
  assert.equal(await evaluate("document.querySelector('.purchase-panel .button--outline').getAttribute('aria-pressed')"), 'true')
  await count(4)
  await visit('/')
  await count(4)
  console.log('PASS add from homepage, search and details; grouped tray; duplicate state; refresh persistence')

  let selected = 4
  for (const [category] of categories.filter(([category]) => !['headphones', 'books'].includes(category))) {
    await visit(`/category/${category}`)
    await addCard(0)
    await count(++selected)
    await addCard(1)
    await count(++selected)
  }
  assert.equal(selected, 20)
  assert.ok(await evaluate("document.querySelector('.global-compare-tray__scroll').scrollWidth > document.querySelector('.global-compare-tray__scroll').clientWidth"))
  await visit('/category/books')
  await count(20)
  assert.ok(await evaluate("document.querySelector('.product-card:nth-child(3) .button--compare').disabled"))
  assert.ok(await evaluate("document.querySelector('.product-card:nth-child(3) .comparison-limit-note').textContent.includes('20')"))
  await click('.global-compare-tray__bar > a')
  await until("location.pathname === '/compare' && document.querySelectorAll('.comparison-category-nav a').length === 10")
  assert.equal(await evaluate("!!document.querySelector('.global-compare-tray')"), false)
  for (const [category, label] of categories) {
    await click(`.comparison-category-nav a[href='/compare?category=${category}']`)
    await until(`document.querySelector('[data-comparison-category]')?.dataset.comparisonCategory === '${category}'`)
    assert.equal(await evaluate("document.querySelectorAll('.compare-product-header').length"), 2)
    assert.ok((await evaluate("document.querySelector('.comparison-table').textContent")).includes(label), category)
    if (category !== 'headphones') assert.ok(!(await evaluate("document.querySelector('.comparison-table').textContent")).includes('Noise cancellation'), category)
    await layout()
  }
  await visit('/compare?category=books')
  await until("document.querySelector('[data-comparison-category]')?.dataset.comparisonCategory === 'books'")
  await screenshot('workspace-books-desktop')
  await click('.switch-control input')
  assert.equal(await evaluate("document.querySelector('.comparison-table').textContent.includes('English')"), false)
  await click('.compare-product-header__remove')
  await count(19)
  assert.ok(await evaluate("!!document.querySelector('.comparison-singleton')"))
  await click('.comparison-group-toolbar .text-button')
  await count(18)
  assert.equal(await evaluate("document.querySelectorAll('.comparison-category-nav a').length"), 9)
  console.log('PASS all ten category schemas, compatible tables, workspace switching/refresh, differences filter, item and group removal, total limit')

  await click('.comparison-workspace__heading > button')
  await count(0)
  await until("!!document.querySelector('.compare-empty')")
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('parallel:comparison:v1'))"), [])
  await visit('/category/headphones')
  for (let i = 0; i < 4; i++) { await addCard(i); await count(i + 1) }
  assert.equal(await evaluate("document.querySelectorAll('.button--compare:disabled').length"), 2)
  await visit('/category/books')
  await addCard(0)
  await count(5)
  await evaluate("localStorage.setItem('parallel:comparison:v1', JSON.stringify(['missing', 42, ...JSON.parse(localStorage.getItem('parallel:comparison:v1')), 'sony-wh1000xm5']))")
  await visit('/compare?category=headphones')
  await count(5)
  assert.equal(await evaluate("document.querySelectorAll('.compare-product-header').length"), 4)
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('parallel:comparison:v1')).length"), 5)
  await screenshot('workspace-headphones-desktop')
  console.log('PASS clear all, four-per-category limit, other category remains eligible, invalid/duplicate stored IDs repaired, headphone comparison retained')

  for (const width of [320, 375, 768]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 540 })
    await visit('/category/books')
    await count(5)
    await layout()
    assert.equal(await evaluate("document.querySelector('.global-compare-tray__toggle').getAttribute('aria-expanded')"), 'false')
    assert.ok(await evaluate("document.querySelector('.global-compare-tray').getBoundingClientRect().height < 100"))
    await click('.global-compare-tray__toggle')
    await until("!document.querySelector('#global-tray-selections').hidden")
    await layout()
    assert.ok(await evaluate("document.querySelector('.global-compare-tray').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom"))
    if (width === 375) await screenshot('mixed-tray-mobile')
    await key('Escape')
    await until("document.querySelector('#global-tray-selections').hidden")
    await click('.global-compare-tray__bar > a')
    await until("location.pathname === '/compare'")
    await layout()
    assert.equal(await evaluate("document.querySelectorAll('.mobile-product-pair article').length"), 2)
    await evaluate("document.querySelector('#right-product').value = 'apple-airpods-max'; document.querySelector('#right-product').dispatchEvent(new Event('change', { bubbles: true }))")
    await until("document.querySelector('.mobile-product-pair').textContent.includes('AirPods')")
    if (width === 375) await screenshot('workspace-mobile')
    console.log(`PASS ${width}px: collapsed tray, expansion, Escape, workspace, pair selection and no document overflow`)
  }
  await click('.mobile-product-pair article > button')
  await count(4)
  await visit('/category/books')
  await click('.global-compare-tray__toggle')
  await click('.global-compare-tray__footer .text-button')
  await count(0)
  await until("!document.querySelector('.global-compare-tray')")
  await visit('/compare?category=not-a-category')
  await until("!!document.querySelector('.compare-empty')")
  console.log('PASS mobile remove, clear tray, empty state and invalid category URL')
  assert.deepEqual(errors, [], 'Browser runtime/console errors')
} finally { socket.close() }

