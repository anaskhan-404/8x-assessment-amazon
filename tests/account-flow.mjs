// Run against `next start -p 3017` and isolated Chrome CDP on :9231.
// Override ACCOUNT_ORIGIN / ACCOUNT_CDP if needed. Screenshots: .tmp/account-ui.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

const origin = process.env.ACCOUNT_ORIGIN || 'http://localhost:3017'
const endpoint = process.env.ACCOUNT_CDP || 'http://localhost:9231'
const tabs = await (await fetch(`${endpoint}/json`)).json()
const socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let sequence = 0
const pending = new Map()
const errors = []
const requests = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value || arg.description).join(' '))
  if (message.method === 'Network.requestWillBeSent') requests.push(JSON.stringify(message.params.request))
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 20000)
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
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Condition not met: ${expression}`)
}
async function visit(path, expected = path) {
  await cdp('Page.navigate', { url: origin + path })
  await until(`location.pathname + location.search === ${JSON.stringify(expected)} && document.readyState === 'complete' && !!document.querySelector('h1')`)
  await new Promise((resolve) => setTimeout(resolve, 250))
}
async function click(selector) {
  const point = await evaluate(`(() => {
    const e = document.querySelector(${JSON.stringify(selector)});
    e.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}
async function fill(name, value) {
  await evaluate(`(() => { const e = document.querySelector('[name="${name}"]'); e.focus(); e.select(); })()`)
  await cdp('Input.insertText', { text: value })
}
async function viewport(width, height = 900) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 540 })
}
async function screenshot(name) {
  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })')
  mkdirSync('.tmp/account-ui', { recursive: true })
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(`.tmp/account-ui/${name}.png`, Buffer.from(result.data, 'base64'))
}
async function layout() {
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No horizontal overflow')
  assert.equal(await evaluate("document.querySelectorAll('main').length"), 1)
  assert.equal(await evaluate("!!document.querySelector('.site-header, .site-footer, .compare-tray')"), false)
  assert.ok(await evaluate("[...document.querySelectorAll('.account-input-wrap input, .account-button')].every(e => e.getBoundingClientRect().height >= 44)"))
}

try {
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Network.enable')
  await cdp('Network.clearBrowserCookies')
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const initial = await fetch(origin, { redirect: 'manual' })
  assert.equal(initial.status, 307)
  assert.equal(new URL(initial.headers.get('location'), origin).pathname, '/account')
  await viewport(1440)
  await visit('/', '/account')
  await layout()
  await screenshot('sign-in-desktop')
  await click('button[type=submit]')
  await until("document.querySelectorAll('[aria-invalid=true]').length === 2")
  assert.equal(await evaluate('document.activeElement.name'), 'contact')
  await fill('contact', 'invalid-email')
  await click('button[type=submit]')
  assert.ok(await evaluate("document.querySelector('#account-contact-error').textContent.includes('valid email')"))
  await fill('contact', 'account-probe@example.com')
  await fill('password', 'account-probe-password')
  await click('[aria-label="Show password"]')
  assert.equal(await evaluate("document.querySelector('[name=password]').type"), 'text')
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Hide password\"]').getAttribute('aria-pressed')"), 'true')
  await click('[aria-label="Hide password"]')
  assert.equal(await evaluate("document.querySelector('[name=password]').type"), 'password')
  await click('.account-help summary')
  await click('.account-demo-option input')
  await click('button[type=submit]')
  await until("document.querySelector('button[type=submit]').disabled")
  assert.ok(await evaluate("document.querySelector('[name=password]').disabled && document.querySelector('.account-visibility').disabled"))
  await until("!!document.querySelector('.account-status--error')")
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), false)
  await screenshot('sign-in-error-desktop')
  await click('button[type=submit]')
  await until("!!document.querySelector('.account-status--success')")
  assert.equal(await evaluate("document.querySelector('[name=password]').value"), '')
  await until("location.pathname === '/' && !!document.querySelector('.site-header')")
  assert.ok(await evaluate("document.cookie.includes('parallel-demo-browsing=1')"))
  await visit('/')
  await until("!!document.querySelector('.site-header')")
  await click('[aria-label=Account]')
  await until("location.pathname === '/account' && !!document.querySelector('.account-form')")
  await layout()
  console.log('PASS initial entry, sign-in validation, visibility, loading, simulated error/retry, success, homepage, account return')

  await click('.account-secondary a')
  await until("location.pathname === '/account/create'")
  await viewport(375, 812)
  await layout()
  await screenshot('sign-up-mobile')
  await click('button[type=submit]')
  await until("document.querySelectorAll('[aria-invalid=true]').length === 4")
  assert.equal(await evaluate('document.activeElement.name'), 'name')
  await fill('name', 'Demo Shopper')
  await fill('contact', '+1 (202) 555-0147')
  await fill('password', 'abc')
  await fill('confirm', 'different')
  await click('button[type=submit]')
  assert.ok(await evaluate("document.querySelector('#account-password-error').textContent.includes('6 characters')"))
  assert.ok(await evaluate("document.querySelector('#account-confirm-error').textContent.includes('do not match')"))
  await screenshot('sign-up-validation-mobile')
  await fill('password', 'account-probe-password')
  await fill('confirm', 'account-probe-password')
  await click('[aria-label="Show re-enter password"]')
  assert.equal(await evaluate("document.querySelector('[name=confirm]').type"), 'text')
  await click('button[type=submit]')
  await until("!!document.querySelector('.account-status--success')")
  await until("location.pathname === '/' && !!document.querySelector('.site-header')")
  console.log('PASS sign-up name, phone, password length, confirmation, visibility and success')

  for (const width of [320, 375, 768, 1440]) {
    await viewport(width, width < 540 ? 812 : 900)
    for (const path of ['/account', '/account/create']) {
      await visit(path)
      await layout()
      if ([375, 1440].includes(width)) await screenshot(`${path.endsWith('create') ? 'sign-up' : 'sign-in'}-${width}`)
    }
  }
  await visit('/account')
  await evaluate("document.querySelector('#account-contact').focus()")
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert.equal(await evaluate('document.activeElement.name'), 'password')
  assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), 'solid')
  await screenshot('keyboard-focus-desktop')
  for (const topic of ['terms', 'privacy', 'help']) {
    await visit(`/account/${topic}`)
    await layout()
    assert.ok(await evaluate("document.querySelector('.account-information').textContent.length > 100"))
  }
  await cdp('Network.clearBrowserCookies')
  await visit('/account')
  await click('.account-guest')
  await until("location.pathname === '/' && !!document.querySelector('.site-header')")
  await visit('/category/books')
  assert.ok(await evaluate("!!document.querySelector('.site-header')"))
  const storage = await evaluate('JSON.stringify({local: {...localStorage}, session: {...sessionStorage}, cookies: document.cookie})')
  assert.ok(!storage.includes('account-probe'), 'No form credentials in browser storage')
  assert.ok(!requests.some((request) => request.includes('account-probe')), 'No form credentials sent over network')
  assert.deepEqual(errors, [], 'No browser runtime or console errors')
  console.log('PASS 320/375/768/1440 layouts, keyboard focus, footer pages, guest browsing, catalogue route, no credential transmission/storage, no browser errors')
} finally {
  socket.close()
}
