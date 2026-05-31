import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { ApiError, apiFetch } from '../api/http'

import type { Order, PaginatedOrders } from '../api/types'

import { ProductDeliveryActions } from '../components/ProductDeliveryActions'

import { AccountSecurityPanel } from '../components/AccountSecurityPanel'

import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'

import { ProductImage } from '../components/ProductImage'

import { useAuth } from '../auth/AuthContext'

import { useToast } from '../context/ToastContext'

import { ORDER_STATUS_LABELS, orderStatusClass } from '../lib/orderLabels'

import { fetchPurchasedProducts, type PurchasedProduct } from '../lib/purchasedProducts'
import { isProductDelisted } from '../lib/productDelisted'

import { formatMinor } from '../util/money'

import '../styles/order-detail.css'



type AccountTab = 'overview' | 'orders' | 'library' | 'security'



function avatarInitial(email: string): string {

  const ch = email.trim().charAt(0)

  return ch ? ch.toUpperCase() : '?'

}



function memberDays(createdAt: string): number {

  const start = new Date(createdAt).getTime()

  const now = Date.now()

  return Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)))

}



function parseAccountTab(raw: string | null): AccountTab {
  if (raw === 'orders' || raw === 'library' || raw === 'security') return raw
  return 'overview'
}



export default function AccountPage() {

  const { me, token, loading, refreshMe } = useAuth()

  const { showToast } = useToast()

  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<AccountTab>(() => parseAccountTab(searchParams.get('tab')))

  const [orders, setOrders] = useState<Order[] | null>(null)

  const [orderTotal, setOrderTotal] = useState(0)

  const [ordersErr, setOrdersErr] = useState<string | null>(null)

  const [payingId, setPayingId] = useState<number | null>(null)

  const [library, setLibrary] = useState<PurchasedProduct[] | null>(null)

  const [libraryLoading, setLibraryLoading] = useState(false)

  const [libraryErr, setLibraryErr] = useState<string | null>(null)



  const loadOrders = useCallback(async () => {

    try {

      const res = await apiFetch<PaginatedOrders>('/api/orders?page=1&page_size=20')

      setOrders(res.items)

      setOrderTotal(res.total)

      setOrdersErr(null)

    } catch (e) {

      if (e instanceof ApiError) setOrdersErr(e.message)

      else setOrdersErr('加载订单失败')

      setOrders([])

      setOrderTotal(0)

    }

  }, [])



  useEffect(() => {

    if (token && me) void loadOrders()

  }, [token, me, loadOrders])



  useEffect(() => {

    const next = parseAccountTab(searchParams.get('tab'))

    setTab(next)

  }, [searchParams])



  function selectTab(next: AccountTab) {

    setTab(next)

    if (next === 'overview') setSearchParams({})

    else setSearchParams({ tab: next })

  }



  useEffect(() => {

    if (tab !== 'library' || !orders) return

    let alive = true

    ;(async () => {

      setLibraryLoading(true)

      try {

        const items = await fetchPurchasedProducts(orders)

        if (!alive) return

        setLibrary(items)

        setLibraryErr(null)

      } catch {

        if (!alive) return

        setLibraryErr('加载已购资源失败')

        setLibrary([])

      } finally {

        if (alive) setLibraryLoading(false)

      }

    })()

    return () => {

      alive = false

    }

  }, [tab, orders])



  const paidCount = useMemo(

    () => (orders ?? []).filter((o) => o.status === 'paid').length,

    [orders],

  )



  async function handlePay(orderId: number) {

    setPayingId(orderId)

    try {

      await apiFetch(`/api/orders/${orderId}/pay`, { method: 'POST' })

      await loadOrders()

      showToast('支付成功')

    } catch (e) {

      const msg = e instanceof ApiError ? e.message : '支付失败，请稍后重试'

      showToast(msg, 'error')

    } finally {

      setPayingId(null)

    }

  }



  if (!token && !loading) {

    return <Navigate to="/login" replace />

  }



  if (loading) {

    return (

      <div className="account-page">

        <div className="container">

          <div className="account-loading">

            <i className="fas fa-spinner fa-spin" aria-hidden />

            <span>加载中…</span>

          </div>

        </div>

      </div>

    )

  }



  if (!me) {

    return (

      <div className="account-page">

        <div className="container">

          <section className="account-panel account-error-panel">

            <h1 className="account-panel-title">个人中心</h1>

            <p className="muted">无法加载用户信息，请检查网络或重新登录。</p>

            <div className="row gap" style={{ justifyContent: 'center', marginTop: '1rem' }}>

              <button type="button" className="btn btn-register" onClick={() => void refreshMe()}>

                重试

              </button>

              <Link className="btn btn-login" to="/login">

                去登录

              </Link>

            </div>

          </section>

        </div>

      </div>

    )

  }



  return (

    <div className="account-page">

      <PageMeta title="个人中心" description={PAGE_DESCRIPTIONS.account} noIndex />

      <section className="breadcrumb breadcrumb-compact">

        <div className="container">

          <div className="breadcrumb-content">

            <Link to="/">

              <i className="fas fa-home" /> 首页

            </Link>

            <i className="fas fa-chevron-right" />

            <span>个人中心</span>

          </div>

        </div>

      </section>



      <div className="container account-layout">

        <aside className="account-sidebar">

          <div className="account-profile">

            <div className="account-avatar" aria-hidden>

              {avatarInitial(me.email)}

            </div>

            <div>

              <div className="account-profile-email">{me.email}</div>

            </div>

          </div>



          <ul className="account-nav" role="tablist" aria-label="个人中心导航">

            <li className="account-nav-item" role="presentation">

              <button

                type="button"

                id="tab-overview"

                role="tab"

                aria-selected={tab === 'overview'}

                aria-controls="panel-overview"

                className={`account-nav-btn${tab === 'overview' ? ' active' : ''}`}

                onClick={() => selectTab('overview')}

              >

                <i className="fas fa-user-circle" aria-hidden />

                账户概览

              </button>

            </li>

            <li className="account-nav-item" role="presentation">

              <button

                type="button"

                id="tab-orders"

                role="tab"

                aria-selected={tab === 'orders'}

                aria-controls="panel-orders"

                className={`account-nav-btn${tab === 'orders' ? ' active' : ''}`}

                onClick={() => selectTab('orders')}

              >

                <i className="fas fa-receipt" aria-hidden />

                我的订单

                {orderTotal > 0 ? <span className="account-nav-badge">{orderTotal}</span> : null}

              </button>

            </li>



            <li className="account-nav-item" role="presentation">

              <button

                type="button"

                id="tab-library"

                role="tab"

                aria-selected={tab === 'library'}

                aria-controls="panel-library"

                className={`account-nav-btn${tab === 'library' ? ' active' : ''}`}

                onClick={() => selectTab('library')}

              >

                <i className="fas fa-box-open" aria-hidden />

                已购资源

              </button>

            </li>



            <li className="account-nav-item" role="presentation">

              <button

                type="button"

                id="tab-security"

                role="tab"

                aria-selected={tab === 'security'}

                aria-controls="panel-security"

                className={`account-nav-btn${tab === 'security' ? ' active' : ''}`}

                onClick={() => selectTab('security')}

              >

                <i className="fas fa-shield-alt" aria-hidden />

                账户安全

              </button>

            </li>

          </ul>



          <div className="account-sidebar-actions">

            <Link className="account-sidebar-link" to="/products">

              <i className="fas fa-store" aria-hidden />

              浏览模板

            </Link>

            <Link className="account-sidebar-link" to="/cart">

              <i className="fas fa-shopping-cart" aria-hidden />

              我的购物车

            </Link>

          </div>

        </aside>



        <main className="account-main">

          {tab === 'overview' ? (

            <>

              <section className="account-panel" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">

                <div className="account-panel-head">

                  <div>

                    <h1 className="account-panel-title">账户概览</h1>

                    <p className="account-panel-sub">欢迎回来，这里是您的账户信息与购买概况</p>

                  </div>

                </div>



                <div className="account-stats">

                  <div className="account-stat-card">

                    <div className="account-stat-label">

                      <i className="fas fa-receipt" aria-hidden />

                      全部订单

                    </div>

                    <div className="account-stat-value">{orderTotal}</div>

                  </div>

                  <div className="account-stat-card">

                    <div className="account-stat-label">

                      <i className="fas fa-check-circle" aria-hidden />

                      已完成

                    </div>

                    <div className="account-stat-value">{paidCount}</div>

                  </div>

                  <div className="account-stat-card">

                    <div className="account-stat-label">

                      <i className="fas fa-calendar-alt" aria-hidden />

                      注册天数

                    </div>

                    <div className="account-stat-value">{memberDays(me.created_at)}</div>

                  </div>

                </div>



                <div className="account-info-grid">

                  <div className="account-info-item">

                    <div className="account-info-icon">

                      <i className="fas fa-envelope" aria-hidden />

                    </div>

                    <div className="account-info-body">

                      <div className="account-info-label">登录邮箱</div>

                      <div className="account-info-value">{me.email}</div>

                    </div>

                  </div>

                  <div className="account-info-item">

                    <div className="account-info-icon">

                      <i className="fas fa-fingerprint" aria-hidden />

                    </div>

                    <div className="account-info-body">

                      <div className="account-info-label">用户 UID</div>

                      <div className="account-info-value">{me.user_no}</div>

                    </div>

                  </div>

                  <div className="account-info-item">

                    <div className="account-info-icon">

                      <i className="fas fa-clock" aria-hidden />

                    </div>

                    <div className="account-info-body">

                      <div className="account-info-label">注册时间</div>

                      <div className="account-info-value">

                        {new Date(me.created_at).toLocaleString()}

                      </div>

                    </div>

                  </div>

                  <div className="account-info-item">

                    <div className="account-info-icon">

                      <i className="fas fa-shield-alt" aria-hidden />

                    </div>

                    <div className="account-info-body">

                      <div className="account-info-label">账户状态</div>

                      <div className="account-info-value">正常</div>

                    </div>

                  </div>

                </div>

              </section>



              {orders && orders.length > 0 ? (

                <section className="account-panel">

                  <div className="account-panel-head">

                    <div>

                      <h2 className="account-panel-title" style={{ fontSize: '1.25rem' }}>

                        最近订单

                      </h2>

                      <p className="account-panel-sub">最新 3 笔订单记录</p>

                    </div>

                    <button

                      type="button"

                      className="nav-btn-plain"

                      style={{ color: 'var(--primary)' }}

                      onClick={() => selectTab('orders')}

                    >

                    </button>

                  </div>

                  <div className="account-order-list">

                    {orders.slice(0, 3).map((o) => (

                      <OrderCard

                        key={o.id}

                        order={o}

                        paying={payingId === o.id}

                        onPay={handlePay}

                      />

                    ))}

                  </div>

                </section>

              ) : null}

            </>

          ) : tab === 'library' ? (

            <section className="account-panel" id="panel-library" role="tabpanel" aria-labelledby="tab-library">

              <div className="account-panel-head">

                <div>

                  <h1 className="account-panel-title">已购资源</h1>

                  <p className="account-panel-sub">已支付订单中的模板，可直接查看演示与文档</p>

                </div>

              </div>



              {libraryErr ? (

                <p className="error" role="alert">

                  {libraryErr}

                </p>

              ) : libraryLoading || library === null ? (

                <div className="account-loading">

                  <i className="fas fa-spinner fa-spin" aria-hidden />

                  <span>加载已购资源…</span>

                </div>

              ) : library.length === 0 ? (

                <div className="account-empty">

                  <div className="account-empty-icon">

                    <i className="fas fa-box-open" aria-hidden />

                  </div>

                  <h3>暂无已购模板</h3>

                  <p>完成支付后，已购模板会出现在这里</p>

                  <Link className="btn btn-register" to="/products">

                    浏览模板

                  </Link>

                </div>

              ) : (

                <div className="order-library-list">

                  {library.map((item) => {
                    const delisted = isProductDelisted(item)
                    return (
                    <article key={item.product_id} className={`order-library-card${delisted ? ' is-delisted' : ''}`}>

                      <div className="order-library-thumb">

                        {item.image_url ? (

                          <ProductImage src={item.image_url} alt={item.product_title} width={64} height={64} />

                        ) : (

                          <i className="fas fa-layer-group" aria-hidden />

                        )}

                      </div>

                      <div className="order-library-body">

                        <div className="order-library-title-row">
                          <div className="order-library-title">{item.product_title}</div>
                          {delisted ? <span className="product-delisted-badge">已下架</span> : null}
                        </div>

                        <p className="muted small order-library-meta">

                          购于 {new Date(item.purchased_at).toLocaleDateString()} · 订单 {item.order_no}

                        </p>

                        <ProductDeliveryActions item={item} paid compact />

                      </div>

                    </article>
                  )})}
                </div>

              )}

            </section>

          ) : tab === 'security' ? (

            <AccountSecurityPanel />

          ) : (

            <section className="account-panel" id="panel-orders" role="tabpanel" aria-labelledby="tab-orders">

              <div className="account-panel-head">

                <div>

                  <h1 className="account-panel-title">我的订单</h1>

                  <p className="account-panel-sub">

                    {orderTotal > 0 ? `共 ${orderTotal} 笔订单记录` : '查看您的模板购买记录'}

                  </p>

                </div>

              </div>



              {ordersErr ? (

                <p className="error" role="alert">

                  {ordersErr}

                </p>

              ) : orders === null ? (

                <div className="account-loading">

                  <i className="fas fa-spinner fa-spin" aria-hidden />

                  <span>加载订单…</span>

                </div>

              ) : orders.length === 0 ? (

                <div className="account-empty">

                  <div className="account-empty-icon">

                    <i className="fas fa-box-open" aria-hidden />

                  </div>

                  <h3>暂无订单</h3>

                  <p>您还没有购买任何模板，浏览商城挑选心仪的模板吧</p>

                  <div className="account-empty-actions">

                    <Link className="btn btn-register" to="/products">

                      <i className="fas fa-store" aria-hidden /> 浏览模板

                    </Link>

                    <Link className="btn btn-login" to="/cart">

                      查看购物车

                    </Link>

                  </div>

                </div>

              ) : (

                <div className="account-order-list">

                  {orders.map((o) => (

                    <OrderCard

                      key={o.id}

                      order={o}

                      paying={payingId === o.id}

                      onPay={handlePay}

                    />

                  ))}

                </div>

              )}

            </section>

          )}

        </main>

      </div>

    </div>

  )

}



