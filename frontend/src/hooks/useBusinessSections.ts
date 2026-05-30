import { useEffect, useState } from 'react'
import { apiFetch } from '../api/http'
import { BUSINESS_SECTIONS, type BusinessSection } from '../lib/businessSections'

type ApiSection = {
  slug: string
  label: string
  icon: string
  tagline: string
  description: string
  sort_order: number
}

function mapSection(row: ApiSection): BusinessSection {
  return {
    slug: row.slug,
    label: row.label,
    icon: row.icon,
    tagline: row.tagline,
    description: row.description,
  }
}

export function useBusinessSections() {
  const [sections, setSections] = useState<BusinessSection[]>(BUSINESS_SECTIONS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch<ApiSection[]>('/api/business-sections')
        if (!alive || data.length === 0) return
        setSections(data.map(mapSection))
      } catch {
        /* keep static fallback */
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function getSection(slug: string): BusinessSection | undefined {
    return sections.find((s) => s.slug === slug) ?? BUSINESS_SECTIONS.find((s) => s.slug === slug)
  }

  return { sections, getSection, loaded }
}
