import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/http'
import { adminApiFetch, adminApiUpload } from '../api/adminHttp'
import type { Product } from '../api/types'
import { useToast } from './Toast'

const STOREFRONT_CATEGORIES = [
  { value: 'film', label: '影视娱乐 (film)' },
  { value: 'book', label: '小说阅读 (book)' },
  { value: 'game', label: '游戏社区 (game)' },
  { value: 'shop', label: '商城导购 (shop)' },
] as const

type ProductFormPanelProps = {
  productId: number | 'new'
  onCancel: () => void
  onSaved: () => void
}

export function ProductFormPanel({ productId, onCancel, onSaved }: ProductFormPanelProps) {
  const isNew = productId === 'new'
  const { showToast } = useToast()

  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceMinor, setPriceMinor] = useState(0)
  const [currency, setCurrency] = useState('USD')
  const [imageUrl, setImageUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [recommended, setRecommended] = useState(false)
  const [visible, setVisible] = useState(true)
  const [downloads, setDownloads] = useState(0)
  const [score, setScore] = useState(0)
  const [category, setCategory] = useState('film')
  const [loading, setLoading] = useState(!isNew)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingArchive, setUploadingArchive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const archiveFileRef = useRef<HTMLInputElement>(null)

  const ARCHIVE_ACCEPT =
    '.zip,.rar,.7z,.tar,.gz,.tgz,.bz2,.tbz2,.xz,.txz,.tar.gz,.tar.bz2,.tar.xz,.tar.zst,application/zip,application/x-rar-compressed,application/x-7z-compressed,application/gzip,application/x-tar'

  useEffect(() => {
    if (isNew) {
      setSlug('')
      setTitle('')
      setDescription('')
      setPriceMinor(0)
      setCurrency('USD')
      setImageUrl('')
      setPreviewUrl('')
      setDownloadUrl('')
      setSortOrder(0)
      setRecommended(false)
      setVisible(true)
      setDownloads(0)
      setScore(0)
      setCategory('film')
      setLoading(false)
      setErr(null)
      return
    }

    let alive = true
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const p = await adminApiFetch<Product>(`/api/admin/products/${productId}`)
        if (!alive) return
        setSlug(p.slug)
        const c = p.category
        setCategory(['film', 'book', 'game', 'shop'].includes(c) ? c : 'film')
        setTitle(p.title)
        setDescription(p.description ?? '')
        setPriceMinor(p.price_minor)
        setCurrency(p.currency)
        setImageUrl(p.image_url ?? '')
        setPreviewUrl(p.preview_url ?? '')
        setDownloadUrl(p.download_url ?? '')
        setSortOrder(p.sort_order)
        setRecommended(!!p.recommended)
        setVisible(p.visible !== false)
        setDownloads(Math.max(0, Math.trunc(Number(p.downloads)) || 0))
        setScore(Number.isFinite(p.score) ? p.score : 0)
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
  }, [isNew, productId])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErr(null)
    setSaving(true)
    const body = {
      slug,
      category,
      title,
      description: description.trim() === '' ? null : description,
      price_minor: priceMinor,
      currency: currency.trim().toUpperCase(),
      image_url: imageUrl.trim() === '' ? null : imageUrl,
      preview_url: previewUrl.trim() === '' ? null : previewUrl,
      download_url: downloadUrl.trim() === '' ? null : downloadUrl,
      sort_order: sortOrder,
      recommended,
      visible,
      downloads: Math.max(0, Math.trunc(downloads)),
      score: Number.isFinite(score) ? score : 0,
    }

    try {
      if (isNew) {
        await adminApiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      } else {
        await adminApiFetch(`/api/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      }
      showToast(isNew ? '模板创建成功' : '模板保存成功', 'success')
      onSaved()
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '保存失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function randomizeMetrics() {
    setDownloads(Math.floor(Math.random() * (3000 - 200 + 1)) + 200)
    setScore(Math.floor(Math.random() * 50) / 10 + 5)
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return
    setUploadingImage(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await adminApiUpload<{ url: string }>('/api/admin/uploads/image', fd)
      setImageUrl(res.url)
      showToast('图片上传成功', 'success')
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '上传失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setUploadingImage(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onPickArchive(file: File | undefined) {
    if (!file) return
    setUploadingArchive(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await adminApiUpload<{ url: string }>('/api/admin/uploads/archive', fd)
      setDownloadUrl(res.url.replace(/\?.*$/, ''))
      showToast('压缩包上传成功', 'success')
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '上传失败'
      setErr(message)
      showToast(message, 'error')
    } finally {
      setUploadingArchive(false)
      if (archiveFileRef.current) archiveFileRef.current.value = ''
    }
  }

  if (loading) {
    return <div className="loading-state">加载中…</div>
  }

  return (
    <form className="stack form" onSubmit={onSubmit}>
      <div className="form-section">
        <div className="form-section__title">基本信息</div>
        <div className="form-grid form-grid--2">
          <label>
            slug（唯一标识）
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label>
            类目
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {STOREFRONT_CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          标题
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          描述
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <div className="form-grid form-grid--2">
          <label>
            封面图地址（可选）
            <div className="row gap" style={{ alignItems: 'stretch' }}>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… 或 /uploads/…"
                style={{ flex: 1 }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn"
                disabled={uploadingImage}
                onClick={() => fileRef.current?.click()}
              >
                {uploadingImage ? '上传中…' : '上传'}
              </button>
            </div>
          </label>
          <label>
            预览地址（可选）
            <input type="url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://…" />
          </label>
          <label className="form-grid__full">
            下载包（可选，已购用户可下载）
            <div className="row gap" style={{ alignItems: 'stretch' }}>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://… 或 /uploads/packages/…"
                style={{ flex: 1 }}
              />
              <input
                ref={archiveFileRef}
                type="file"
                accept={ARCHIVE_ACCEPT}
                hidden
                onChange={(e) => void onPickArchive(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn"
                disabled={uploadingArchive}
                onClick={() => archiveFileRef.current?.click()}
              >
                {uploadingArchive ? '上传中…' : '上传压缩包'}
              </button>
            </div>
            <span className="muted small">支持 ZIP、RAR、7Z、TAR 及 GZ/BZ2/XZ/ZST 等格式，最大 100MB</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__title">定价</div>
        <div className="form-grid form-grid--2">
          <label>
            价格（最小货币单位，分）
            <input
              type="number"
              min={0}
              value={priceMinor}
              onChange={(e) => setPriceMinor(Number.parseInt(e.target.value, 10) || 0)}
              required
            />
          </label>
          <label>
            货币（ISO 4217）
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} required />
          </label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__title">展示与排序</div>
        <div className="form-grid form-grid--2">
          <label>
            排序数字
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
            />
          </label>
          <label>
            下载量
            <input
              type="number"
              min={0}
              value={downloads}
              onChange={(e) => setDownloads(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
            />
          </label>
        </div>
        <div className="form-metrics-row">
          <label>
            评分（如 4.8）
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={score}
              onChange={(e) => setScore(Number.parseFloat(e.target.value) || 0)}
            />
          </label>
          <div className="form-metrics-row__random">
            <span className="form-metrics-row__label">快捷填充</span>
            <button type="button" className="btn" onClick={randomizeMetrics}>
              随机生成
            </button>
          </div>
          <div className="toggle-field">
            <span className="form-metrics-row__label">前台展示</span>
            <button
              type="button"
              role="switch"
              aria-checked={visible}
              className={`toggle-switch${visible ? ' is-on' : ''}`}
              onClick={() => setVisible((v) => !v)}
            >
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
              <span className="toggle-switch__text">{visible ? '已展示' : '已隐藏'}</span>
            </button>
          </div>
          <div className="toggle-field">
            <span className="form-metrics-row__label">推荐到首页展示区</span>
            <button
              type="button"
              role="switch"
              aria-checked={recommended}
              className={`toggle-switch${recommended ? ' is-on' : ''}`}
              onClick={() => setRecommended((v) => !v)}
            >
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
              <span className="toggle-switch__text">{recommended ? '已开启' : '已关闭'}</span>
            </button>
          </div>
        </div>
      </div>

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
