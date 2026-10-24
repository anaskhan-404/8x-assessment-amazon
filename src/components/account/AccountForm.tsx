'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, LoaderCircle } from 'lucide-react'
import { AccountField } from './AccountField'
import { authClient } from '@/auth-client'

type Field = 'name' | 'contact' | 'password' | 'confirm'
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>
const emptyValues: Values = { name: '', contact: '', password: '', confirm: '' }

function validate(values: Values, creating: boolean): Errors {
  const errors: Errors = {}
  if (creating && !values.name.trim()) errors.name = 'Enter your name.'
  const contact = values.contact.trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  if (!contact) errors.contact = 'Enter your email address.'
  else if (!email) errors.contact = 'Enter a valid email address.'
  if (!values.password) errors.password = 'Enter your password.'
  else if (creating && values.password.length < 8) errors.password = 'Use at least 8 characters.'
  else if (values.password.length > 128) errors.password = 'Use no more than 128 characters.'
  if (creating && !values.confirm) errors.confirm = 'Re-enter your password.'
  else if (creating && values.password !== values.confirm) errors.confirm = 'Your passwords do not match.'
  return errors
}

export function AccountForm({ creating = false }: { creating?: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(emptyValues)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const busy = status === 'loading' || status === 'success'
  const submitting = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const nextErrors = validate(values, creating)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setStatus('idle')
      formRef.current?.querySelector<HTMLInputElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus()
      return
    }
    submitting.current = true
    setStatus('loading')
    try {
      const credentials = { email: values.contact.trim().toLowerCase(), password: values.password }
      const result = creating
        ? await authClient.signUp.email({ ...credentials, name: values.name.trim() })
        : await authClient.signIn.email(credentials)
      if (result.error) throw new Error(result.error.message || 'Unable to sign in. Please try again.')
      // A failed merge keeps the guest cookie for a later retry on the bag page.
      await fetch('/api/cart/merge', { method: 'POST' }).catch(() => undefined)
      setValues(emptyValues)
      setStatus('success')
      router.push('/?browse=1')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to connect. Please try again.')
      setStatus('error')
      submitting.current = false
    }
  }

  function field(name: Field, label: string, autoComplete: string, hint?: string, placeholder?: string) {
    return <AccountField key={name} name={name} label={label} value={values[name]} autoComplete={autoComplete} hint={hint} placeholder={placeholder}
      password={name === 'password' || name === 'confirm'} disabled={busy} error={errors[name]}
      onBlur={() => setErrors((current) => ({ ...current, [name]: validate(values, creating)[name] }))}
      onChange={(value) => {
        setValues((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: undefined, ...(name === 'password' ? { confirm: undefined } : {}) }))
        if (status === 'error') setStatus('idle')
      }} />
  }

  return (
    <>
      <section className="account-card" aria-labelledby="account-title">
        <h1 id="account-title">{creating ? 'Create account' : 'Sign in'}</h1>
        <p className="account-subtitle">{creating ? 'Your next good find starts here.' : 'Welcome back to Parallel.'}</p>
        <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy} className="account-form">
          {creating && field('name', 'Your name', 'name', undefined, 'First and last name')}
          {field('contact', 'Email address', 'username')}
          {field('password', 'Password', creating ? 'new-password' : 'current-password', creating ? 'Between 8 and 128 characters.' : undefined)}
          {creating && field('confirm', 'Re-enter password', 'new-password')}
          <div aria-live="polite" aria-atomic="true">
            {status === 'error' && <p className="account-status account-status--error" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{message}</span></p>}
            {status === 'success' && <p className="account-status account-status--success"><CheckCircle2 size={18} aria-hidden="true" /><span>Signed in. Opening the marketplace…</span></p>}
          </div>
          <button className="account-button account-button--primary" type="submit" disabled={busy}>
            {status === 'loading' ? <><LoaderCircle size={18} className="account-spinner" aria-hidden="true" />Please wait…</> : status === 'success' ? <><CheckCircle2 size={18} aria-hidden="true" />Opening marketplace…</> : creating ? 'Create your Parallel account' : 'Sign in'}
          </button>
        </form>
        <p className="account-terms">By continuing, you agree to our account terms. Read our <Link href="/account/terms">Terms of use</Link> and <Link href="/account/privacy">Privacy notice</Link>.</p>
        <details className="account-help">
          <summary><ChevronRight size={14} aria-hidden="true" />Need help?</summary>
          <div><p>Use your email address and password. New customers can create an account below.</p>
            <Link href="/account/help">Account help</Link>
          </div>
        </details>
      </section>
      <div className="account-secondary">
        <p><span>{creating ? 'Already have an account?' : 'New to Parallel?'}</span></p>
        <Link className="account-button account-button--secondary" href={creating ? '/account' : '/account/create'}>{creating ? 'Sign in to Parallel' : 'Create your Parallel account'}</Link>
      </div>
    </>
  )
}
