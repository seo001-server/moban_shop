import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminAuditLog, PaginatedList } from '../api/types'
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_RESOURCE_OPTIONS,
  formatAuditAction,
  formatAuditResource,
} from '../lib/auditLog'
import { AuditResourceLink } from '../components/AuditResourceLink'
import { Pagination } from '../components/Pagination'
import { TableLoadingWrap } from '../components/TableLoadingWrap'
import { useServerPagination } from '../hooks/useServerPagination'
import { formatDateTime } from '../utils/format'

function readFilters(search: string) {
  const params = new URLSearchParams(search)
  return {
    action: params.get('action') ?? '',
    resource: params.get('resource') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
}

export default function AuditLogsPage() {
  const location = useLocation()
  const nav = useNavigate()
  const filters = useMemo(() => readFilters(location.search), [location.search])

  const filterKey = `${filters.action}|${filters.resource}|${filters.from}|${filters.to}`

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (filters.action) q.set('action', filters.action)
      if (filters.resource) q.set('resource', filters.resource)
      if (filters.from) q.set('from', filters.from)
      if (filters.to) q.set('to', filters.to)
      return adminApiFetch<PaginatedList<AdminAuditLog>>(`/api/admin/audit-logs?${q}`)
    },
    [filters],
  )

  const { page, setPage, items, total, totalPages, initialLoading, refreshing, err } = useServerPagination({
    fetchPage,
    resetKey: filterKey,
  })

  function patchFilters(patch: Partial<typeof filters>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    if (next.action) q.set('action', next.action)
    if (next.resource) q.set('resource', next.resource)
    if (next.from) q.set('from', next.from)
    if (next.to) q.set('to', next.to)
    const search = q.toString()
    nav({ pathname: '/audit-logs', search: search ? `?${search}` : '' }, { replace: true })
  }

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
            <h1>审计日志</h1>
            <p className="page-header__desc">管理员操作记录，共 {total} 条</p>
          </div>
          <div className="page-header__toolbar">
            <div className="filter-bar filter-bar--inline">
              <label className="filter-inline-field">
                <span className="filter-bar__label">操作</span>
                <select
                  className="admin-select admin-select--wide"
                  value={filters.action}
                  onChange={(e) => patchFilters({ action: e.target.value })}
                >
                  {AUDIT_ACTION_OPTIONS.map((o) => (
                    <option key={o.value || 'all-action'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-inline-field">
                <span className="filter-bar__label">资源</span>
                <select
                  className="admin-select admin-select--wide"
                  value={filters.resource}
                  onChange={(e) => patchFilters({ resource: e.target.value })}
                >
                  {AUDIT_RESOURCE_OPTIONS.map((o) => (
                    <option key={o.value || 'all-resource'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无审计记录</p>
            <p className="muted small">调整筛选条件或执行管理操作后在此查看</p>
          </div>
        </div>
      ) : (
        <TableLoadingWrap refreshing={refreshing}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>管理员</th>
                <th>操作</th>
                <th>资源</th>
                <th>资源 ID</th>
                <th>详情</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="muted small">{formatDateTime(row.created_at)}</td>
                  <td>
                    <span title={row.admin_account}>{row.admin_nickname}</span>
                  </td>
                  <td>{formatAuditAction(row.action)}</td>
                  <td>{formatAuditResource(row.resource)}</td>
                  <td>
                    <AuditResourceLink resource={row.resource} resourceId={row.resource_id} />
                  </td>
                  <td className="cell-ellipsis">
                    <span className="cell-ellipsis__inner" title={row.detail}>
                      {row.detail || '—'}
                    </span>
                  </td>
                  <td className="muted small">{row.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TableLoadingWrap>
      )}
    </div>
  )
}
