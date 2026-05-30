import { apiFetch } from './http'
import type { CartLine } from '../cart/cartTypes'

type CartListResponse = {
  items: CartLine[]
}

export async function fetchCart(): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>('/api/cart')
  return data.items ?? []
}

export async function addCartItem(productId: number, quantityDelta = 1): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity_delta: quantityDelta }),
  })
  return data.items ?? []
}

export async function setCartItemQty(productId: number, quantity: number): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>(`/api/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
  return data.items ?? []
}

export async function removeCartItem(productId: number): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>(`/api/cart/items/${productId}`, {
    method: 'DELETE',
  })
  return data.items ?? []
}

export async function clearCartRemote(): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>('/api/cart', { method: 'DELETE' })
  return data.items ?? []
}

export async function mergeCartItems(
  items: Array<{ product_id: number; quantity: number }>,
): Promise<CartLine[]> {
  const data = await apiFetch<CartListResponse>('/api/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  return data.items ?? []
}
