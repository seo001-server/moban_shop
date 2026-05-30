import { useCallback } from 'react'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminOrder, PaginatedList } from '../api/types'
import { Pagination } from './Pagination'
import { TableLoadingWrap } from './TableLoadingWrap'
import { useServerPagination } from '../hooks/useServerPagination'
import { formatDateTime, formatMoney, formatOrderStatus, formatPaidAt, orderStatusClass } from '../utils/format'

type UserOrdersPanelProps = {
  userId: number
  userEmail: string
}

export function UserOrdersPanel({ userId, userEmail }: UserOrdersPanelProps) {
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      return adminApiFetch<PaginatedList<AdminOrder>>(`/api/admin/users/${userId}/orders?${q}`)
    },
    [userId],
  )

  const { page, setPage, items, total, totalPages, initialLoading, refreshing, err } = useServerPagination({
    fetchPage,
    resetKey: userId,
  })

  if (err) {
    return (
      <div className="alert alert--error" role="alert">
        {err}
      </div>
    )
  }

  if (initialLoading) {
    return <div className="loading-state">加载订单…</div>
  }

  if (total === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">暂无订单</p>
        <p className="muted small">{userEmail} 还没有购买记录</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="muted small">共 {total} 笔订单</p>
      <TableLoadingWrap refreshing={refreshing}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>商品</th>
              <th>状态</th>
              <th>金额</th>
              <th>下单时间</th>
              <th>支付时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.items_summary || '—'}</td>
                <td>
                  <span className={`badge ${orderStatusClass(o.status)}`}>{formatOrderStatus(o.status)}</span>
                </td>
                <td>{formatMoney(o.total_amount_minor, o.currency)}</td>
                <td className="muted small">{formatDateTime(o.created_at)}</td>
                <td className="muted small">{formatPaidAt(o.status, o.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableLoadingWrap>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
