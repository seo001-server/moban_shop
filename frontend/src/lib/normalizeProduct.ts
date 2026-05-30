import type { Product } from '../api/types'

/** 兼容缺少新字段的旧 API 响应，统一默认值，避免 UI / 排序报错 */
export function normalizeProduct(p: Product): Product {
  const d = Number(p.downloads)
  const downloads = Number.isFinite(d) && d >= 0 ? Math.trunc(d) : 0
  const sc = Number(p.score)
  const score = Number.isFinite(sc) ? sc : 0
  return {
    ...p,
    recommended: Boolean(p.recommended),
    downloads,
    score,
  }
}
