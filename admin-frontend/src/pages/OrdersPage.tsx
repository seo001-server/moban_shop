import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import { adminApiDownload, adminApiFetch } from '../api/adminHttp'
import type { AdminOrder, PaginatedList } from '../api/types'
import { Dialog } from '../components/Dialog'
import { OrderDetailPanel } from '../components/OrderDetailPanel'
import { Pagination } from '../components/Pagination'
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
    q: params.get('q') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
}

export default function OrdersPage() {
  const location = useLocation()
  const nav = useNavigate()
  const filters = useMemo(() => readFilters(location.search), [location.search])
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const filterKey = `${filters.status}|${filters.q}|${filters.from}|${filters.to}`

  const buildQuery = useCallback(
    (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (filters.status) q.set('status', filters.status)
      if (filters.q.trim()) q.set('q', filters.q.trim())
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

  const { page, setPage, items, total, totalPages, loading, err, reload } = useServerPagination({
    fetchPage,
    resetKey: filterKey,
  })

  function patchFilters(patch: Partial<typeof filters>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    if (next.status) q.set('status', next.status)
    if (next.q.trim()) q.set('q', next.q.trim())
    if (next.from) q.set('from', next.from)
    if (next.to) q.set('to', next.to)
    const search = q.toString()
    nav({ pathname: '/orders', search: search ? `?${search}` : '' }, { replace: true })
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const q = buildQuery(1, 1)
      q.delete('page')
      q.delete('page_size')
      const blob = await adminApiDownload(`/api/admin/orders/export?${q}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const dialogOpen = detailOrderId !== null
  const dialogTitle = detailOrderId ? `订单详情 #${detailOrderId}` : ''

  useTabDocumentTitle(detailOrderId ? `#${detailOrderId}` : null, '/orders')

  if (err) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      </div>
    )
  }

  if (loading && items.length === 0) {
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
              <label className="filter-inline-field">
                <span className="filter-bar__label">用户邮箱</span>
                <input
                  type="search"
                  value={filters.q}
                  placeholder="搜索邮箱"
                  onChange={(e) => patchFilters({ q: e.target.value })}
                />
              </label>
              <label className="filter-inline-field">
                <span className="filter-bar__label">起始日期</span>
                <input type="date" value={filters.from} onChange={(e) => patchFilters({ from: e.target.value })} />
              </label>
              <label className="filter-inline-field">
                <span className="filter-bar__label">结束日期</span>
                <input type="date" value={filters.to} onChange={(e) => patchFilters({ to: e.target.value })} />
              </label>
            </div>
            <button type="button" className="btn" disabled={exporting} onClick={() => void exportCsv()}>
              {exporting ? '导出中…' : '导出 CSV'}
            </button>
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
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
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
                  <td className="muted">{o.id}</td>
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
        </div>
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
