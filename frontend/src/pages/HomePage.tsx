import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { Product } from '../api/types'
import { useBusinessSections } from '../hooks/useBusinessSections'
import { FALLBACK_HOMEPAGE, type HomepageContent } from '../lib/homepageContent'
import { formatMinor } from '../util/money'
import { normalizeProduct } from '../lib/normalizeProduct'

export default function HomePage() {
  const { sections: businessSections } = useBusinessSections()
  const [homepage, setHomepage] = useState<HomepageContent>(FALLBACK_HOMEPAGE)
  const [items, setItems] = useState<Product[] | null>(null)
  const [featuredErr, setFeaturedErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch<HomepageContent>('/api/homepage')
        if (alive) setHomepage(data)
      } catch {
        /* fallback */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch<Product[]>('/api/products')
        if (!alive) return
        const norm = data.map(normalizeProduct)
        const ranked = [...norm].sort((a, b) => {
          if (a.recommended !== b.recommended) {
            return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)
          }
          return b.downloads - a.downloads
        })
        setItems(ranked.slice(0, 6))
        setFeaturedErr(null)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setFeaturedErr(e.message)
        } else {
          setFeaturedErr('加载失败')
        }
        setItems([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const { hero, category_cards: categoryCards, features } = homepage

  return (
    <>
      <section className="brief">
        <div className="container">
          <h1 dangerouslySetInnerHTML={{ __html: hero.title }} />
          <p>{hero.subtitle}</p>
          <div className="brief-buttons">
            <Link className="btn btn-primary" to={hero.primary_button.to}>
              <i className="fas fa-shopping-cart" /> {hero.primary_button.label}
            </Link>
            {hero.secondary_button.to.startsWith('#') ? (
              <a className="btn btn-secondary" href={hero.secondary_button.to}>
                <i className="fas fa-eye" /> {hero.secondary_button.label}
              </a>
            ) : (
              <Link className="btn btn-secondary" to={hero.secondary_button.to}>
                <i className="fas fa-eye" /> {hero.secondary_button.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="features homepage-marketing">
        <div className="container">
          <div className="section-title">
            <h2>我们的优势</h2>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">
                  <i className={`fas ${f.icon} floating`} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="categories homepage-marketing">
        <div className="container">
          <div className="section-title">
            <h2>业务板块</h2>
            <p>程序、落地、CDN、资源与变现等配套服务，模板与文档见下方入口</p>
          </div>
          <div className="category-grid">
            {businessSections.map((s) => (
              <div key={s.slug} className="category-card">
                <Link to={`/${s.slug}`}>
                  <div className="category-icon">
                    <i className={`fas ${s.icon}`} />
                  </div>
                  <h3>{s.label}</h3>
                  <p>{s.empty ? '内容筹备中' : s.tagline}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="categories homepage-marketing">
        <div className="container">
          <div className="section-title">
            <h2>热门模板分类</h2>
            <p>精选多种适用场景，满足影视、小说、社区与导购类站点</p>
          </div>
          <div className="category-grid">
            {categoryCards.map((c) => (
              <div key={c.title} className="category-card">
                <Link to={c.to}>
                  <div className="category-icon">
                    <i className={`fas ${c.icon}`} />
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="templates homepage-marketing" id="featured-templates">
        <div className="container">
          <div className="section-title">
            <h2>热门推荐模板</h2>
          </div>

          {items === null ? (
            <p className="section-title" style={{ marginTop: -20 }}>
              <span style={{ color: 'var(--text-light)' }}>加载中…</span>
            </p>
          ) : featuredErr ? (
            <p className="section-title" style={{ marginTop: -20 }} role="alert">
              <span className="error">{featuredErr}</span>
            </p>
          ) : items.length === 0 ? (
            <p className="section-title" style={{ marginTop: -20 }}>
              <span style={{ color: 'var(--text-light)' }}>暂无商品数据。</span>
            </p>
          ) : (
            <div className="template-grid">
              {items.map((p) => (
                <div key={p.id} className="template-card">
                  <Link to={`/products/${p.id}`}>
                    <div className="template-img">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background:
                              'linear-gradient(135deg, rgba(0,113,227,0.35), rgba(169,81,237,0.35))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(226,232,240,0.85)',
                            fontSize: '0.95rem',
                          }}
                        >
                          暂无封面
                        </div>
                      )}
                      <div className="template-badge">{p.recommended ? '推荐' : '热卖中'}</div>
                      <div className="template-price">{formatMinor(p.price_minor, p.currency)}</div>
                    </div>
                    <div className="template-content">
                      <div className="template-title">
                        <h3>{p.title}</h3>
                      </div>
                      {p.description ? <p className="template-desc">{p.description}</p> : null}
                      <div className="template-tags">
                        <span className="tag">{p.currency}</span>
                        <span className="tag">slug: {p.slug}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
