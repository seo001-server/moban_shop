import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { OrderItem } from '../api/types'
import { ApiError } from '../api/http'
import { downloadProduct } from '../lib/downloadProduct'
import { isProductDelisted } from '../lib/productDelisted'

type Props = {
  item: OrderItem
  paid: boolean
  compact?: boolean
}

export function ProductDeliveryActions({ item, paid, compact }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const delisted = isProductDelisted(item)

  if (!paid) {
    return <span className="muted small">支付完成后可下载模板源码包</span>
  }

  async function onDownload() {
    setErr(null)
    setBusy(true)
    try {
      await downloadProduct(item.product_id, `${item.product_slug}.zip`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '下载失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  if (delisted) {
    return (
      <div className={`product-delivery-actions${compact ? ' is-compact' : ''}`}>
        <span className="product-delisted-badge">已下架</span>
        <span className="muted small">该模板已下架，无法下载</span>
      </div>
    )
  }

  return (
    <div className={`product-delivery-actions${compact ? ' is-compact' : ''}`}>
      {item.has_download ? (
        <button
          type="button"
          className="btn btn-primary btn-delivery"
          disabled={busy}
          onClick={() => void onDownload()}
        >
          <i className="fas fa-download" aria-hidden /> {busy ? '下载中…' : '下载模板'}
        </button>
      ) : (
        <span className="muted small">暂未配置下载包，请联系客服</span>
      )}
      {item.preview_url ? (
        <a
          href={item.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-delivery"
        >
          <i className="fas fa-eye" aria-hidden /> 查看演示
        </a>
      ) : null}
      <Link to={`/products/${item.product_id}`} className="btn btn-secondary btn-delivery">
        <i className="fas fa-layer-group" aria-hidden /> 模板详情
      </Link>
      <Link to="/docs" className="btn btn-secondary btn-delivery">
        <i className="fas fa-book" aria-hidden /> 部署文档
      </Link>
      {err ? (
        <p className="error small product-delivery-error" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}
