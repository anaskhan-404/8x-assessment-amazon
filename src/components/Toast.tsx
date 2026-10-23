'use client'

import { CheckCircle2 } from 'lucide-react'
import { useComparison } from '../comparison-context'

export function Toast() {
  const { message } = useComparison()

  return (
    <div className={`toast ${message ? 'toast--visible' : ''}`} role="status" aria-live="polite">
      <CheckCircle2 size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
