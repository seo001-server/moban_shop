import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ApiError, apiFetch } from '../api/http'
import type { CreateOrderRequest, Order } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { formatMinor } from '../util/money'

export default function CheckoutPage() {
  const nav = useNavigate()
  const { token, loading } = useAuth()
  const { checkoutLines, removeLines, setCheckoutLineIds } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  const totalMinor = useMemo(
    () => checkoutLines.reduce((s, l) => s + l.price_minor * l.qty, 0),
    [checkoutLines],
  )
  const currency = checkoutLines[0]?.currency ?? 'CNY'

  if (!token && !loading) {
    return <Navigate to="/login?from=/checkout" replace />
  }

  if (loading) {
    return (
      <div className="container">
        <p className="muted">加载中…</p>
      </div>
    )
  }

  if (order) {
    return (
      <div className="container page-inner-narrow">
        <section className="detail-panel stack">
          <h1>下单成功</h1>
          <p className="muted">订单号 #{order.id}，状态：{order.status === 'paid' ? '已支付' : '待支付'}</p>
          <p>
            应付金额：<strong>{formatMinor(order.total_amount_minor, order.currency)}</strong>
          </p>
          <div className="row gap">
            <Link className="btn btn-secondary" to="/account">
              查看我的订单
            </Link>
            <Link className="btn btn-primary" to="/products">
              继续选购
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (checkoutLines.length === 0) {
    return (
      <div className="container page-inner-narrow">
        <section className="detail-panel stack">
          <h1>结算</h1>
          <p className="muted">没有待结算的商品，请先在购物车勾选模板。</p>
          <Link className="btn btn-secondary" to="/cart">
            返回购物车
          </Link>
        </section>
      </div>
    )
  }

  async function submit() {
    setErr(null)
    setSubmitting(true)
    const body: CreateOrderRequest = {
      items: checkoutLines.map((l) => ({ product_id: l.id, quantity: l.qty })),
      mock_pay: true,
    }
    try {
      const res = await apiFetch<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      removeLines(checkoutLines.map((l) => l.id))
      setCheckoutLineIds(null)
      setOrder(res)
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message)
      } else {
        setErr('下单失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page-inner-narrow">
      <section className="detail-panel stack">
        <h1>确认订单</h1>
        <p className="muted">当前为模拟支付，提交后订单将直接标记为已支付。</p>

        <table className="cart-table">
          <thead>
            <tr>
              <th>模板</th>
              <th>数量</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            {checkoutLines.map((l) => (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td>{l.qty}</td>
                <td>{formatMinor(l.price_minor * l.qty, l.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '1.1rem' }}>
          合计：<strong>{formatMinor(totalMinor, currency)}</strong>
        </p>

        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}

        <div className="row gap">
          <button type="button" className="btn btn-secondary" onClick={() => nav('/cart')}>
            返回购物车
          </button>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? '提交中…' : '确认下单并支付'}
          </button>
        </div>
      </section>
    </div>
  )
}
