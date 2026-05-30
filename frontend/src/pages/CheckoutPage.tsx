import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ApiError, apiFetch } from '../api/http'
import type { CreateOrderRequest, Order } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { formatMinor } from '../util/money'
import '../styles/checkout.css'

function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: '选购商品' },
    { n: 2, label: '确认订单' },
    { n: 3, label: '支付完成' },
  ] as const
  return (
    <ol className="checkout-steps" aria-label="结算进度">
      {steps.map((s) => (
        <li key={s.n} className={current >= s.n ? 'is-active' : undefined} data-current={current === s.n || undefined}>
          <span className="checkout-step-num">{s.n}</span>
          <span className="checkout-step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

function CheckoutBreadcrumb({ tail }: { tail: string }) {
  return (
    <section className="breadcrumb checkout-top-bar">
      <div className="container">
        <div className="breadcrumb-content">
          <Link to="/">
            <i className="fas fa-home" /> 首页
          </Link>
          <i className="fas fa-chevron-right" />
          <span>{tail}</span>
        </div>
      </div>
    </section>
  )
}

export default function CheckoutPage() {
  const nav = useNavigate()
  const { token, loading, me } = useAuth()
  const { checkoutLines, isDirectCheckout, removeLines, clearCheckout } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  const totalMinor = useMemo(
    () => checkoutLines.reduce((s, l) => s + l.price_minor * l.qty, 0),
    [checkoutLines],
  )
  const itemCount = useMemo(() => checkoutLines.reduce((s, l) => s + l.qty, 0), [checkoutLines])
  const currency = checkoutLines[0]?.currency ?? 'CNY'

  if (!token && !loading) {
    return <Navigate to="/login?from=/checkout" replace />
  }

  if (loading) {
    return (
      <div className="checkout-shell">
        <CheckoutBreadcrumb tail="确认订单" />
        <div className="container checkout-page">
          <p className="muted checkout-loading">加载中…</p>
        </div>
      </div>
    )
  }

  if (order) {
    return (
      <div className="checkout-shell">
        <CheckoutBreadcrumb tail="下单成功" />
        <div className="container checkout-page">
          <div className="checkout-progress">
            <CheckoutSteps current={3} />
          </div>
          <section className="checkout-success-card">
            <div className="checkout-success-icon" aria-hidden>
              <i className="fas fa-check" />
            </div>
            <h1>下单成功</h1>
            <p className="checkout-success-lede">模拟支付已完成，模板订单已记入您的账户。</p>
            <dl className="checkout-success-meta">
              <div>
                <dt>订单号</dt>
                <dd>{order.order_no}</dd>
              </div>
              <div>
                <dt>订单状态</dt>
                <dd>{order.status === 'paid' ? '已支付' : '待支付'}</dd>
              </div>
              <div>
                <dt>应付金额</dt>
                <dd className="checkout-success-amount">
                  {formatMinor(order.total_amount_minor, order.currency)}
                </dd>
              </div>
            </dl>
            <div className="checkout-success-actions">
              <Link className="btn btn-primary checkout-pay-btn" to={`/account/orders/${order.id}`}>
                查看订单与交付
              </Link>
              <Link className="btn btn-secondary" to="/account?tab=library">
                我的已购资源
              </Link>
              <Link className="btn btn-secondary" to="/products">
                继续选购
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (checkoutLines.length === 0) {
    return (
      <div className="checkout-shell">
        <CheckoutBreadcrumb tail="确认订单" />
        <div className="container checkout-page">
          <section className="checkout-empty-card">
            <i className="fas fa-shopping-bag checkout-empty-icon" aria-hidden />
            <h1>暂无待结算商品</h1>
            <p className="muted">请先在购物车勾选模板，或使用商品详情页的「立即购买」。</p>
            <div className="checkout-empty-actions">
              <Link className="btn btn-primary" to="/products">
                浏览模板
              </Link>
              <Link className="btn btn-secondary" to="/cart">
                返回购物车
              </Link>
            </div>
          </section>
        </div>
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
      if (!isDirectCheckout) {
        await removeLines(checkoutLines.map((l) => l.id))
      }
      clearCheckout()
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

  const backLabel = isDirectCheckout ? '返回继续选购' : '返回购物车'
  const backTarget = isDirectCheckout ? '/products' : '/cart'

  return (
    <div className="checkout-shell">
      <CheckoutBreadcrumb tail="确认订单" />
      <div className="container checkout-page">
        <div className="checkout-progress">
          <CheckoutSteps current={2} />
        </div>
        <p className="checkout-page-sub muted">
          {isDirectCheckout ? '立即购买 · 共 ' : '购物车结算 · 共 '}
          {itemCount} 件模板
        </p>

        <div className="checkout-layout">
          <div className="checkout-main">
            <section className="checkout-section-card">
              <h2 className="checkout-section-title">
                <i className="fas fa-box-open" aria-hidden /> 商品清单
              </h2>
              <ul className="checkout-item-list">
                {checkoutLines.map((l) => (
                  <li key={l.id} className="checkout-item">
                    <div className="checkout-item-thumb">
                      {l.image_url ? (
                        <img src={l.image_url} alt="" />
                      ) : (
                        <span className="checkout-item-thumb-ph">
                          <i className="fas fa-layer-group" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="checkout-item-body">
                      <Link to={`/products/${l.id}`} className="checkout-item-title">
                        {l.title}
                      </Link>
                      <p className="checkout-item-unit muted">
                        单价 {formatMinor(l.price_minor, l.currency)}
                      </p>
                    </div>
                    <div className="checkout-item-qty">×{l.qty}</div>
                    <div className="checkout-item-sub">
                      {formatMinor(l.price_minor * l.qty, l.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {me ? (
              <section className="checkout-section-card">
                <h2 className="checkout-section-title">
                  <i className="fas fa-user-circle" aria-hidden /> 购买账户
                </h2>
                <p className="checkout-account-email">{me.email}</p>
                <p className="muted small">订单将关联到该账户，可在个人中心查看与下载。</p>
              </section>
            ) : null}

            <section className="checkout-section-card">
              <h2 className="checkout-section-title">
                <i className="fas fa-credit-card" aria-hidden /> 支付方式
              </h2>
              <div className="checkout-pay-method">
                <span className="checkout-pay-method-icon" aria-hidden>
                  <i className="fas fa-flask" />
                </span>
                <div>
                  <strong>模拟支付（演示环境）</strong>
                  <p className="muted small">无需真实付款，提交后订单将直接标记为已支付。</p>
                </div>
                <span className="checkout-pay-method-badge">当前可用</span>
              </div>
            </section>
          </div>

          <aside className="checkout-sidebar">
            <div className="checkout-summary-card">
              <h2 className="checkout-summary-title">订单摘要</h2>
              <dl className="checkout-summary-rows">
                <div>
                  <dt>商品件数</dt>
                  <dd>{itemCount} 件</dd>
                </div>
                <div>
                  <dt>商品种类</dt>
                  <dd>{checkoutLines.length} 种</dd>
                </div>
                <div className="checkout-summary-divider" />
                <div className="checkout-summary-total">
                  <dt>应付合计</dt>
                  <dd>{formatMinor(totalMinor, currency)}</dd>
                </div>
              </dl>

              {err ? (
                <p className="error checkout-summary-error" role="alert">
                  {err}
                </p>
              ) : null}

              <button
                type="button"
                className="btn btn-primary checkout-pay-btn"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden /> 提交中…
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock" aria-hidden /> 确认下单并支付
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary checkout-back-btn"
                disabled={submitting}
                onClick={() => nav(backTarget)}
              >
                {backLabel}
              </button>
              <p className="checkout-summary-note muted small">
                点击支付即表示您知悉：源码类商品购买后不支持退换。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
