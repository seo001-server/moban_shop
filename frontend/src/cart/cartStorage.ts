import type { CartLine } from './cartTypes'
import { CART_STORAGE_KEY } from './cartTypes'

function parseCart(raw: string | null): CartLine[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return v.filter(isLine)
  } catch {
    return []
  }
}

function isLine(x: unknown): x is CartLine {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'number' &&
    typeof o.slug === 'string' &&
    typeof o.title === 'string' &&
    typeof o.price_minor === 'number' &&
    typeof o.currency === 'string' &&
    (o.image_url === null || typeof o.image_url === 'string') &&
    typeof o.qty === 'number' &&
    o.qty >= 1
  )
}

export function loadCart(): CartLine[] {
  return parseCart(localStorage.getItem(CART_STORAGE_KEY))
}

export function saveCart(lines: CartLine[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
}
