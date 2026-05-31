import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { Product } from '../api/types'
import { formatMinor } from '../util/money'
import { normalizeProduct } from '../lib/normalizeProduct'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'
import { ProductImage } from '../components/ProductImage'

const CATEGORY_LABEL: Record<string, string> = {
  film: '影视娱乐',
  book: '小说阅读',
  game: '游戏社区',
  shop: '商城导购',
}

function badgeForCategory(cat: string): string {
  if (cat === 'film') return '热卖'
  if (cat === 'shop') return '新品'
  return '精选'
}

type TabKey = 'description' | 'reviews' | 'features' | 'changelog'

const DETAIL_FEATURES = [
  {
    icon: 'fa-mobile-alt',
    title: '响应式设计',
    text: '完美适配桌面、平板和手机设备，提供一致的用户体验',
  },
  {
    icon: 'fa-search',
    title: 'SEO 友好',
    text: '结构与文案区域便于检索与站内运营扩展',
  },
  {
    icon: 'fa-play-circle',
    title: '多场景内容',
    text: '适合影视、图文、导购等多类型内容模块组合',
  },
  {
    icon: 'fa-bolt',
    title: '高性能',
    text: '资源与接口分离，可按需拆分与缓存加速',
  },
]

export default function ProductDetailPage() {
  const { id: idParam } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const { token } = useAuth()
  const { addLine, setDirectCheckoutLines } = useCart()
  const { showToast } = useToast()
  const [p, setP] = useState<Product | null>(null)
  const [catalog, setCatalog] = useState<Product[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('description')

  const productID = idParam ? parseInt(idParam, 10) : NaN
  const validId = Number.isInteger(productID) && productID > 0

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!validId) {
        setErr('无效的商品 ID')
        setP(null)
        return
      }
      try {
        const [detail, list] = await Promise.all([
          apiFetch<Product>(`/api/products/${productID}`),
          apiFetch<Product[]>('/api/products').catch(() => [] as Product[]),
        ])
        if (!alive) return
        setP(normalizeProduct(detail))
        setCatalog(list.map(normalizeProduct))
        setErr(null)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
        setP(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [productID, validId])

  const related = useMemo(() => {
    if (!p) return []
    return catalog.filter((x) => x.slug !== p.slug && x.id !== p.id).slice(0, 3)
  }, [catalog, p])

  function lineFromProduct(product: Product) {
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      price_minor: product.price_minor,
      currency: product.currency,
      image_url: product.image_url ?? null,
    }
  }

  function loginFromHere() {
    nav(`/login?from=${encodeURIComponent(loc.pathname)}`)
  }

  function handleAddCart() {
    if (!p) return
    if (!token) {
      showToast('请先登录后再加入购物车', 'info')
      loginFromHere()
      return
    }
    void addLine({ ...lineFromProduct(p), qty: 1 }).then(() => {
      showToast('已加入购物车')
    })
  }

  function handleBuyNow() {
    if (!p) return
    setDirectCheckoutLines([{ ...lineFromProduct(p), qty: 1 }])
    if (!token) {
      showToast('请先登录后再购买', 'info')
      nav('/login?from=/checkout')
      return
    }
    nav('/checkout')
  }

  if (!idParam || !validId) {
    return (
      <>
        <section className="breadcrumb breadcrumb-compact">
          <div className="container">
            <div className="breadcrumb-content">
              <Link to="/">
                <i className="fas fa-home" /> 首页
              </Link>
              <i className="fas fa-chevron-right" />
              <Link to="/products">模板商城</Link>
              <i className="fas fa-chevron-right" />
              <span>无效链接</span>
            </div>
          </div>
        </section>
        <div className="container">
          <p className="error" role="alert">
            无效的商品 ID，请从模板列表或首页进入详情。
          </p>
        </div>
      </>
    )
  }

  if (!p && !err) {
    return (
      <>
        <section className="breadcrumb">
          <div className="container">
            <div className="breadcrumb-content">
              <Link to="/">
                <i className="fas fa-home" /> 首页
              </Link>
              <i className="fas fa-chevron-right" />
              <Link to="/products">模板商城</Link>
              <i className="fas fa-chevron-right" />
              <span>…</span>
            </div>
          </div>
        </section>
        <div className="container">
          <p className="muted">加载中…</p>
        </div>
      </>
    )
  }

  if (!p) {
    return (
      <>
        <section className="breadcrumb">
          <div className="container">
            <div className="breadcrumb-content">
              <Link to="/">
                <i className="fas fa-home" /> 首页
              </Link>
              <i className="fas fa-chevron-right" />
              <Link to="/products">模板商城</Link>
              <i className="fas fa-chevron-right" />
              <span>错误</span>
            </div>
          </div>
        </section>
        <div className="container">
          <p className="error" role="alert">
            {err ?? '未找到商品'}
          </p>
        </div>
      </>
    )
  }

  const hitLabel = `${p.downloads.toLocaleString('zh-Hans-CN')}+`
  const scoreLabel = Number.isFinite(p.score) ? p.score.toFixed(1) : '0.0'
  const badge = badgeForCategory(p.category)

  return (
    <>
      <PageMeta title={p.title} description={p.description?.slice(0, 140) || PAGE_DESCRIPTIONS.products} />
      <section className="breadcrumb">
        <div className="container">
          <div className="breadcrumb-content">
            <Link to="/">
              <i className="fas fa-home" /> 首页
            </Link>
            <i className="fas fa-chevron-right" />
            <Link to="/products">模板商城</Link>
            <i className="fas fa-chevron-right" />
            <span>{p.title}</span>
          </div>
        </div>
      </section>

      <section className="detail-template-detail">
        <div className="container detail-layout-inner">
          <div className="detail-top-row">
            <aside className="preview-section">
              <div className="preview-main">
                {badge ? (
                  <div className="preview-badge" style={{ zIndex: 2 }}>
                    {badge}
                  </div>
                ) : null}
                <div className="preview-image">
                  {p.image_url ? (
                    <ProductImage src={p.image_url} alt={p.title} width={480} height={360} eager />
                  ) : (
                    <div className="preview-placeholder-note">
                      <i className="fas fa-layer-group fa-3x" style={{ opacity: 0.4 }} />
                      <p>暂无封面图</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="preview-meta-notes">
                <p className="detail-buy-note">
                  提示：源码具备可复制性，购买后不支持退换货操作，购买前请确认好相关信息。
                </p>
                <p className="detail-copyright-note">未经授权的转发、分享、破解均属于侵权行为。</p>
              </div>
            </aside>

            <div className="detail-section">
              <h1 className="detail-template-title">{p.title}</h1>
              <div className="detail-kv-board">
                <div className="detail-kv-item">
                  <span className="k">主题ID号</span>
                  <span className="v">{p.id}</span>
                </div>
                <div className="detail-kv-item">
                  <span className="k">发布时间</span>
                  <span className="v">{p.created_at.slice(0, 10)}</span>
                </div>
                <div className="detail-kv-item">
                  <span className="k">最后更新</span>
                  <span className="v">{p.created_at.slice(0, 10)}</span>
                </div>
                <div className="detail-kv-item">
                  <span className="k">评分/热度</span>
                  <span className="v">
                    {scoreLabel} 分 / {hitLabel}
                  </span>
                </div>
              </div>

              <div className="detail-price-box">
                <div className="detail-template-price detail-price-compact">{formatMinor(p.price_minor, p.currency)}</div>
              </div>

              <div className="detail-template-tags detail-tags-row">
                <span className="detail-tag">{CATEGORY_LABEL[p.category] ?? p.category}</span>
                <span className="detail-tag">优质严选</span>
                <span className="detail-tag">源码开源</span>
                <span className="detail-tag">免费维护</span>
                <span className="detail-tag">无广告无捆绑</span>
              </div>

              <div className="action-buttons">
                <button type="button" className="detail-btn-primary" onClick={handleBuyNow}>
                  <i className="fas fa-shopping-cart" /> 立即购买
                </button>
                <button type="button" className="detail-btn-primary" onClick={handleAddCart}>
                  <i className="fas fa-cart-plus" /> 加入购物车
                </button>
                {p.preview_url ? (
                  <a
                    href={p.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-btn-secondary"
                  >
                    <i className="fas fa-eye" /> 查看演示
                  </a>
                ) : (
                  <span className="detail-btn-secondary detail-btn-muted">
                    <i className="fas fa-eye-slash" /> 暂无演示站点
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="detail-bottom-section">
            <div className="detail-tabs">
              <div className="tab-header">
                {(
                  [
                    ['description', '详情介绍'],
                    ['reviews', '移动端样式'],
                    ['features', '功能列表'],
                    ['changelog', '更新日志'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`tab-btn${tab === k ? ' active' : ''}`}
                    onClick={() => setTab(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={`tab-content${tab === 'description' ? ' active' : ''}`}>
                <div className="description-content">
                  <p>{p.description || '暂无长文介绍，请管理员在后台为该商品撰写详情。'}</p>
                  <p className="muted">
                    slug：<code>{p.slug}</code> · id：{p.id}
                  </p>
                </div>
              </div>

              <div className={`tab-content${tab === 'reviews' ? ' active' : ''}`}>
                <div className="description-content">
                  <p>移动端预览与截图区占位。接入设计稿后可在此挂载轮播或与详情图联动。</p>
                </div>
              </div>

              <div className={`tab-content${tab === 'features' ? ' active' : ''}`}>
                <div className="feature-grid">
                  {DETAIL_FEATURES.map((f) => (
                    <div key={f.title} className="feature-item">
                      <div className="feature-icon">
                        <i className={`fas ${f.icon}`} />
                      </div>
                      <div className="feature-text">
                        <h4>{f.title}</h4>
                        <p>{f.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`tab-content${tab === 'changelog' ? ' active' : ''}`}>
                <div className="changelog-item">
                  <div className="changelog-version">
                    v{p.sort_order} <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>(当前)</span>
                  </div>
                  <div className="changelog-date">{p.created_at.slice(0, 10)}</div>
                  <ul className="changelog-list">
                    <li>与 Moban Shop 商品 API 对齐</li>
                    <li>前台 React 前台复刻 list / detail 版式</li>
                    <li>购物车本地持久化</li>
                    <li>更多条目可在后台迭代商品说明</li>
                  </ul>
                </div>
              </div>
            </div>

            {related.length > 0 ? (
              <div className="related-templates">
                <h2 className="section-title">相关推荐</h2>
                <div className="detail-template-grid">
                  {related.map((r) => (
                    <div key={r.id} className="detail-template-card">
                      <div className="detail-template-img">
                        {r.image_url ? (
                          <ProductImage src={r.image_url} alt={r.title} width={240} height={160} />
                        ) : (
                          <div className="related-img-ph">
                            <i className="fas fa-image" />
                          </div>
                        )}
                        <div className="detail-template-badge">优选</div>
                      </div>
                      <div className="detail-template-content">
                        <div className="detail-template-title-sm">
                          <h3>{r.title}</h3>
                          <div className="detail-template-price-sm">
                            {formatMinor(r.price_minor, r.currency)}
                          </div>
                        </div>
                        <div className="detail-template-actions">
                          <span className="btn-preview detail-disabled-span">
                            <i className="fas fa-eye-slash" /> 预览
                          </span>
                          <Link to={`/products/${r.id}`} className="detail-btn-buy">
                            <i className="fas fa-shopping-cart" /> 购买
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </>
  )
}
