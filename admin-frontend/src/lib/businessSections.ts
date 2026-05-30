/** 与前台 businessSections / 后端 section_slug 一致 */
export const BUSINESS_SECTION_OPTIONS = [
  { value: 'program', label: '程序' },
  { value: 'luodi', label: '落地' },
  { value: 'cdn', label: 'CDN' },
  { value: 'resources', label: '资源' },
  { value: 'monetize', label: '变现' },
] as const

export type BusinessSectionSlug = (typeof BUSINESS_SECTION_OPTIONS)[number]['value']

export function businessSectionLabel(slug: string): string {
  return BUSINESS_SECTION_OPTIONS.find((o) => o.value === slug)?.label ?? slug
}
