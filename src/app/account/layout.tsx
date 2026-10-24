import { AccountFrame } from '@/components/account/AccountFrame'
import '@/styles/account.css'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountFrame>{children}</AccountFrame>
}
