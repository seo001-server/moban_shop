import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartLine } from './cartTypes'
import { loadCart, saveCart } from './cartStorage'

type CartCtx = {
  lines: CartLine[]
  totalQty: number
  checkoutLineIds: number[] | null
  addLine: (p: Omit<CartLine, 'qty'> & { qty?: number }) => void
  setQty: (id: number, qty: number) => void
  removeLine: (id: number) => void
  removeLines: (ids: number[]) => void
  clearAll: () => void
  setCheckoutLineIds: (ids: number[] | null) => void
  checkoutLines: CartLine[]
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadCart())
  const [checkoutLineIds, setCheckoutLineIds] = useState<number[] | null>(null)

  useEffect(() => {
    saveCart(lines)
  }, [lines])

  const addLine = useCallback((p: Omit<CartLine, 'qty'> & { qty?: number }) => {
    const qty = p.qty && p.qty > 0 ? Math.floor(p.qty) : 1
    setLines((prev) => {
      const i = prev.findIndex((x) => x.id === p.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + qty }
        return next
      }
      return [...prev, { ...p, qty }]
    })
  }, [])

  const setQty = useCallback((id: number, qty: number) => {
    const q = Math.max(1, Math.floor(qty))
    setLines((prev) => prev.map((x) => (x.id === id ? { ...x, qty: q } : x)))
  }, [])

  const removeLine = useCallback((id: number) => {
    setLines((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const removeLines = useCallback((ids: number[]) => {
    const set = new Set(ids)
    setLines((prev) => prev.filter((x) => !set.has(x.id)))
  }, [])

  const clearAll = useCallback(() => setLines([]), [])

  const totalQty = useMemo(() => lines.reduce((s, x) => s + x.qty, 0), [lines])

  const checkoutLines = useMemo(() => {
    if (!checkoutLineIds?.length) return []
    const set = new Set(checkoutLineIds)
    return lines.filter((l) => set.has(l.id))
  }, [checkoutLineIds, lines])

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      totalQty,
      checkoutLineIds,
      addLine,
      setQty,
      removeLine,
      removeLines,
      clearAll,
      setCheckoutLineIds,
      checkoutLines,
    }),
    [
      addLine,
      checkoutLineIds,
      checkoutLines,
      clearAll,
      lines,
      removeLine,
      removeLines,
      setQty,
      totalQty,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart 须在 CartProvider 内使用')
  return ctx
}
