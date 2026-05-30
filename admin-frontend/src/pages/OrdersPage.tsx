import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminOrder, PaginatedList } from '../api/types'
import { Dialog } from '../components/Dialog'
import { OrderDetailPanel } from '../components/OrderDetailPanel'
import { Pagination } from '../components/Pagination'
import { TableLoadingWrap } from '../components/TableLoadingWrap'
import { useServerPagination } from '../hooks/useServerPagination'
import { useTabDocumentTitle } from '../tabs/useTabDocumentTitle'
import { formatDateTime, formatMoney, formatOrderStatus, formatPaidAt, orderStatusClass } from '../utils/format'

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
] as const

function readFilters(search: string) {
  const params = new URLSearchParams(search)
  return {
    status: params.get('status') ?? '',
    order_no: params.get('order_no') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
}

export default function OrdersPage() {
  const location = useLocation()
  const nav = useNavigate()
  const filters = useMemo(() => readFilters(location.search), [location.search])
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null)
  const [orderNoDraft, setOrderNoDraft] = useState(filters.order_no)

  useEffect(() => {
    setOrderNoDraft(filters.order_no)
  }, [filters.order_no])

  const filterKey = `${filters.status}|${filters.order_no}|${filters.from}|${filters.to}`

  const buildQuery = useCallback(
    (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (filters.status) q.set('status', filters.status)
      if (filters.order_no.trim()) q.set('order_no', filters.order_no.trim())
      if (filters.from) q.set('from', filters.from)
      if (filters.to) q.set('to', filters.to)
      return q
    },
    [filters],
  )

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = buildQuery(page, pageSize)
      return adminApiFetch<PaginatedList<AdminOrder>>(`/api/admin/orders?${q}`)
    },
    [buildQuery],
  )

  const { page, setPage, items, total, totalPages, initialLoading, refreshing, err, reload } = useServerPagination({
    fetchPage,
    resetKey: filterKey,
  })

  useEffect(() => {
    if (!filters.order_no.trim() || items.length !== 1) return
    setDetailOrderId(items[0].id)
  }, [filters.order_no, items])

  function patchFilters(patch: Partial<typeof filters>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    if (next.status) q.set('status', next.status)
    if (next.order_no.trim()) q.set('order_no', next.order_no.trim())
    if (next.from) q.set('from', next.from)
    if (next.to) q.set('to', next.to)
    const search = q.toString()
    nav({ pathname: '/orders', search: search ? `?${search}` : '' }, { replace: true })
  }

  const detailOrder = detailOrderId ? items.find((o) => o.id === detailOrderId) : null
  const dialogOpen = detailOrderId !== null
  const dialogTitle = detailOrder ? `订单详情 ${detailOrder.order_no}` : '订单详情'

  useTabDocumentTitle(detailOrder?.order_no ?? null, '/orders')

  if (err) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return <div className="loading-state">加载中…</div>
  }

  return (
    <div className="page">
      <div className="page-header page-header--toolbar">
        <div className="page-header__text">
          <div className="page-header__title-row">
            <h1>订单管理</h1>
            <p className="page-header__desc">用户购买记录，共 {total} 笔</p>
          </div>
          <div className="page-header__toolbar">
            <div className="filter-bar filter-bar--inline" role="search">
              <span className="filter-bar__label">状态</span>
              <div className="filter-segments" role="tablist" aria-label="按状态筛选订单">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={filters.status === o.value}
                    className={`filter-segment${filters.status === o.value ? ' is-active' : ''}`}
                    onClick={() => patchFilters({ status: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-bar filter-bar--inline">
              <form
                className="filter-search-group"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault()
                  patchFilters({ order_no: orderNoDraft })
                }}
              >
                <label className="filter-inline-field">
                  <span className="filter-bar__label">订单号</span>
                  <input
                    type="search"
                    value={orderNoDraft}
                    placeholder="如 MS260529…"
                    onChange={(e) => setOrderNoDraft(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn small">
                  搜索
                </button>
              </form>
              <label className="filter-inline-field">
                <span className="filter-bar__label">起始日期</span>
                <input type="date" value={filters.from} onChange={(e) => patchFilters({ from: e.target.value })} />
              </label>
              <label className="filter-inline-field">
                <span className="filter-bar__label">结束日期</span>
                <input type="date" value={filters.to} onChange={(e) => patchFilters({ to: e.target.value })} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无订单</p>
            <p className="muted small">调整筛选条件或等待前台产生订单</p>
          </div>
        </div>
      ) : (
        <TableLoadingWrap refreshing={refreshing}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>用户</th>
                <th>商品</th>
                <th>件数</th>
                <th>状态</th>
                <th>金额</th>
                <th>下单时间</th>
                <th>支付时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_no}</td>
                  <td>{o.user_email}</td>
                  <td>{o.items_summary || '—'}</td>
                  <td className="muted">{o.item_count}</td>
                  <td>
                    <span className={`badge ${orderStatusClass(o.status)}`}>{formatOrderStatus(o.status)}</span>
                  </td>
                  <td>{formatMoney(o.total_amount_minor, o.currency)}</td>
                  <td className="muted small">{formatDateTime(o.created_at)}</td>
                  <td className="muted small">{formatPaidAt(o.status, o.updated_at)}</td>
                  <td className="actions">
                    <button type="button" className="btn small" onClick={() => setDetailOrderId(o.id)}>
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TableLoadingWrap>
      )}

      <Dialog open={dialogOpen} title={dialogTitle} onClose={() => setDetailOrderId(null)}>
        {detailOrderId ? (
          <OrderDetailPanel
            orderId={detailOrderId}
            onUpdated={() => {
              void reload()
            }}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
