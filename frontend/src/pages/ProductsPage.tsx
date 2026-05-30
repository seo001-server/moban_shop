import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { Product } from '../api/types'
import { formatMinor } from '../util/money'
import { parseCat, parseSort, type CatalogCat, type CatalogSort } from '../lib/productsQuery'
import { normalizeProduct } from '../lib/normalizeProduct'

const PAGE_SIZE = 6

function qs(cat: CatalogCat, sort: CatalogSort, page: number) {
  const p = new URLSearchParams()
  if (cat !== 'all') p.set('cat', cat)
  if (sort) p.set('sort', sort)
  if (page > 1) p.set('page', String(page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

function badgeFor(p: Product): string {
  if (p.recommended === true) return '推荐'
  const t = new Date(p.created_at).getTime()
  const days = (Date.now() - t) / (86400 * 1000)
  if (days <= 3) return '新品'
  if (p.sort_order <= 1) return '热卖中'
  return ''
}

function formatScore(s: number): string {
  const n = Number(s)
  return Number.isFinite(n) ? n.toFixed(1) : '0.0'
}

function productsApiPath(cat: CatalogCat, sort: CatalogSort): string {
  const p = new URLSearchParams()
  if (cat !== 'all') p.set('category', cat)
  if (sort) p.set('sort', sort)
  const qs = p.toString()
  return qs ? `/api/products?${qs}` : '/api/products'
}

type CatalogPanelProps = {
  cat: CatalogCat
  sort: CatalogSort
  page: number
  setSearchParams: ReturnType<typeof useSearchParams>[1]
}

/**
 * key={cat} 由父组件传入：切换分类时卸载重装，直接进入「加载中」且 effect 发起新请求（不在 effect 开头同步清空 state，以满足 react-hooks/set-state-in-effect）。
 */
function ProductsCatalogPanel({ cat, sort, page, setSearchParams }: CatalogPanelProps) {
  const [all, setAll] = useState<Product[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch<Product[]>(productsApiPath(cat, sort))
        if (!alive) return
        setAll(data.map(normalizeProduct))
        setErr(null)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
        setAll([])
      }
    })()
    return () => {
      alive = false
    }
  }, [cat, sort])

  const filtered = useMemo(() => all ?? [], [all])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, pageSafe])

  function setPage(next: number) {
    const p = new URLSearchParams()
    if (cat !== 'all') p.set('cat', cat)
    if (sort) p.set('sort', sort)
    if (next > 1) p.set('page', String(next))
    setSearchParams(p)
  }

  useEffect(() => {
    if (all === null || page <= totalPages) return
    const p = new URLSearchParams()
    if (cat !== 'all') p.set('cat', cat)
    if (sort) p.set('sort', sort)
    if (totalPages > 1) p.set('page', String(totalPages))
    setSearchParams(p)
  }, [all, cat, page, sort, totalPages, setSearchParams])

  if (err) {
    return (
      <p className="error" role="alert">
        {err}
      </p>
    )
  }

  if (all === null) {
    return (
      <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
        加载中…
      </p>
    )
  }

  return (
    <>
      <div className="results-info">
        共匹配 <strong>{filtered.length}</strong> 套模板
      </div>
      <div className="list-grid">
        {pageSlice.map((p) => {
          const badge = badgeFor(p)
          return (
            <Link key={p.id} className="list-item" to={`/products/${p.id}`}>
              {badge ? <span className="item-badge">{badge}</span> : null}
              <div className="item-price">{formatMinor(p.price_minor, p.currency)}</div>
              <div className="item-img">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} />
                ) : (
                  <div className="list-item-img-ph">
                    <i className="fas fa-image" />
                  </div>
                )}
              </div>
              <div className="item-info">
                <div className="item-title">
                  <h3>{p.title}</h3>
                </div>
                {p.description ? <p className="item-desc">{p.description}</p> : (
                  <p className="item-desc muted">暂无简介</p>
                )}
                            <div className="item-meta">
                              <span>
                                <i className="fas fa-download" /> {p.downloads.toLocaleString('zh-Hans-CN')} 下载
                              </span>
                              <span>
                                <i className="fas fa-star" /> {formatScore(p.score)} 分
                              </span>
                            </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="results-info">暂无数据，换一个分类试试吧。</p>
      ) : null}

      {totalPages > 1 ? (
        <div className="pagination">
          <button
            type="button"
            className={`page-link${pageSafe <= 1 ? ' disabled' : ''}`}
            disabled={pageSafe <= 1}
            onClick={() => setPage(pageSafe - 1)}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              to={`/products${qs(cat, sort, n)}`}
              className={`page-link${n === pageSafe ? ' active' : ''}`}
            >
              {n}
            </Link>
          ))}
          <button
            type="button"
            className={`page-link${pageSafe >= totalPages ? ' disabled' : ''}`}
            disabled={pageSafe >= totalPages}
            onClick={() => setPage(pageSafe + 1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cat = parseCat(searchParams.get('cat'))
  const sort = parseSort(searchParams.get('sort'))
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  return (
    <>
      <section className="breadcrumb breadcrumb-compact">
        <div className="container">
          <div className="breadcrumb-content">
            <Link to="/">
              <i className="fas fa-home" /> 首页
            </Link>
            <i className="fas fa-chevron-right" />
            <span>模板商城</span>
          </div>
        </div>
      </section>

      <section className="list-page">
        <div className="container">
          <div className="components-container">
            <div className="component-card filters-card-shell">
              <div className="component-title">
                <h2>
                  <i className="fas fa-filter" /> 模板筛选
                </h2>
              </div>
              <div className="filter-box">
                <div className="filter-title">
                  <h3>模板分类</h3>
                </div>
                <div className="filter-group">
                  <div className="filter-options">
                    <Link
                      to={`/products${qs('all', sort, 1)}`}
                      className={cat === 'all' ? 'filter-option active' : 'filter-option'}
                    >
                      全部
                    </Link>
                    <Link
                      to={`/products${qs('film', sort, 1)}`}
                      className={cat === 'film' ? 'filter-option active' : 'filter-option'}
                    >
                      影视娱乐
                    </Link>
                    <Link
                      to={`/products${qs('book', sort, 1)}`}
                      className={cat === 'book' ? 'filter-option active' : 'filter-option'}
                    >
                      小说阅读
                    </Link>
                    <Link
                      to={`/products${qs('game', sort, 1)}`}
                      className={cat === 'game' ? 'filter-option active' : 'filter-option'}
                    >
                      游戏社区
                    </Link>
                    <Link
                      to={`/products${qs('shop', sort, 1)}`}
                      className={cat === 'shop' ? 'filter-option active' : 'filter-option'}
                    >
                      商城导购
                    </Link>
                  </div>
                </div>
              </div>

              <div className="filter-box">
                <div className="filter-title">
                  <h3>排序</h3>
                </div>
                <div className="filter-group">
                  <div className="filter-options">
                    <Link
                      to={`/products${qs(cat, '', 1)}`}
                      className={sort === '' ? 'filter-option active' : 'filter-option'}
                    >
                      综合
                    </Link>
                    <Link
                      to={`/products${qs(cat, 'time', 1)}`}
                      className={sort === 'time' ? 'filter-option active' : 'filter-option'}
                    >
                      时间
                    </Link>
                    <Link
                      to={`/products${qs(cat, 'hits', 1)}`}
                      className={sort === 'hits' ? 'filter-option active' : 'filter-option'}
                    >
                      人气
                    </Link>
                    <Link
                      to={`/products${qs(cat, 'score', 1)}`}
                      className={sort === 'score' ? 'filter-option active' : 'filter-option'}
                    >
                      评分
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <main className="list-content">
              <ProductsCatalogPanel
                key={`${cat}:${sort}`}
                cat={cat}
                sort={sort}
                page={page}
                setSearchParams={setSearchParams}
              />
            </main>
          </div>
        </div>
      </section>
    </>
  )
}
