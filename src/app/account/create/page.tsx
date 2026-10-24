import type { Metadata } from 'next'
import { AccountForm } from '@/components/account/AccountForm'

export const metadata: Metadata = { title: 'Create account' }

export default function CreateAccountPage() {
  return <AccountForm creating />
}
