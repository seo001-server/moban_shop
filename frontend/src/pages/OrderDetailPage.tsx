import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/http'
import type { Order } from '../api/types'
import { ProductDeliveryActions } from '../components/ProductDeliveryActions'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../context/ToastContext'
import { ORDER_STATUS_LABELS, orderStatusClass } from '../lib/orderLabels'
import { formatMinor } from '../util/money'
import '../styles/order-detail.css'

export default function OrderDetailPage() {
  const nav = useNavigate()
  const { id: idParam } = useParams()
  const { token, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const orderId = idParam ? parseInt(idParam, 10) : NaN
  const validId = Number.isInteger(orderId) && orderId > 0

  useEffect(() => {
    if (!token || !validId) return
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch<Order>(`/api/orders/${orderId}`)
        if (!alive) return
        setOrder(data)
        setErr(null)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) setErr(e.message)
        else setErr('加载订单失败')
        setOrder(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [token, validId, orderId])

  if (!token && !authLoading) {
    return <Navigate to={`/login?from=${encodeURIComponent(`/account/orders/${idParam ?? ''}`)}`} replace />
  }

  if (authLoading || (!order && !err && validId)) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <p className="muted">加载中…</p>
        </div>
      </div>
    )
  }

  if (!validId || !order) {
    return (
      <div className="order-detail-page">
        <section className="breadcrumb breadcrumb-compact">
          <div className="container">
            <div className="breadcrumb-content">
              <Link to="/">
                <i className="fas fa-home" /> 首页
              </Link>
              <i className="fas fa-chevron-right" />
              <Link to="/account">个人中心</Link>
              <i className="fas fa-chevron-right" />
              <span>订单详情</span>
            </div>
          </div>
        </section>
        <div className="container">
          <p className="error" role="alert">
            {err ?? '订单不存在'}
          </p>
          <Link className="btn btn-secondary" to="/account">
            返回个人中心
          </Link>
        </div>
      </div>
    )
  }

  const paid = order.status === 'paid'
  const items = order.items ?? []

  async function handlePay() {
    setPaying(true)
    try {
      const updated = await apiFetch<Order>(`/api/orders/${orderId}/pay`, { method: 'POST' })
      setOrder(updated)
      showToast('支付成功')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '支付失败，请稍后重试'
      showToast(msg, 'error')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="order-detail-page">
      <div className="container">
        <div className="order-detail-head">
          <div className="order-detail-head-left">
            <h1 className="order-detail-title">订单详情</h1>
            <span className={`account-status ${orderStatusClass(order.status)}`}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <p className="muted order-detail-sub">订单号 {order.order_no}</p>
        </div>

        <div className="order-detail-grid">
          <section className="order-detail-card">
            <h2>商品明细</h2>
            <ul className="order-detail-items">
              {items.map((item) => (
                <li key={item.product_id} className="order-detail-item">
                  <div className="order-detail-item-thumb">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" />
                    ) : (
                      <span>
                        <i className="fas fa-layer-group" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="order-detail-item-body">
                    <Link to={`/products/${item.product_id}`} className="order-detail-item-title">
                      {item.product_title}
                    </Link>
                    <p className="muted small">
                      单价 {formatMinor(item.unit_price_minor, order.currency)} · 数量 ×{item.quantity}
                    </p>
                    <p className="order-detail-item-total">
                      小计 {formatMinor(item.line_total_minor, order.currency)}
                    </p>
                    <ProductDeliveryActions item={item} paid={paid} compact />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="order-detail-side">
            <section className="order-detail-card">
              <h2>订单摘要</h2>
              <dl className="order-detail-meta">
                <div>
                  <dt>下单时间</dt>
                  <dd>{new Date(order.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>商品件数</dt>
                  <dd>{order.item_count} 件</dd>
                </div>
                <div className="order-detail-meta-total">
                  <dt>订单金额</dt>
                  <dd>{formatMinor(order.total_amount_minor, order.currency)}</dd>
                </div>
              </dl>
              {order.status === 'pending' ? (
                <button
                  type="button"
                  className="btn btn-primary checkout-pay-btn"
                  disabled={paying}
                  onClick={() => void handlePay()}
                >
                  {paying ? '支付中…' : '立即支付'}
                </button>
              ) : null}
              {paid ? (
                <p className="muted small order-detail-delivery-note">
                  已购模板可通过上方按钮查看演示、详情与部署文档。
                </p>
              ) : null}
              <button type="button" className="btn btn-secondary" onClick={() => nav('/account')}>
                返回个人中心
              </button>
              {paid ? (
                <Link className="btn btn-secondary" to="/account?tab=library">
                  我的已购资源
                </Link>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
