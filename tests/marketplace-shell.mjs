// Run with `node tests/marketplace-shell.mjs` against next start on :3012
// and an isolated Chrome CDP session on :9225. Screenshots go to .tmp/module1.
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
  mkdirSync('.tmp/module1', { recursive: true })
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`.tmp/module1/${name}.png`, Buffer.from(result.data, 'base64'))
}

try {
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Network.setCookie', { name: 'parallel-demo-browsing', value: '1', url: origin })
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  for (const width of [320, 375, 540, 768, 900, 1024, 1280, 1440]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 540 })
    for (const path of ['/', '/category/books', '/search?q=wireless', '/product/blue-check-shirt']) {
      await visit(path)
      await layout()
      if ([375, 768, 1440].includes(width)) await screenshot(`${width}-${path === '/' ? 'home' : path.split('/')[1].split('?')[0]}`)
    }
    await click('[aria-label="Orders"]')
    await until("document.activeElement.id === 'orders-title'")
    assert.equal(await evaluate("document.querySelector('[aria-label=Orders]').getAttribute('aria-expanded')"), 'true')
    await layout()
    assert.ok(await evaluate("document.querySelector('#orders-panel').getBoundingClientRect().right <= innerWidth"))
    await key('Tab')
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), 'Close orders')
    await key('Escape')
    await until("document.querySelector('#orders-panel').hidden && document.activeElement.getAttribute('aria-label') === 'Orders'")
    for (const [label, id] of [['Orders', 'orders'], ['Shopping bag', 'cart']]) {
      await click(`[aria-label="${label}"]`)
      await until(`!document.querySelector('#${id}-panel').hidden`)
      await key('Escape')
    }
    if (width <= 1100) {
      await click('.menu-toggle')
      await until("document.querySelector('.category-nav--open') !== null")
      await layout()
      await click('#category-navigation a[href="/category/books"]')
      await until("location.pathname === '/category/books' && !document.querySelector('.category-nav--open')")
      assert.equal(await evaluate("document.querySelector('#category-navigation [aria-current=page]').textContent.trim()"), 'Books')
    }
    console.log(`PASS ${width}px: home, category, search, details; header geometry, panels, keyboard dismissal and navigation`)
  }

  await visit('/')
  await evaluate("document.activeElement.blur()")
  await key('Tab')
  assert.equal(await evaluate("document.activeElement.className"), 'skip-link')
  await key('Enter')
  await until("document.activeElement.id === 'main-content'")
  await evaluate("document.querySelector('[aria-label=Orders]').focus()")
  await key('Enter')
  await until("document.activeElement.id === 'orders-title'")
  await key('Escape')
  assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), 'solid')
  await click('[aria-label="Orders"]')
  await click('.marketplace-hero h1')
  await until("document.querySelector('#orders-panel').hidden")
  await click('.utility-bar a[href="/#deals"]')
  await until("location.hash === '#deals'")
  assert.ok(await evaluate("document.querySelector('#deals').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom"))
  assert.equal(await evaluate("document.querySelectorAll('#deals .product-saving').length"), 3)
  assert.ok(await evaluate("[...document.querySelectorAll('#deals .product-card')].every(card => Number(card.querySelector('del').textContent.replace(/[^0-9.]/g, '')) > Number(card.querySelector('.product-price').textContent.replace(/[^0-9.]/g, '')))"))
  await screenshot('deals-desktop')
  await visit('/')
  await click('.collection-card[href="/search?max=25"]')
  await until("location.pathname === '/search' && new URLSearchParams(location.search).get('max') === '25'")
  assert.ok(await evaluate("[...document.querySelectorAll('.product-price')].every(e => Number(e.textContent.replace(/[^0-9.]/g, '')) <= 25)"))
  await visit('/')
  await click('#site-search')
  await cdp('Input.insertText', { text: 'paperback' })
  await key('Enter')
  await until("location.pathname === '/search' && document.querySelectorAll('.product-card').length === 6")
  console.log('PASS keyboard skip link, focus indicator, outside dismissal, deals anchor, collection prices and header search')
  assert.deepEqual(errors, [], 'Browser console/runtime errors')
} finally {
  socket.close()
}

