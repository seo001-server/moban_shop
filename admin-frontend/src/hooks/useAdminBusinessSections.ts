import { useEffect, useState } from 'react'
import { adminApiFetch } from '../api/adminHttp'
import type { BusinessSectionMeta } from '../api/types'
import { BUSINESS_SECTION_OPTIONS, businessSectionLabel } from '../lib/businessSections'

export function useAdminBusinessSections() {
  const [sections, setSections] = useState<BusinessSectionMeta[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await adminApiFetch<BusinessSectionMeta[]>('/api/admin/business-sections')
        if (alive) setSections(data)
      } catch {
        /* fallback below */
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const options =
    sections.length > 0
      ? sections.map((s) => ({ value: s.slug, label: s.label }))
      : BUSINESS_SECTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

  function labelFor(slug: string): string {
    const fromApi = sections.find((s) => s.slug === slug)?.label
    return fromApi ?? businessSectionLabel(slug)
  }

  return { sections, options, labelFor, loaded }
}
