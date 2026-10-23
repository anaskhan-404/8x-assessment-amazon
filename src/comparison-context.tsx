'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { productById } from './data'
import type { Product } from './types'

const STORAGE_KEY = 'parallel:comparison:v1'
export const MAX_COMPARISON_ITEMS = 4

interface ComparisonContextValue {
  selectedIds: string[]
  selectedProducts: Product[]
  isAtLimit: boolean
  message: string
  add: (id: string) => boolean
  remove: (id: string) => void
  toggle: (id: string) => boolean
  clear: () => void
  isSelected: (id: string) => boolean
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null)

const readStoredIds = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []

    return stored
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => productById(id)?.category === 'headphones')
      .slice(0, MAX_COMPARISON_ITEMS)
  } catch {
    return []
  }
}

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(readStoredIds)
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
  }, [selectedIds])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2800)
    return () => window.clearTimeout(timer)
  }, [message])

  const add = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) return true
      if (selectedIds.length >= MAX_COMPARISON_ITEMS) {
        setMessage('You can compare up to four products. Remove one to add another.')
        return false
      }

      setSelectedIds((current) => [...current, id])
      setMessage('Added to comparison')
      return true
    },
    [selectedIds],
  )

  const remove = useCallback((id: string) => {
    setSelectedIds((current) => current.filter((item) => item !== id))
    setMessage('Removed from comparison')
  }, [])

  const toggle = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        remove(id)
        return false
      }
      return add(id)
    },
    [add, remove, selectedIds],
  )

  const clear = useCallback(() => {
    setSelectedIds([])
    setMessage('Comparison cleared')
  }, [])

  const value = useMemo<ComparisonContextValue>(
    () => ({
      selectedIds,
      selectedProducts: selectedIds
        .map((id) => productById(id))
        .filter((product): product is Product => Boolean(product)),
      isAtLimit: selectedIds.length >= MAX_COMPARISON_ITEMS,
      message,
      add,
      remove,
      toggle,
      clear,
      isSelected: (id) => selectedIds.includes(id),
    }),
    [add, clear, message, remove, selectedIds, toggle],
  )

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (!context) {
    throw new Error('useComparison must be used inside ComparisonProvider')
  }
  return context
}
