import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { BusinessSectionMeta } from '../api/types'
import { IconPickerField } from './IconPickerField'
import { useToast } from './Toast'

type Props = {
  slug: string
  onCancel: () => void
  onSaved: () => void
}

export function BusinessSectionFormPanel({ slug, onCancel, onSaved }: Props) {
  const { showToast } = useToast()
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('fa-circle')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const item = await adminApiFetch<BusinessSectionMeta>(`/api/admin/business-sections/${slug}`)
        if (!alive) return
        setLabel(item.label)
        setIcon(item.icon)
        setTagline(item.tagline)
        setDescription(item.description)
        setSortOrder(item.sort_order)
        setEnabled(item.enabled)
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
  }, [slug])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSaving(true)
    try {
      await adminApiFetch(`/api/admin/business-sections/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({
          label,
          icon,
          tagline,
          description,
          sort_order: sortOrder,
          enabled,
        }),
      })
      showToast('已保存', 'success')
      onSaved()
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('保存失败')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading-state">加载中…</div>
  }

  if (err && !label) {
    return (
      <div className="alert alert--error" role="alert">
        {err}
      </div>
    )
  }

  return (
    <form className="stack form" onSubmit={(ev) => void onSubmit(ev)}>
      <div className="form-grid form-grid--2">
        <label>
          Slug
          <input type="text" value={slug} readOnly disabled />
        </label>
        <label>
          名称
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
      </div>
      <div className="form-grid form-grid--icon-row">
        <IconPickerField value={icon} onChange={setIcon} />
        <div className="form-icon-row__right">
          <label>
            排序
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </label>
          <div className="toggle-field">
            <span className="form-metrics-row__label">是否显示</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              className={`toggle-switch${enabled ? ' is-on' : ''}`}
              onClick={() => setEnabled((v) => !v)}
            >
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
              <span className="toggle-switch__text">{enabled ? '显示' : '隐藏'}</span>
            </button>
          </div>
        </div>
      </div>
      <label>
        副标题
        <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </label>
      <label>
        描述
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
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
