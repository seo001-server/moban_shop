export const PAGE_SIZE = 10

export const PAGE_WINDOW = 5

export function getTotalPages(totalItems: number, pageSize = PAGE_SIZE): number {
  if (totalItems <= 0) return 1
  return Math.ceil(totalItems / pageSize)
}

/** 滑动窗口页码：前三页 1–5，第 4 页 2–6，第 7 页 5–9，以此类推 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  windowSize = PAGE_WINDOW,
): number[] {
  if (totalPages <= 0) return [1]
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  let start = currentPage - Math.floor(windowSize / 2)
  start = Math.max(1, start)

  let end = start + windowSize - 1
  if (end > totalPages) {
    end = totalPages
    start = Math.max(1, end - windowSize + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1
  return Math.min(Math.max(1, page), totalPages)
}
