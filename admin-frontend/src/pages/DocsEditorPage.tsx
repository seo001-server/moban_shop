import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { DocDetail } from '../api/types'
import { useToast } from '../components/Toast'

export default function DocsEditorPage() {
  const { slug = 'template-dev' } = useParams<{ slug: string }>()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const doc = await adminApiFetch<DocDetail>(`/api/admin/docs/${encodeURIComponent(slug)}`)
        if (!alive) return
        setTitle(doc.title)
        setMarkdown(doc.markdown)
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

  const previewMd = useMemo(() => markdown, [markdown])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await adminApiFetch(`/api/admin/docs/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify({ title, markdown }),
      })
      showToast('已保存', 'success')
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

  if (err && !title && !markdown) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {err}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header page-header--toolbar">
        <div className="page-header__text">
          <div className="page-header__title-row">
            <h1>文档编辑</h1>
            <p className="page-header__desc">slug: {slug} · 前台 /docs 读取此内容</p>
          </div>
          <div className="page-header__toolbar">
            <button type="button" className={`btn small${preview ? ' primary' : ''}`} onClick={() => setPreview(true)}>
              预览
            </button>
            <button type="button" className={`btn small${!preview ? ' primary' : ''}`} onClick={() => setPreview(false)}>
              仅编辑
            </button>
          </div>
        </div>
      </div>

      <form className="stack form cms-docs-editor" onSubmit={(ev) => void onSubmit(ev)}>
        <label>
          标题
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <div className={`cms-docs-panes${preview ? '' : ' cms-docs-panes--edit-only'}`}>
          <label className="cms-docs-pane">
            Markdown
            <textarea
              className="cms-docs-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck={false}
            />
          </label>
          {preview ? (
            <div className="cms-docs-pane cms-docs-preview markdown-body-storefront">
              <span className="small muted">预览</span>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMd}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        {err ? (
          <div className="alert alert--error" role="alert">
            {err}
          </div>
        ) : null}

        <div className="form-actions row gap">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '保存中…' : '保存文档'}
          </button>
        </div>
      </form>
    </div>
  )
}
