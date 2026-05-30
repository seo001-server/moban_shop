import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminUser, PaginatedList } from '../api/types'
import { Dialog } from '../components/Dialog'
import { Pagination } from '../components/Pagination'
import { TableLoadingWrap } from '../components/TableLoadingWrap'
import { UserOrdersPanel } from '../components/UserOrdersPanel'
import { useServerPagination } from '../hooks/useServerPagination'
import { useTabDocumentTitle } from '../tabs/useTabDocumentTitle'
import { formatDateTime } from '../utils/format'

type OrdersTarget = { id: number; email: string } | null

function readQuery(search: string) {
  return new URLSearchParams(search).get('q') ?? ''
}

export default function UsersPage() {
  const location = useLocation()
  const nav = useNavigate()
  const query = useMemo(() => readQuery(location.search), [location.search])
  const [ordersTarget, setOrdersTarget] = useState<OrdersTarget>(null)
  const [searchDraft, setSearchDraft] = useState(query)

  useEffect(() => {
    setSearchDraft(query)
  }, [query])

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (query.trim()) q.set('q', query.trim())
      return adminApiFetch<PaginatedList<AdminUser>>(`/api/admin/users?${q}`)
    },
    [query],
  )

  const { page, setPage, items, total, totalPages, initialLoading, refreshing, err } = useServerPagination({
    fetchPage,
    resetKey: query,
  })

  function patchQuery(next: string) {
    const q = new URLSearchParams()
    if (next.trim()) q.set('q', next.trim())
    const search = q.toString()
    nav({ pathname: '/users', search: search ? `?${search}` : '' }, { replace: true })
  }

  function applySearch() {
    patchQuery(searchDraft)
  }

  const dialogOpen = ordersTarget !== null
  const dialogTitle = ordersTarget ? `${ordersTarget.email} 的订单` : ''

  useTabDocumentTitle(ordersTarget ? ordersTarget.email : null, '/users')

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
            <h1>用户管理</h1>
            <p className="page-header__desc">商城前台注册用户，共 {total} 人</p>
          </div>
          <div className="page-header__toolbar">
            <form
              className="filter-search-group"
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                applySearch()
              }}
            >
              <span className="filter-bar__label">搜索</span>
              <input
                type="search"
                value={searchDraft}
                placeholder="邮箱或 MU… UID"
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              <button type="submit" className="btn small">
                搜索
              </button>
            </form>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无用户</p>
            <p className="muted small">调整搜索条件或等待用户注册</p>
          </div>
        </div>
      ) : (
        <TableLoadingWrap refreshing={refreshing}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>UID</th>
                <th>邮箱</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="muted">{u.id}</td>
                  <td>{u.user_no}</td>
                  <td>{u.email}</td>
                  <td className="muted small">{formatDateTime(u.created_at)}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => setOrdersTarget({ id: u.id, email: u.email })}
                    >
                      订单
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TableLoadingWrap>
      )}

      <Dialog open={dialogOpen} title={dialogTitle} onClose={() => setOrdersTarget(null)}>
        {ordersTarget ? <UserOrdersPanel userId={ordersTarget.id} userEmail={ordersTarget.email} /> : null}
      </Dialog>
    </div>
  )
}
