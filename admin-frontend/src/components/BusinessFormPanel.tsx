import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { BusinessItem } from '../api/types'
import { BUSINESS_SECTION_OPTIONS } from '../lib/businessSections'
import { useToast } from './Toast'

type BusinessFormPanelProps = {
  itemId: number | 'new'
  onCancel: () => void
  onSaved: () => void
}

export function BusinessFormPanel({ itemId, onCancel, onSaved }: BusinessFormPanelProps) {
  const isNew = itemId === 'new'
  const { showToast } = useToast()

  const [sectionSlug, setSectionSlug] = useState<BusinessItem['section_slug']>('program')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [loading, setLoading] = useState(!isNew)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) {
      setSectionSlug('program')
      setTitle('')
      setDescription('')
      setSortOrder(0)
      setLoading(false)
      setErr(null)
      return
    }

    let alive = true
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const item = await adminApiFetch<BusinessItem>(`/api/admin/business/${itemId}`)
        if (!alive) return
        setSectionSlug(item.section_slug)
        setTitle(item.title)
        setDescription(item.description)
        setSortOrder(item.sort_order)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) {
          setErr(e.message)
        } else {
          setErr('加载失败')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [isNew, itemId])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSaving(true)
    const body = {
      section_slug: sectionSlug,
      title,
      description,
      sort_order: sortOrder,
    }

    try {
      if (isNew) {
        await adminApiFetch('/api/admin/business', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      } else {
        await adminApiFetch(`/api/admin/business/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      }
      showToast(isNew ? '业务产品创建成功' : '业务产品保存成功', 'success')
      onSaved()
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '保存失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading-state">加载中…</div>
  }

  return (
    <form className="stack form" onSubmit={onSubmit}>
      <div className="form-grid form-grid--2">
        <label>
          所属分类
          <select value={sectionSlug} onChange={(e) => setSectionSlug(e.target.value as BusinessItem['section_slug'])}>
            {BUSINESS_SECTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          排序数字
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
          />
        </label>
      </div>
      <label>
        标题
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        描述
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
      </label>

      {err ? (
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      ) : null}

      <div className="form-actions row gap">
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}
