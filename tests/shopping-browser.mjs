// Run: node --import tsx tests/shopping-browser.mjs
// Production server :3017, isolated Chrome CDP :9231.
// API responses below are explicit browser-test fixtures; no live orders/payments occur.
import assert from 'node:assert/strict'
import { products } from '../src/data.ts'
import { browser } from './ui-browser-helpers.mjs'

const b = await browser()
const { cdp, evaluate, until, visit, click, fill, select, viewport, screenshot, layout, errors, close } = b
const cart = new Map()
const saved = new Set()
let signedIn = true
let failRead = false
let failWrite = false
let checkoutRequests = 0
function cartResponse() {
  const items = [...cart].map(([id, quantity]) => {
    const p = products.find((product) => product.id === id)
    return {productId:id, name:p.name, slug:p.slug, image:p.image, quantity, unitPriceCents:Math.round(p.price*100), available:true}
  })
  return {items, currency:'usd', totalCents:items.reduce((sum,item)=>sum+item.unitPriceCents*item.quantity,0)}
}
await b.mockApi(async (path, method, body) => {
  await new Promise(resolve => setTimeout(resolve, path === '/api/checkout' ? 500 : 100))
  if (path === '/api/auth/get-session') return {body:signedIn ? {user:{id:'ui-fixture-user'}} : null}
  if (path === '/api/checkout') { checkoutRequests++; return {status:503,body:{error:'Checkout service unavailable. Please try again.'}} }
  if (path === '/api/cart' || path === '/api/cart/merge') {
    if (failRead && method === 'GET') return {status:503,body:{error:'Cart service unavailable. Please try again.'}}
    if (method !== 'GET' && path !== '/api/cart/merge' && failWrite) { failWrite=false; return {status:503,body:{error:'The update could not be saved. Please try again.'}} }
    if (path === '/api/cart' && method !== 'GET') {
      assert.ok(products.some(p=>p.id===body.productId))
      if (method === 'DELETE') cart.delete(body.productId)
      else {
        assert.deepEqual(Object.keys(body).sort(), ['productId','quantity'])
        cart.set(body.productId, method === 'POST' ? (cart.get(body.productId)||0)+body.quantity : body.quantity)
      }
    }
    return {body:cartResponse()}
  }
  if (path === '/api/wishlist') {
    if (!signedIn) return {status:401,body:{error:'Please sign in to save favourites.'}}
    if (method === 'POST') saved.add(body.productId)
    if (method === 'DELETE') saved.delete(body.productId)
    return {body:{items:[...saved].map(id=>{const p=products.find(p=>p.id===id);return {productId:id,name:p.name,slug:p.slug,image:p.image,price:String(p.price),available:true}})}}
  }
  return {status:404,body:{error:'No test fixture for this endpoint'}}
})
try {
  await viewport(1440)
  await visit('/?browse=1')
  await evaluate("localStorage.removeItem('parallel:comparison:v1')")
  await visit('/?browse=1')
  await until("document.querySelector('.cart-count').textContent === '0'")
  await layout()
  await screenshot('homepage-desktop')
  assert.equal(await evaluate("document.querySelectorAll('.department-card').length"), 6)
  await fill('#site-search', 'paperback')
  await select('#search-department', 'books')
  await click('.header-search button')
  await until("location.pathname === '/category/books' && document.querySelectorAll('.product-card').length === 6")
  await select('.catalogue-field:nth-of-type(2) select', 'Jane Austen')
  await until("document.querySelectorAll('.product-card').length === 1")
  await select('.sort-control select', 'price-high')
  await until("location.search.includes('sort=price-high')")
  await click('[aria-label="Remove Brand: Jane Austen"]')
  await until("document.querySelectorAll('.product-card').length === 6")
  await fill('[name=min]', '10')
  await fill('[name=max]', '15')
  await click('.price-filter button')
  await until("location.search.includes('min=10')")
  await layout()
  await screenshot('category-desktop')
  await fill('#site-search', 'zzzz-no-such-product')
  await click('.header-search button')
  await until("!!document.querySelector('.empty-state')")
  await click('.empty-state button')
  await until("document.querySelectorAll('.product-card').length === 6")
  console.log('PASS search department, filters, sorting, empty results and reset')

  await visit('/product/carbon-steel-wok')
  await until("document.querySelector('.cart-count').textContent === '0'")
  await layout()
  await screenshot('product-desktop')
  await click('.product-gallery__main')
  await until("document.querySelector('dialog').open")
  await screenshot('gallery-enlarged')
  await cdp('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await cdp('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await until("!document.querySelector('dialog').open")
  assert.equal(await evaluate('document.activeElement.className'), 'product-gallery__main')
  await click('.purchase-quantity button:last-child')
  await click('.purchase-panel .shop-primary')
  await until("document.querySelector('.cart-count').textContent === '2'")
  assert.equal(cart.get('carbon-steel-wok'), 2)
  await click('.purchase-panel > button:last-of-type')
  await until("document.querySelector('.purchase-panel > button:last-of-type').getAttribute('aria-pressed') === 'true'")
  assert.ok(saved.has('carbon-steel-wok'))
  await click('.purchase-panel .button--outline')
  const comparisonBefore = await evaluate("localStorage.getItem('parallel:comparison:v1')")
  await visit('/cart')
  await until("document.querySelectorAll('.cart-item').length === 1")
  const price = products.find(p=>p.id==='carbon-steel-wok').price
  assert.equal(await evaluate("Number(document.querySelector('.cart-item__total').textContent.replace(/[^0-9.]/g,''))"), price*2)
  await click('.quantity-control button:last-child')
  await until("document.querySelector('.cart-count').textContent === '3'")
  await screenshot('cart-desktop')
  failWrite = true
  await click('.quantity-control button:last-child')
  await until("!!document.querySelector('.shopping-notice--error')")
  assert.equal(cart.get('carbon-steel-wok'), 3)
  assert.equal(await evaluate("document.querySelector('.quantity-control output').textContent"), '3')
  await screenshot('cart-error-desktop')
  await click('[aria-label="Dismiss shopping notice"]')
  await visit('/cart')
  await until("document.querySelector('.quantity-control output')?.textContent === '3'")
  await click('.cart-item__actions .text-button')
  await until("!!document.querySelector('.shopping-empty')")
  assert.ok(saved.has('carbon-steel-wok'))
  await visit('/product/carbon-steel-wok')
  await until("document.querySelector('.purchase-panel > button:last-of-type').getAttribute('aria-pressed') === 'true'")
  await click('.purchase-panel .shop-primary')
  await until("document.querySelector('.cart-count').textContent === '1'")
  await visit('/category/fashion')
  await until("document.querySelector('.cart-count').textContent === '1'")
  await click('.product-card .shop-primary')
  await until("document.querySelector('.cart-count').textContent === '2'")
  await visit('/cart')
  await until("document.querySelectorAll('.cart-item').length === 2")
  await screenshot('cart-multiple-desktop')
  assert.equal(await evaluate("localStorage.getItem('parallel:comparison:v1')"), comparisonBefore)
  console.log('PASS gallery keyboard behavior, server-response cart totals/quantities, failure retention, wishlist and comparison preservation')

  await click('.order-summary .shop-primary')
  await until("location.pathname === '/checkout' && !!document.querySelector('.order-summary button:not(:disabled)')")
  await layout()
  await screenshot('checkout-desktop')
  await click('.order-summary button')
  await until("document.querySelector('.order-summary button').disabled")
  await until("!!document.querySelector('.checkout-error')")
  assert.equal(checkoutRequests,1)
  assert.equal(cart.size,2)
  assert.equal(await evaluate("document.querySelector('.order-summary button').disabled"),false)
  await screenshot('checkout-error-desktop')
  signedIn=false
  await visit('/checkout')
  await until("document.querySelector('.order-summary button')?.textContent === 'Sign in required'")
  assert.equal(await evaluate("document.querySelector('.order-summary button').disabled"),true)
  await visit('/cart?checkout=cancelled')
  await until("document.querySelectorAll('.cart-item').length === 2")
  assert.ok(await evaluate("document.querySelector('.preview-banner').textContent.includes('cancelled')"))
  await visit('/product/carbon-steel-wok')
  await until("document.querySelector('.cart-count').textContent === '2'")
  await click('.purchase-panel > button:last-of-type')
  await until("document.querySelector('.shopping-notice--error a')?.textContent === 'Sign in'")
  assert.equal(cart.size,2)
  signedIn=true
  await visit('/order-confirmation?preview=1')
  assert.ok(await evaluate("document.querySelector('.confirmation-intro').textContent.includes('no order placed')"))
  await screenshot('confirmation-preview-desktop')
  console.log('PASS checkout request/loading/failure/retry, guest disabled payment, sign-in prompts, cancellation and honest confirmation preview')

  for (const width of [320,375,768,1024,1440]) {
    await viewport(width,width<540?812:1000)
    for (const path of ['/?browse=1','/category/books','/product/carbon-steel-wok','/cart','/checkout','/search?max=25']) {
      await visit(path)
      await until("document.querySelector('.cart-count')?.textContent === '2'")
      await layout()
      if ([375,768].includes(width)) await screenshot((path.split('/')[1].split('?')[0]||'home')+'-'+width)
    }
    console.log('PASS responsive layouts at '+width+'px')
  }
  await viewport(375,812)
  await visit('/category/books')
  await click('.catalogue-filter-toggle')
  await until("document.querySelector('.catalogue-filter-toggle').getAttribute('aria-expanded') === 'true'")
  await select('.catalogue-field:nth-of-type(2) select','Jane Austen')
  await until("document.querySelectorAll('.product-card').length === 1")
  await layout()
  await click('.menu-toggle')
  await until("!!document.querySelector('.category-nav--open')")
  await click('.category-nav a[href^="/category/fashion"]')
  await until("location.pathname === '/category/fashion' && !document.querySelector('.category-nav--open')")
  failRead=true
  await visit('/cart')
  await until("!!document.querySelector('.shopping-status[role=alert]')")
  await screenshot('cart-service-error-mobile')
  failRead=false
  await click('.shopping-status button')
  await until("document.querySelectorAll('.cart-item').length === 2")
  while (await evaluate("!!document.querySelector('.cart-item')")) {
    await click('.cart-item button[aria-label^="Remove "]')
    await until("!document.querySelector('.cart-item button:disabled')")
  }
  await until("!!document.querySelector('.shopping-empty') && document.querySelector('.cart-count').textContent === '0'")
  await screenshot('cart-empty-mobile')
  assert.deepEqual(errors.map(error=>error.split('\n')[0]),[],'Browser runtime errors')
  console.log('PASS mobile filters/menu, service retry, removal/empty state, no browser runtime errors')
  console.log('API calls were intercepted fixtures. Live Neon/auth/Stripe verification is intentionally not claimed.')
} catch (error) {
  await screenshot('failure')
  console.log('Failure details', errors.map(error=>error.split('\n')[0]), [...cart])
  throw error
} finally { close() }

