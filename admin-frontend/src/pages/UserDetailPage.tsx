import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminOrder, AdminUser, PaginatedList } from '../api/types'
import { Pagination } from '../components/Pagination'
import { useServerPagination } from '../hooks/useServerPagination'
import { formatDateTime, formatMoney, formatOrderStatus, orderStatusClass } from '../utils/format'

export default function UserDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const userId = Number(id)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [userErr, setUserErr] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setUserErr('无效用户 ID')
      return
    }
    let alive = true
    ;(async () => {
      try {
        const res = await adminApiFetch<AdminUser>(`/api/admin/users/${userId}`)
        if (alive) setUser(res)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) setUserErr(e.message)
        else setUserErr('加载失败')
      }
    })()
    return () => {
      alive = false
    }
  }, [userId])

  const fetchOrders = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      return adminApiFetch<PaginatedList<AdminOrder>>(`/api/admin/users/${userId}/orders?${q}`)
    },
    [userId],
  )

  const { page, setPage, items, total, totalPages, loading, err } = useServerPagination({
    fetchPage: fetchOrders,
    resetKey: userId,
  })

  if (userErr) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {userErr}
        </div>
        <Link to="/users" className="page-back">
          返回用户列表
        </Link>
      </div>
    )
  }

  if (!user) {
    return <div className="loading-state">加载中…</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Link to="/users" className="page-back">
            返回列表
          </Link>
          <h1>{user.email}</h1>
          <p className="page-header__desc">
            用户 ID {user.id} · 注册于 {formatDateTime(user.created_at)}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card__header">订单记录（{total} 笔）</div>
      </div>

      {err ? (
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      ) : loading && items.length === 0 ? (
        <div className="loading-state">加载订单…</div>
      ) : total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无订单</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>商品</th>
                <th>状态</th>
                <th>金额</th>
                <th>下单时间</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td className="muted">
                    <button type="button" className="linkish" onClick={() => nav(`/orders/${o.id}`)}>
                      {o.id}
                    </button>
                  </td>
                  <td>{o.items_summary || '—'}</td>
                  <td>
                    <span className={`badge ${orderStatusClass(o.status)}`}>{formatOrderStatus(o.status)}</span>
                  </td>
                  <td>{formatMoney(o.total_amount_minor, o.currency)}</td>
                  <td className="muted small">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
