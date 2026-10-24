import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

export async function browser() {
  const origin = process.env.SHOPPING_ORIGIN || 'http://localhost:3017'
  const endpoint = process.env.SHOPPING_CDP || 'http://localhost:9231'
  const tabs = await (await fetch(`${endpoint}/json`)).json()
  const socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  let sequence = 0
  const pending = new Map()
  const errors = []
  let handleRequest
  let currentUrl = ''
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Fetch.requestPaused' && handleRequest) {
      void handleRequest(message.params).catch((error) => {
        // Navigation can cancel an intercepted request before its delayed fixture resolves.
        if (!error.message.includes('Invalid InterceptionId')) errors.push(error.message)
      })
      return
    }
    if (message.method === 'Page.frameNavigated') currentUrl = message.params.frame.url
    if (message.method === 'Page.navigatedWithinDocument') currentUrl = message.params.url
    if (message.method === 'Runtime.exceptionThrown') errors.push(`${currentUrl}: ${message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text}`)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '))
    if (!pending.has(message.id)) return
    const { resolve, reject, timer } = pending.get(message.id)
    clearTimeout(timer)
    pending.delete(message.id)
    if (message.error) reject(new Error(JSON.stringify(message.error)))
    else resolve(message.result)
  })
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 25000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  async function until(expression) {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const state = await evaluate("({path:location.pathname, cart:document.querySelector('.cart-count')?.textContent, notice:document.querySelector('.shopping-notice')?.textContent, quantity:document.querySelector('.quantity-control output')?.textContent, focus:document.activeElement?.outerHTML?.slice(0,200)})")
    throw new Error(`Condition not met: ${expression}; ${JSON.stringify(state)}`)
  }
  async function visit(path) {
    await cdp('Page.navigate', { url: origin + path })
    await until(`location.pathname + location.search === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('h1')`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  async function click(selector) {
    await until(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`)
    const point = await evaluate(`(async () => {
      const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('Missing ' + ${JSON.stringify(selector)});
      e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
  }
  async function fill(selector, text) {
    await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.focus(); e.select(); })()`)
    await cdp('Input.insertText', { text })
  }
  async function select(selector, value) {
    await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event('change', {bubbles:true})); })()`)
  }
  async function viewport(width, height = 1000) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 540 })
  }
  async function screenshot(name) {
    await evaluate('window.scrollTo({ top: 0, behavior: "instant" })')
    mkdirSync('.tmp/shopping-ui', { recursive: true })
    const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(`.tmp/shopping-ui/${name}.png`, Buffer.from(result.data, 'base64'))
  }
  async function layout() {
    const metrics = await evaluate(`({width:innerWidth, scroll:document.documentElement.scrollWidth, main:document.querySelectorAll('main').length, broken:[...document.querySelectorAll('img')].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.src)})`)
    assert.ok(metrics.scroll <= metrics.width + 1, JSON.stringify(metrics))
    assert.equal(metrics.main, 1)
    assert.deepEqual(metrics.broken, [], 'No broken images')
  }
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  async function mockApi(handler) {
    handleRequest = async ({ requestId, request }) => {
      const response = await handler(new URL(request.url).pathname, request.method, request.postData ? JSON.parse(request.postData) : undefined)
      await cdp('Fetch.fulfillRequest', { requestId, responseCode: response.status ?? 200, responseHeaders: [{name:'Content-Type', value:'application/json'}], body: Buffer.from(JSON.stringify(response.body)).toString('base64') })
    }
    await cdp('Fetch.enable', { patterns: [{urlPattern: origin + '/api/*'}] })
  }
  return { cdp, evaluate, until, visit, click, fill, select, viewport, screenshot, layout, mockApi, errors, close: () => socket.close() }
}
