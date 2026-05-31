export type CatalogCat = 'all' | 'film' | 'book' | 'game' | 'shop'
export type CatalogSort = '' | 'time' | 'hits' | 'score'

/** 前台「综合/时间/人气/评分」依次对应 sort_order、created_at、downloads、score */
/** 前台筛选类目，与后端 `products.category` 一致 */
export type ProductCategorySlug = 'film' | 'book' | 'game' | 'shop'

export function parseCat(raw: string | null): CatalogCat {
  if (raw === 'film' || raw === 'book' || raw === 'game' || raw === 'shop') return raw
  return 'all'
}

export function parseSort(raw: string | null): CatalogSort {
  if (raw === 'time' || raw === 'hits' || raw === 'score') return raw
  return ''
}

/** 搜索关键词，与后端 q 参数一致，最长 80 字符 */
export function parseSearchQuery(raw: string | null): string {
  const q = (raw ?? '').trim()
  if (!q) return ''
  return q.length > 80 ? q.slice(0, 80) : q
}
