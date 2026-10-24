import { Minus, Plus } from 'lucide-react'
import { MAX_CART_QUANTITY } from '@/commerce'

export function QuantityControl({ quantity, onChange, name, disabled = false }: { quantity: number; onChange: (quantity: number) => void; name: string; disabled?: boolean }) {
  return <div className="quantity-control" role="group" aria-label={`Quantity for ${name}`}>
    <button type="button" aria-label={`Decrease quantity of ${name}`} onClick={() => onChange(quantity - 1)} disabled={disabled || quantity <= 1}><Minus size={15} aria-hidden="true" /></button>
    <output aria-live="polite">{quantity}</output>
    <button type="button" aria-label={`Increase quantity of ${name}`} onClick={() => onChange(quantity + 1)} disabled={disabled || quantity >= MAX_CART_QUANTITY}><Plus size={15} aria-hidden="true" /></button>
  </div>
}
