import { FA_SOLID_ICONS } from './iconLibrary.generated'

export type { FaIconEntry } from './iconLibrary.generated'

/** All Font Awesome Free solid icon class suffixes (fa-*). */
export const ICON_LIBRARY: string[] = FA_SOLID_ICONS.map((item) => item.code)

export function normalizeFaIcon(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'fa-circle'
  return trimmed.startsWith('fa-') ? trimmed : `fa-${trimmed}`
}

export function faIconClass(raw: string): string {
  return `fas ${normalizeFaIcon(raw)}`
}

export function filterIcons(query: string, limit = 240): string[] {
  const q = query.trim().toLowerCase().replace(/^fa-/, '')
  if (!q) {
    return ICON_LIBRARY.slice(0, Math.min(limit, 96))
  }
  const out: string[] = []
  for (const item of FA_SOLID_ICONS) {
    const code = item.code.toLowerCase()
    const label = item.label.toLowerCase()
    const hit =
      code.includes(q) ||
      code.replace(/^fa-/, '').includes(q) ||
      label.includes(q) ||
      item.terms.some((t) => t.toLowerCase().includes(q))
    if (hit) {
      out.push(item.code)
      if (out.length >= limit) break
    }
  }
  return out
}

export function totalSolidIconCount(): number {
  return FA_SOLID_ICONS.length
}
