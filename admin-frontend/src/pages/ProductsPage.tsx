import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { PaginatedList, Product, ProductBatchDeleteResult } from '../api/types'
import { Dialog } from '../components/Dialog'
import { Pagination } from '../components/Pagination'
import { ProductFormPanel } from '../components/ProductFormPanel'
import { TableLoadingWrap } from '../components/TableLoadingWrap'
import { useConfirm } from '../components/ConfirmDialog'
import { useServerPagination } from '../hooks/useServerPagination'
import { useTabDocumentTitle } from '../tabs/useTabDocumentTitle'
import { useToast } from '../components/Toast'

const CATEGORY_LABELS: Record<string, string> = {
  film: '影视',
  book: '阅读',
  game: '游戏',
  shop: '商城',
}

const CATEGORY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'film', label: '影视' },
  { value: 'book', label: '阅读' },
  { value: 'game', label: '游戏' },
  { value: 'shop', label: '商城' },
] as const

const RECOMMENDED_OPTIONS = [
  { value: '', label: '全部' },
  { value: '1', label: '推荐' },
  { value: '0', label: '非推荐' },
] as const

type FormTarget = { mode: 'new' } | { mode: 'edit'; id: number }

function readFilters(search: string) {
  const params = new URLSearchParams(search)
  return {
    category: params.get('category') ?? '',
    recommended: params.get('recommended') ?? '',
    q: params.get('q') ?? '',
  }
}

