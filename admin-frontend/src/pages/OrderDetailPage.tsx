import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/http'
import { adminApiFetch } from '../api/adminHttp'
import type { AdminOrder } from '../api/types'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { formatDateTime, formatMoney, formatOrderStatus, orderStatusClass } from '../utils/format'

export default function OrderDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const { showToast } = useToast()
  const orderId = Number(id)
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setErr('无效订单 ID')
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const res = await adminApiFetch<AdminOrder>(`/api/admin/orders/${orderId}`)
      setOrder(res)
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('加载失败')
      }
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  async function changeStatus(status: string, label: string) {
    if (!order) return
    const ok = await confirm({
      title: '修改订单状态',
      message: `确认将订单 ${order.order_no} 标记为「${label}」？`,
      confirmLabel: label,
      danger: status === 'cancelled' || status === 'refunded',
    })
    if (!ok) return
    setUpdating(true)
    try {
      const res = await adminApiFetch<AdminOrder>(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setOrder(res)
      showToast(`订单已标记为「${label}」`, 'success')
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '更新失败', 'error')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="loading-state">加载中…</div>
  }

  if (err || !order) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {err ?? '订单不存在'}
        </div>
        <Link to="/orders" className="page-back">
          返回订单列表
        </Link>
      </div>
    )
  }

  const actions: { status: string; label: string }[] = []
  if (order.status === 'pending') {
    actions.push({ status: 'paid', label: '确认已支付' }, { status: 'cancelled', label: '取消订单' })
  } else if (order.status === 'paid') {
    actions.push({ status: 'refunded', label: '标记退款' })
  }

  return (
    <div className="page">
      {confirmDialog}
      <div className="page-header">
        <div className="page-header__text">
          <Link to="/orders" className="page-back">
            返回列表
          </Link>
          <h1>{order.order_no}</h1>
          <p className="page-header__desc muted small">内部 ID #{order.id}</p>
          <p className="page-header__desc">
            <span className={`badge ${orderStatusClass(order.status)}`}>{formatOrderStatus(order.status)}</span>
            {' · '}
            {formatDateTime(order.created_at)}
          </p>
        </div>
        {actions.length > 0 ? (
          <div className="row gap">
            {actions.map((a) => (
              <button
                key={a.status}
                type="button"
                className={`btn small${a.status === 'cancelled' ? ' danger' : a.status === 'paid' ? ' primary' : ''}`}
                disabled={updating}
                onClick={() => void changeStatus(a.status, a.label)}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card__body stack">
          <dl className="kv-grid">
            <div>
              <dt>用户</dt>
              <dd>
                <button type="button" className="linkish" onClick={() => nav(`/users/${order.user_id}`)}>
                  {order.user_email}
                </button>
              </dd>
            </div>
            <div>
              <dt>金额</dt>
              <dd>{formatMoney(order.total_amount_minor, order.currency)}</dd>
            </div>
            <div>
              <dt>商品摘要</dt>
              <dd>{order.items_summary || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: '1rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>商品 ID</th>
              <th>商品</th>
              <th>单价</th>
              <th>数量</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it) => (
              <tr key={it.product_id}>
                <td className="muted">{it.product_id}</td>
                <td>{it.product_title}</td>
                <td>{formatMoney(it.unit_price_minor, order.currency)}</td>
                <td>{it.quantity}</td>
                <td>{formatMoney(it.line_total_minor, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
