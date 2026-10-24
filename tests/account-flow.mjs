// Account UI checks only. Auth requests are intercepted failures, never real registration.
import assert from 'node:assert/strict'
import { browser } from './ui-browser-helpers.mjs'
const b = await browser()
const { visit, viewport, click, fill, until, evaluate, screenshot, layout, errors, close } = b
await b.mockApi(async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return {status:503,body:{code:'SERVICE_UNAVAILABLE',message:'Account service unavailable. Please try again.'}}
})
try {
  for (const width of [375,1440]) {
    await viewport(width,width===375?812:1000)
    await visit('/account')
    await layout()
    assert.equal(await evaluate("!!document.querySelector('.site-header')"),false)
    await screenshot('account-sign-in-'+width)
    await click('button[type=submit]')
    await until("document.querySelectorAll('[aria-invalid=true]').length === 2")
    assert.equal(await evaluate('document.activeElement.name'),'contact')
    await fill('[name=contact]','not-an-email')
    await click('button[type=submit]')
    assert.ok(await evaluate("document.querySelector('#account-contact-error').textContent.includes('valid email')"))
    await fill('[name=password]','made-up-ui-test-password')
    await click('[aria-label="Show password"]')
    assert.equal(await evaluate("document.querySelector('[name=password]').type"),'text')
    await click('[aria-label="Hide password"]')
    assert.equal(await evaluate("document.querySelector('[name=password]').type"),'password')
    await click('.account-secondary a')
    await until("location.pathname === '/account/create'")
    await layout()
    await screenshot('account-sign-up-'+width)
    await click('button[type=submit]')
    await until("document.querySelectorAll('[aria-invalid=true]').length === 4")
    await fill('[name=name]','UI Test')
    await fill('[name=contact]','ui-test@example.com')
    await fill('[name=password]','short')
    await fill('[name=confirm]','mismatch')
    await click('button[type=submit]')
    assert.ok(await evaluate("document.querySelector('#account-password-error').textContent.includes('8')"))
    assert.ok(await evaluate("document.querySelector('#account-confirm-error').textContent.includes('match')"))
    await fill('[name=password]','made-up-ui-test-password')
    await fill('[name=confirm]','made-up-ui-test-password')
    await click('button[type=submit]')
    await until("document.querySelector('button[type=submit]').disabled")
    assert.equal(await evaluate("document.querySelector('.account-visibility').disabled"),true)
    await until("!!document.querySelector('.account-status--error')")
    assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),false)
    await screenshot('account-error-'+width)
  }
  for (const topic of ['terms','privacy','help']) { await visit('/account/'+topic); await layout() }
  assert.deepEqual(errors,[])
  console.log('PASS account layouts, inline validation, password toggles, focus, disabled/loading and intercepted service error, footer routes')
  console.log('No live authentication or registrations tested.')
} finally { close() }