function OrderCard({

  order,

  paying,

  onPay,

}: {

  order: Order

  paying: boolean

  onPay: (id: number) => void

}) {

  return (

    <article className="account-order-card">

      <div className="account-order-head">

        <div className="account-order-id">

          <span>订单号</span>{order.order_no}

        </div>

        <div className="account-order-date">{new Date(order.created_at).toLocaleString()}</div>

      </div>

      <div className="account-order-body">

        <div className="account-order-summary">

          <strong>{order.item_count} 件商品</strong>

          <br />

          {order.items_summary || '—'}

        </div>

        <div className="account-order-meta">

          <span className={`account-status ${orderStatusClass(order.status)}`}>

            {ORDER_STATUS_LABELS[order.status] ?? order.status}

          </span>

          <span className="account-order-amount">

            {formatMinor(order.total_amount_minor, order.currency)}

          </span>

          {order.status === 'pending' ? (

            <div className="account-order-actions">

              <button

                type="button"

                className="btn btn-register account-btn-pay"

                disabled={paying}

                onClick={() => onPay(order.id)}

              >

                {paying ? '支付中…' : '立即支付'}

              </button>

            </div>

          ) : (

            <div className="account-order-actions">

              <Link className="btn btn-login account-btn-pay" to={`/account/orders/${order.id}`}>

                查看详情

              </Link>

            </div>

          )}

        </div>

      </div>

    </article>

  )

}


