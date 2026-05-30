import { useCallback, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { BusinessItem, PaginatedList } from '../api/types'
import { BusinessFormPanel } from '../components/BusinessFormPanel'
import { Dialog } from '../components/Dialog'
import { Pagination } from '../components/Pagination'
import { useServerPagination } from '../hooks/useServerPagination'
import { BUSINESS_SECTION_OPTIONS, businessSectionLabel } from '../lib/businessSections'
import { useTabDocumentTitle } from '../tabs/useTabDocumentTitle'

type FormTarget = { mode: 'new' } | { mode: 'edit'; id: number }

export default function BusinessPage() {
  const [sectionFilter, setSectionFilter] = useState('')
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      })
      if (sectionFilter) q.set('section', sectionFilter)
      return adminApiFetch<PaginatedList<BusinessItem>>(`/api/admin/business?${q}`)
    },
    [sectionFilter],
  )

  const { page, setPage, items, total, totalPages, loading, err, reload } = useServerPagination({
    fetchPage,
    resetKey: sectionFilter,
  })

  async function onSaved() {
    setFormTarget(null)
    await reload()
  }

  async function remove(id: number) {
    if (!confirm('确认删除该业务产品？')) return
    try {
      await adminApiFetch(`/api/admin/business/${id}`, { method: 'DELETE' })
      await reload()
    } catch (e) {
      if (e instanceof ApiError) {
        alert(e.message)
      }
    }
  }

  const dialogOpen = formTarget !== null
  const dialogTitle =
    formTarget?.mode === 'new' ? '新建业务产品' : `编辑业务产品 #${formTarget?.mode === 'edit' ? formTarget.id : ''}`

  useTabDocumentTitle(
    formTarget?.mode === 'new'
      ? '新建'
      : formTarget?.mode === 'edit'
        ? `#${formTarget.id}`
        : null,
    '/business',
  )

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
              <h1>业务产品</h1>
              <p className="page-header__desc">管理各业务分类页展示条目，共 {total} 条</p>
          </div>
          <div className="page-header__toolbar">
              <div className="filter-bar filter-bar--inline" role="search">
                <span className="filter-bar__label">分类筛选</span>
                <div className="filter-segments" role="tablist" aria-label="按分类筛选业务产品">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sectionFilter === ''}
                    className={`filter-segment${sectionFilter === '' ? ' is-active' : ''}`}
                    onClick={() => setSectionFilter('')}
                  >
                    全部
                  </button>
                  {BUSINESS_SECTION_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      role="tab"
                      aria-selected={sectionFilter === o.value}
                      className={`filter-segment${sectionFilter === o.value ? ' is-active' : ''}`}
                      onClick={() => setSectionFilter(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="btn primary" onClick={() => setFormTarget({ mode: 'new' })}>
                新建产品
              </button>
            </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无业务产品</p>
            <p className="muted small">为程序、落地、CDN 等分类添加展示条目</p>
            <button type="button" className="btn primary" style={{ marginTop: '1rem' }} onClick={() => setFormTarget({ mode: 'new' })}>
              新建产品
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table admin-table--business">
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '42%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>分类</th>
                <th>标题</th>
                <th>描述</th>
                <th>排序</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{item.id}</td>
                  <td>
                    <span className="badge">{businessSectionLabel(item.section_slug)}</span>
                  </td>
                  <td className="cell-ellipsis">
                    <span className="cell-ellipsis__inner">
                      <strong>{item.title}</strong>
                    </span>
                  </td>
                  <td className="cell-ellipsis">
                    <span className="cell-ellipsis__inner">{item.description}</span>
                  </td>
                  <td className="muted">{item.sort_order}</td>
                  <td className="actions">
                    <div className="row gap">
                      <button type="button" className="btn small" onClick={() => setFormTarget({ mode: 'edit', id: item.id })}>
                        编辑
                      </button>
                      <button type="button" className="btn small danger" onClick={() => void remove(item.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={dialogOpen} title={dialogTitle} onClose={() => setFormTarget(null)}>
        {formTarget ? (
          <BusinessFormPanel
            itemId={formTarget.mode === 'new' ? 'new' : formTarget.id}
            onCancel={() => setFormTarget(null)}
            onSaved={() => void onSaved()}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
