'use client'

import { useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

type Props = {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  hint?: string
  password?: boolean
  autoComplete: string
  placeholder?: string
  disabled: boolean
}

export function AccountField({ name, label, error, hint, password, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const id = `account-${name}`
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-input-wrap">
        <input
          id={id} name={name} type={password && !visible ? 'password' : 'text'}
          value={props.value} onChange={(event) => props.onChange(event.target.value)} onBlur={props.onBlur}
          autoComplete={props.autoComplete} placeholder={props.placeholder} disabled={props.disabled}
          required aria-invalid={!!error} aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
          autoCapitalize={name === 'name' ? 'words' : 'none'} spellCheck={false}
          className={password ? 'account-input--password' : undefined}
        />
        {password && <button className="account-visibility" type="button" disabled={props.disabled} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>}
      </div>
      {hint && <p className="account-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="account-field-error" id={`${id}-error`}><AlertCircle size={14} aria-hidden="true" />{error}</p>}
    </div>
  )
}
