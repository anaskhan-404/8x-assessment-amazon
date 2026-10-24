'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { productById } from './data'
import { addComparisonId, comparisonLimitReason, MAX_COMPARISON_ITEMS, parseComparisonIds } from './comparison-selection'
import { groupComparisonProducts, type ComparisonGroup } from './comparison-engine'
import type { Product, ProductCategory } from './types'

const STORAGE_KEY = 'parallel:comparison:v1'
export { MAX_COMPARISON_ITEMS, MAX_COMPARISON_PER_CATEGORY } from './comparison-selection'

interface ComparisonContextValue {
  selectedIds: string[]
  selectedProducts: Product[]
  groups: ComparisonGroup[]
  isAtLimit: boolean
  message: string
  add: (id: string) => boolean
  remove: (id: string) => void
  toggle: (id: string) => boolean
  clear: () => void
  clearGroup: (category: ProductCategory) => void
  limitReason: (id: string) => string | null
  isSelected: (id: string) => boolean
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null)

let memorySnapshot = '[]'
let storageUnavailable = false
const listeners = new Set<() => void>()
const readSnapshot = () => {
  if (storageUnavailable) return memorySnapshot
  try { return window.localStorage.getItem(STORAGE_KEY) ?? memorySnapshot } catch { return memorySnapshot }
}
const serverSnapshot = () => '[]'
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      memorySnapshot = event.newValue ?? '[]'
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}
const writeIds = (ids: string[]) => {
  memorySnapshot = JSON.stringify(ids)
  try { window.localStorage.setItem(STORAGE_KEY, memorySnapshot) } catch { storageUnavailable = true }
  listeners.forEach((listener) => listener())
  return !storageUnavailable
}

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  const selectedIds = useMemo(() => parseComparisonIds(snapshot), [snapshot])
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Repair corrupt/old stored selections without discarding valid v1 headphone IDs.
    if (snapshot !== JSON.stringify(selectedIds)) writeIds(selectedIds)
  }, [snapshot, selectedIds])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 2800)
    return () => window.clearTimeout(timer)
  }, [message])

  const add = useCallback(
    (id: string) => {
      const current = parseComparisonIds(readSnapshot())
      if (current.includes(id)) return true
      const reason = comparisonLimitReason(current, id)
      if (reason) {
        setMessage(reason)
        return false
      }

      const saved = writeIds(addComparisonId(current, id))
      setMessage(saved ? 'Added to comparison' : 'Added for this visit. Browser storage is unavailable; selections cannot survive a refresh.')
      return true
    },
    [],
  )

  const remove = useCallback((id: string) => {
    writeIds(parseComparisonIds(readSnapshot()).filter((item) => item !== id))
    setMessage('Removed from comparison')
  }, [])

  const toggle = useCallback(
    (id: string) => {
      if (parseComparisonIds(readSnapshot()).includes(id)) {
        remove(id)
        return false
      }
      return add(id)
    },
    [add, remove],
  )

  const clear = useCallback(() => {
    writeIds([])
    setMessage('Comparison cleared')
  }, [])

  const clearGroup = useCallback((category: ProductCategory) => {
    writeIds(parseComparisonIds(readSnapshot()).filter((id) => productById(id)?.category !== category))
    setMessage('Category selection cleared')
  }, [])

  const selectedProducts = useMemo(() => selectedIds
    .map((id) => productById(id))
    .filter((product): product is Product => Boolean(product)), [selectedIds])

  const value = useMemo<ComparisonContextValue>(
    () => ({
      selectedIds,
      selectedProducts,
      groups: groupComparisonProducts(selectedProducts),
      isAtLimit: selectedIds.length >= MAX_COMPARISON_ITEMS,
      message,
      add,
      remove,
      toggle,
      clear,
      clearGroup,
      limitReason: (id) => comparisonLimitReason(selectedIds, id),
      isSelected: (id) => selectedIds.includes(id),
    }),
    [add, clear, clearGroup, message, remove, selectedIds, selectedProducts, toggle],
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
