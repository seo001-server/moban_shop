import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { Product } from '../api/types'
import { formatMinor } from '../util/money'
import { normalizeProduct } from '../lib/normalizeProduct'
import { BUSINESS_SECTIONS } from '../lib/businessSections'

type CategoryStub = {
  icon: string
  title: string
  description: string
  to: string
}

const CATEGORY_CARDS: CategoryStub[] = [
  {
    icon: 'fa-film',
    title: '影视娱乐',
    description: '点播、剧集、CMS 前台展示一站式主题',
    to: '/products?cat=film',
  },
  {
    icon: 'fa-book',
    title: '小说阅读',
    description: '书库、书架与章节阅读体验优化模板',
    to: '/products?cat=book',
  },
  {
    icon: 'fa-gamepad',
    title: '游戏社区',
    description: '资讯、攻略与下载资源整合布局',
    to: '/products?cat=game',
  },
  {
    icon: 'fa-shopping-cart',
    title: '商城导购',
    description: '模板选购、 SKU 呈现与购物车流程',
    to: '/products?cat=shop',
  },
]

const FEATURES = [
  {
    icon: 'fa-sync-alt',
    title: '持续更新',
    text: '所有模板保持定期迭代，可免费获取更新要点，让您的站点紧跟技术演进。',
  },
  {
    icon: 'fa-headset',
    title: '专业支持',
    text: '提供工作日在线答疑，协助您完成部署、主题配置与常见问题排查。',
  },
  {
    icon: 'fa-mobile-alt',
    title: '响应式设计',
    text: '模板面向多端适配，手机与桌面均可获得连贯的浏览体验。',
  },
  {
    icon: 'fa-shield-alt',
    title: '安全可靠',
    text: '代码结构与依赖保持透明，可降低未知脚本带来的运维风险。',
  },
  {
    icon: 'fa-rocket',
    title: '优化性能',
    text: '重视首屏加载与资源编排，更易与 CDN、缓存策略结合。',
  },
  {
    icon: 'fa-palette',
    title: '高度定制',
    text: '提供可替换的版面与色系思路，按需二次开发即可完成品牌化。',
  },
]

export default function HomePage() {
  const [items, setItems] = useState<Product[] | null>(null)
  const [featuredErr, setFeaturedErr] = useState<string | null>(null)

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

  return (
    <>
      <section className="brief">
        <div className="container">
          <h1>
            专业级 <span>站群系统</span> 一站式解决方案
          </h1>
          <p>
            探索精心打磨的高质量前台与模板方案，示例数据可随时替换；注册用户即可管理个人账户，购物车与结账能力可按路线图接入后端。
          </p>
          <div className="brief-buttons">
            <Link className="btn btn-primary" to="/products">
              <i className="fas fa-shopping-cart" /> 浏览热门模板
            </Link>
            <a className="btn btn-secondary" href="#featured-templates">
              <i className="fas fa-eye" /> 查看推荐列表
            </a>
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
            {BUSINESS_SECTIONS.map((s) => (
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
            {CATEGORY_CARDS.map((c) => (
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
              <span style={{ color: 'var(--text-light)' }}>
                暂无商品数据。
              </span>
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

      <section className="features homepage-marketing">
        <div className="container">
          <div className="section-title">
            <h2>我们的优势</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
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
    </>
  )
}
