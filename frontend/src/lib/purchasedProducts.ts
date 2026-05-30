import { apiFetch } from '../api/http'
import type { Order, OrderItem } from '../api/types'

export type PurchasedProduct = OrderItem & {
  order_id: number
  order_no: string
  purchased_at: string
}

export async function fetchPurchasedProducts(orders: Order[]): Promise<PurchasedProduct[]> {
  const paid = orders.filter((o) => o.status === 'paid')
  if (!paid.length) return []

  const details = await Promise.all(
    paid.map(async (o) => {
      try {
        return await apiFetch<Order>(`/api/orders/${o.id}`)
      } catch {
        return null
      }
    }),
  )

  const seen = new Set<number>()
  const out: PurchasedProduct[] = []

  for (const detail of details) {
    if (!detail?.items?.length) continue
    for (const item of detail.items) {
      if (seen.has(item.product_id)) continue
      seen.add(item.product_id)
      out.push({
        ...item,
        order_id: detail.id,
        order_no: detail.order_no,
        purchased_at: detail.created_at,
      })
    }
  }

  return out
}