export default function ProductsPage() {
  const nav = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const filters = useMemo(() => readFilters(location.search), [location.search])
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [searchDraft, setSearchDraft] = useState(filters.q)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [togglingVisibleId, setTogglingVisibleId] = useState<number | null>(null)

  const filterKey = `${filters.category}|${filters.recommended}|${filters.q}`

  useEffect(() => {
    setSearchDraft(filters.q)
  }, [filters.q])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filterKey])

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (filters.category) q.set('category', filters.category)
      if (filters.recommended) q.set('recommended', filters.recommended)
      if (filters.q.trim()) q.set('q', filters.q.trim())
      return adminApiFetch<PaginatedList<Product>>(`/api/admin/products?${q}`)
    },
    [filters],
  )

  const { page, setPage, items, total, totalPages, initialLoading, refreshing, err, reload } = useServerPagination({
    fetchPage,
    resetKey: filterKey,
  })

  useEffect(() => {
    const editId = (location.state as { editId?: number } | null)?.editId
    if (editId && editId > 0) {
      setFormTarget({ mode: 'edit', id: editId })
      nav('/templates', { replace: true, state: null })
    }
  }, [location.state, nav])

  function patchFilters(patch: Partial<typeof filters>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    if (next.category) q.set('category', next.category)
    if (next.recommended) q.set('recommended', next.recommended)
    if (next.q.trim()) q.set('q', next.q.trim())
    const search = q.toString()
    nav({ pathname: '/templates', search: search ? `?${search}` : '' }, { replace: true })
  }

  function applySearch() {
    patchFilters({ q: searchDraft })
  }

  function closeForm() {
    setFormTarget(null)
  }

  async function onSaved() {
    closeForm()
    await reload()
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: '删除模板',
      message: '确认删除该商品？此操作不可撤销。',
      confirmLabel: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await adminApiFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      showToast('模板已删除', 'success')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await reload()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '删除失败', 'error')
    }
  }

  const pageIds = items.map((p) => p.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchSetRecommended(recommended: boolean) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBatchBusy(true)
    try {
      await adminApiFetch('/api/admin/products/batch-recommended', {
        method: 'POST',
        body: JSON.stringify({ ids, recommended }),
      })
      showToast(recommended ? `已设为推荐（${ids.length} 个）` : `已取消推荐（${ids.length} 个）`, 'success')
      setSelectedIds(new Set())
      await reload()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '批量更新失败', 'error')
    } finally {
      setBatchBusy(false)
    }
  }

  async function batchDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const ok = await confirm({
      title: '批量删除模板',
      message: `确认删除选中的 ${ids.length} 个模板？已有订单引用的模板将自动跳过。`,
      confirmLabel: '删除',
      danger: true,
    })
    if (!ok) return
    setBatchBusy(true)
    try {
      const res = await adminApiFetch<ProductBatchDeleteResult>('/api/admin/products/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      if (res.deleted.length > 0) {
        showToast(`已删除 ${res.deleted.length} 个模板`, 'success')
      }
      if (res.blocked.length > 0) {
        showToast(`${res.blocked.length} 个模板因订单引用无法删除`, 'warning')
      }
      setSelectedIds(new Set())
      await reload()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '批量删除失败', 'error')
    } finally {
      setBatchBusy(false)
    }
  }

  async function toggleVisible(id: number, next: boolean) {
    setTogglingVisibleId(id)
    try {
      await adminApiFetch(`/api/admin/products/${id}/visible`, {
        method: 'PATCH',
        body: JSON.stringify({ visible: next }),
      })
      showToast(next ? '已设为前台展示' : '已隐藏，前台不可见', 'success')
      await reload()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '更新失败', 'error')
    } finally {
      setTogglingVisibleId(null)
    }
  }

  async function duplicate(id: number) {
    try {
      const copy = await adminApiFetch<Product>(`/api/admin/products/${id}/duplicate`, { method: 'POST' })
      showToast(`已复制为 #${copy.id}`, 'success')
      await reload()
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '复制失败', 'error')
    }
  }

  const dialogOpen = formTarget !== null
  const dialogTitle =
    formTarget?.mode === 'new' ? '新建模板' : `编辑模板 #${formTarget?.mode === 'edit' ? formTarget.id : ''}`

  useTabDocumentTitle(
    formTarget?.mode === 'new'
      ? '新建'
      : formTarget?.mode === 'edit'
        ? `#${formTarget.id}`
        : null,
    '/templates',
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

  if (initialLoading) {
    return <div className="loading-state">加载中…</div>
  }

  return (
    <div className="page">
      {confirmDialog}
      <div className="page-header page-header--toolbar">
        <div className="page-header__text">
          <div className="page-header__title-row">
            <h1>模板管理</h1>
            <p className="page-header__desc">管理商城模板商品，共 {total} 个</p>
          </div>
          <div className="page-header__toolbar">
            <div className="filter-bar filter-bar--inline" role="search">
              <span className="filter-bar__label">类目</span>
              <div className="filter-segments" role="tablist" aria-label="按类目筛选">
                {CATEGORY_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={filters.category === o.value}
                    className={`filter-segment${filters.category === o.value ? ' is-active' : ''}`}
                    onClick={() => patchFilters({ category: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-bar filter-bar--inline">
              <span className="filter-bar__label">推荐</span>
              <div className="filter-segments" role="tablist" aria-label="按推荐筛选">
                {RECOMMENDED_OPTIONS.map((o) => (
                  <button
                    key={o.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={filters.recommended === o.value}
                    className={`filter-segment${filters.recommended === o.value ? ' is-active' : ''}`}
                    onClick={() => patchFilters({ recommended: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
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
                placeholder="标题或 slug"
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              <button type="submit" className="btn small">
                搜索
              </button>
            </form>
            <button type="button" className="btn primary" onClick={() => setFormTarget({ mode: 'new' })}>
              新建模板
            </button>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">暂无模板</p>
            <p className="muted small">调整筛选条件或创建第一个模板</p>
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setFormTarget({ mode: 'new' })}
            >
              新建模板
            </button>
          </div>
        </div>
      ) : (
        <>
          {selectedIds.size > 0 ? (
            <div className="batch-toolbar">
              <span className="batch-toolbar__count">已选 {selectedIds.size} 项</span>
              <button type="button" className="btn small" disabled={batchBusy} onClick={() => void batchSetRecommended(true)}>
                设为推荐
              </button>
              <button type="button" className="btn small" disabled={batchBusy} onClick={() => void batchSetRecommended(false)}>
                取消推荐
              </button>
              <button type="button" className="btn small danger" disabled={batchBusy} onClick={() => void batchDelete()}>
                批量删除
              </button>
              <button type="button" className="btn small" disabled={batchBusy} onClick={() => setSelectedIds(new Set())}>
                取消选择
              </button>
            </div>
          ) : null}
          <TableLoadingWrap refreshing={refreshing}>
          <table className="admin-table admin-table--templates">
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="admin-table__check-col">
                  <input
                    type="checkbox"
                    aria-label="全选当前页"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allPageSelected && somePageSelected
                    }}
                    onChange={toggleSelectAllOnPage}
                  />
                </th>
                <th>ID</th>
                <th>标题</th>
                <th className="thumb-col">缩略图</th>
                <th>类目</th>
                <th>推荐</th>
                <th>展示</th>
                <th>价格</th>
                <th>预览地址</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="admin-table__check-col">
                    <input
                      type="checkbox"
                      aria-label={`选择模板 #${p.id}`}
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="muted">{p.id}</td>
                  <td className="cell-ellipsis">
                    <span className="cell-ellipsis__inner" title={p.title}>
                      <strong>{p.title}</strong>
                    </span>
                  </td>
                  <td className="thumb-col">
                    {p.image_url ? (
                      <img className="template-thumb" src={p.image_url} alt={p.title} loading="lazy" />
                    ) : (
                      <span className="template-thumb template-thumb--empty" aria-hidden="true">
                        无图
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                  </td>
                  <td>
                    {p.recommended ? (
                      <span className="badge badge--yes">推荐</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.visible}
                      aria-label={p.visible ? '前台展示中，点击隐藏' : '已隐藏，点击展示'}
                      disabled={togglingVisibleId === p.id}
                      className={`toggle-switch toggle-switch--compact${p.visible ? ' is-on' : ''}`}
                      onClick={() => void toggleVisible(p.id, !p.visible)}
                    >
                      <span className="toggle-switch__track">
                        <span className="toggle-switch__thumb" />
                      </span>
                      <span className="toggle-switch__text">{p.visible ? '展示' : '隐藏'}</span>
                    </button>
                  </td>
                  <td className="cell-ellipsis">
                    <span className="cell-ellipsis__inner">
                      {p.currency} {(p.price_minor / 100).toFixed(2)}
                    </span>
                  </td>
                  <td className="cell-ellipsis">
                    {p.preview_url ? (
                      <a
                        href={p.preview_url}
                        target="_blank"
                        rel="noreferrer"
                        className="cell-ellipsis__inner preview-link"
                        title={p.preview_url}
                      >
                        {p.preview_url}
                      </a>
                    ) : (
                      <span className="cell-ellipsis__inner muted">—</span>
                    )}
                  </td>
                  <td className="actions">
                    <div className="row gap">
                      <button type="button" className="btn small" onClick={() => setFormTarget({ mode: 'edit', id: p.id })}>
                        编辑
                      </button>
                      <button type="button" className="btn small" onClick={() => void duplicate(p.id)}>
                        复制
                      </button>
                      <button type="button" className="btn small danger" onClick={() => void remove(p.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TableLoadingWrap>
        </>
      )}

      <Dialog open={dialogOpen} title={dialogTitle} onClose={closeForm}>
        {formTarget ? (
          <ProductFormPanel
            productId={formTarget.mode === 'new' ? 'new' : formTarget.id}
            onCancel={closeForm}
            onSaved={() => void onSaved()}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
