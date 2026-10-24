'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/auth-client'
export function SignOut() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <><button className="account-button account-button--secondary" disabled={busy} onClick={async () => {
    setBusy(true); setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error(result.error.message)
      document.cookie = 'parallel-demo-browsing=; Max-Age=0; Path=/; SameSite=Lax'
      router.push('/account'); router.refresh()
    } catch { setError('Unable to sign out. Please try again.'); setBusy(false) }
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert">{error}</p>}</>
}
