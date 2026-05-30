import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { BusinessItem } from '../api/types'
import { useBusinessSections } from '../hooks/useBusinessSections'

type Props = {
  slug: string
}

export default function BusinessSectionPage({ slug }: Props) {
  const { getSection } = useBusinessSections()
  const section = getSection(slug)
  const [items, setItems] = useState<BusinessItem[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    if (!section) return

    let alive = true
    setItems(null)
    setLoadErr(null)
    ;(async () => {
      try {
        const data = await apiFetch<BusinessItem[]>(`/api/business/${encodeURIComponent(slug)}`)
        if (!alive) return
        setItems(data)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setLoadErr(e.message)
        } else {
          setLoadErr('加载失败')
        }
        setItems([])
      }
    })()
    return () => {
      alive = false
    }
  }, [section, slug])

  if (!section) {
    return (
      <div className="container">
        <p className="error">未找到该业务板块。</p>
        <Link to="/" className="muted-link">
          返回首页
        </Link>
      </div>
    )
  }

  const showEmpty = section.empty || (items !== null && items.length === 0 && !loadErr)
  const loading = items === null && !loadErr

  return (
    <>
      <section className="breadcrumb breadcrumb-compact">
        <div className="container">
          <div className="breadcrumb-content">
            <Link to="/">首页</Link>
            <i className="fas fa-chevron-right" aria-hidden />
            <span>{section.label}</span>
          </div>
        </div>
      </section>

      <section className="business-section-page">
        <div className="container">
          <div className="business-section-hero">
            <div className="business-section-icon">
              <i className={`fas ${section.icon}`} aria-hidden />
            </div>
            <div className="business-section-head">
              <p className="business-section-tag">{section.tagline}</p>
              <h1>{section.label}</h1>
              <p className="business-section-lede">{section.description}</p>
            </div>
          </div>

          {loadErr ? (
            <div className="business-section-empty">
              <p className="error">{loadErr}</p>
            </div>
          ) : loading ? (
            <div className="business-section-empty">
              <p className="muted">加载中…</p>
            </div>
          ) : showEmpty ? (
            <div className="business-section-empty">
              <i className="fas fa-hourglass-half" aria-hidden />
              <p>内容筹备中，稍后开放。</p>
            </div>
          ) : (
            <div className="list-grid business-highlight-grid">
              {items!.map((item) => (
                <article key={item.id} className="list-item business-highlight-card">
                  <div className="item-info">
                    <div className="item-title business-highlight-title">
                      <h3>{item.title}</h3>
                    </div>
                    <p className="item-desc">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
