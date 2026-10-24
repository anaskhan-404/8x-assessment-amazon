import type { Metadata } from 'next'
import { AccountForm } from '@/components/account/AccountForm'
import Link from 'next/link'
import { currentSession } from '@/server/auth'
import { SignOut } from '@/components/commerce/SignOut'

export const metadata: Metadata = { title: 'Sign in' }

export const dynamic = 'force-dynamic'
export default async function AccountPage() {
  const session = process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET ? await currentSession() : null
  if (session) return <section className="account-card account-information"><h1>Your account</h1><p>Welcome, {session.user.name}.</p><p>{session.user.email}</p>
    <p><Link href="/orders">Your orders</Link> · <Link href="/wishlist">Wishlist</Link> · <Link href="/cart">Shopping bag</Link></p><SignOut /></section>
  return <AccountForm />
}
