import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { BusinessSectionMeta } from '../api/types'
import { BusinessSectionFormPanel } from '../components/BusinessSectionFormPanel'
import { Dialog } from '../components/Dialog'

export default function BusinessSectionsPage() {
  const [items, setItems] = useState<BusinessSectionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [editSlug, setEditSlug] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await adminApiFetch<BusinessSectionMeta[]>('/api/admin/business-sections')
      setItems(data)
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('加载失败')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

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
      <div className="page-header">
        <div className="page-header__text">
          <h1>业务板块</h1>
          <p className="page-header__desc">管理前台导航与各板块页标题、图标与描述（slug 固定）</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Slug</th>
              <th>名称</th>
              <th>图标</th>
              <th>副标题</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.slug}>
                <td className="muted">{item.slug}</td>
                <td>
                  <strong>{item.label}</strong>
                </td>
                <td className="muted">{item.icon}</td>
                <td className="cell-ellipsis">
                  <span className="cell-ellipsis__inner">{item.tagline}</span>
                </td>
                <td className="muted">{item.sort_order}</td>
                <td>
                  <span className={`badge${item.enabled ? ' badge--yes' : ' badge--muted'}`}>
                    {item.enabled ? '显示' : '隐藏'}
                  </span>
                </td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => setEditSlug(item.slug)}>
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editSlug !== null}
        title={editSlug ? `编辑板块 · ${editSlug}` : '编辑板块'}
        onClose={() => setEditSlug(null)}
      >
        {editSlug ? (
          <BusinessSectionFormPanel
            slug={editSlug}
            onCancel={() => setEditSlug(null)}
            onSaved={() => {
              setEditSlug(null)
              void reload()
            }}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
