import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as cartApi from '../api/cart'
import { ApiError } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { LoginRequiredError } from './cartErrors'
import type { CartLine } from './cartTypes'
import { clearStoredCart } from './cartStorage'

type CartCtx = {
  lines: CartLine[]
  totalQty: number
  loading: boolean
  checkoutLineIds: number[] | null
  isDirectCheckout: boolean
  addLine: (p: Omit<CartLine, 'qty'> & { qty?: number }) => Promise<void>
  setQty: (id: number, qty: number) => Promise<void>
  removeLine: (id: number) => Promise<void>
  removeLines: (ids: number[]) => Promise<void>
  clearAll: () => Promise<void>
  setCheckoutLineIds: (ids: number[] | null) => void
  setDirectCheckoutLines: (lines: CartLine[] | null) => void
  clearCheckout: () => void
  checkoutLines: CartLine[]
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartCtx | null>(null)

function assertLoggedIn(token: string | null): asserts token is string {
  if (!token) {
    throw new LoginRequiredError()
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [lines, setLines] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(false)
  const [checkoutLineIds, setCheckoutLineIdsState] = useState<number[] | null>(null)
  const [directCheckoutLines, setDirectCheckoutLinesState] = useState<CartLine[] | null>(null)
  const syncingRef = useRef(false)

  const setCheckoutLineIds = useCallback((ids: number[] | null) => {
    setDirectCheckoutLinesState(null)
    setCheckoutLineIdsState(ids)
  }, [])

  const setDirectCheckoutLines = useCallback((next: CartLine[] | null) => {
    setCheckoutLineIdsState(null)
    setDirectCheckoutLinesState(next)
  }, [])

  const clearCheckout = useCallback(() => {
    setCheckoutLineIdsState(null)
    setDirectCheckoutLinesState(null)
  }, [])

  const refreshCart = useCallback(async () => {
    assertLoggedIn(token)
    setLoading(true)
    try {
      const items = await cartApi.fetchCart()
      setLines(items)
    } catch (err) {
      if (err instanceof ApiError && err.isAuthFailure()) {
        setLines([])
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!token) {
        setLines([])
        clearCheckout()
        clearStoredCart()
        return
      }
      if (syncingRef.current) return
      syncingRef.current = true
      setLoading(true)
      try {
        clearStoredCart()
        const items = await cartApi.fetchCart()
        if (!alive) return
        setLines(items)
      } catch {
        if (!alive) return
        setLines([])
      } finally {
        syncingRef.current = false
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [token, clearCheckout])

  const addLine = useCallback(
    async (p: Omit<CartLine, 'qty'> & { qty?: number }) => {
      assertLoggedIn(token)
      const delta = p.qty && p.qty > 0 ? Math.floor(p.qty) : 1
      const items = await cartApi.addCartItem(p.id, delta)
      setLines(items)
    },
    [token],
  )

  const setQty = useCallback(
    async (id: number, qty: number) => {
      assertLoggedIn(token)
      const q = Math.max(1, Math.floor(qty))
      const items = await cartApi.setCartItemQty(id, q)
      setLines(items)
    },
    [token],
  )

  const removeLine = useCallback(
    async (id: number) => {
      assertLoggedIn(token)
      const items = await cartApi.removeCartItem(id)
      setLines(items)
    },
    [token],
  )

  const removeLines = useCallback(
    async (ids: number[]) => {
      assertLoggedIn(token)
      if (ids.length === 0) return
      let items = lines
      for (const id of ids) {
        items = await cartApi.removeCartItem(id)
      }
      setLines(items)
    },
    [lines, token],
  )

  const clearAll = useCallback(async () => {
    assertLoggedIn(token)
    const items = await cartApi.clearCartRemote()
    setLines(items)
  }, [token])

  const totalQty = useMemo(() => lines.reduce((s, x) => s + x.qty, 0), [lines])

  const checkoutLines = useMemo(() => {
    if (directCheckoutLines?.length) return directCheckoutLines
    if (!checkoutLineIds?.length) return []
    const set = new Set(checkoutLineIds)
    return lines.filter((l) => set.has(l.id))
  }, [checkoutLineIds, directCheckoutLines, lines])

  const isDirectCheckout = directCheckoutLines !== null && directCheckoutLines.length > 0

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      totalQty,
      loading,
      checkoutLineIds,
      isDirectCheckout,
      addLine,
      setQty,
      removeLine,
      removeLines,
      clearAll,
      setCheckoutLineIds,
      setDirectCheckoutLines,
      clearCheckout,
      checkoutLines,
      refreshCart,
    }),
    [
      addLine,
      checkoutLineIds,
      checkoutLines,
      clearAll,
      clearCheckout,
      isDirectCheckout,
      lines,
      loading,
      refreshCart,
      removeLine,
      removeLines,
      setCheckoutLineIds,
      setDirectCheckoutLines,
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
