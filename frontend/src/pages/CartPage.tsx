import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import type { CartLine } from '../cart/cartTypes'
import { PageMeta, PAGE_DESCRIPTIONS } from '../components/PageMeta'
import { ProductImage } from '../components/ProductImage'
import { formatMinor } from '../util/money'
import { isProductDelisted } from '../lib/productDelisted'

function CartQtyControls({
  item,
  setQty,
  delisted,
}: {
  item: CartLine
  setQty: (id: number, qty: number) => Promise<void>
  delisted: boolean
}) {
  return (
    <div className="cart-qty-group">
      <button
        type="button"
        className="cart-qty-btn"
        disabled={item.qty <= 1}
        onClick={() => void setQty(item.id, item.qty - 1)}
        aria-label={`减少 ${item.title} 数量`}
      >
        -
      </button>
      <input
        className="cart-qty-input"
        type="number"
        min={1}
        value={item.qty}
        disabled={delisted}
        aria-label={`${item.title} 数量`}
        onChange={(ev) => void setQty(item.id, parseInt(ev.target.value, 10) || 1)}
      />
      <button
        type="button"
        className="cart-qty-btn"
        disabled={delisted}
        onClick={() => void setQty(item.id, item.qty + 1)}
        aria-label={`增加 ${item.title} 数量`}
      >
        +
      </button>
    </div>
  )
}

function CartItemTitle({ item }: { item: CartLine }) {
  const delisted = isProductDelisted(item)
  if (delisted) {
    return (
      <div className="cart-item-title-row">
        <span className="cart-item-card-title is-static">{item.title}</span>
        <span className="product-delisted-badge">已下架</span>
      </div>
    )
  }
  return <Link to={`/products/${item.id}`}>{item.title}</Link>
}

function CartThumb({ item }: { item: CartLine }) {
  if (item.image_url) {
    return (
      <ProductImage
        src={item.image_url}
        alt={item.title}
        className="cart-img"
        width={72}
        height={72}
      />
    )
  }
  return (
    <div className="cart-img cart-img-placeholder" aria-hidden>
      <i className="fas fa-image" />
    </div>
  )
}

export default function CartPage() {
  const nav = useNavigate()
  const { token, loading: authLoading } = useAuth()
  const { lines, loading: cartLoading, setQty, removeLine, clearAll, setCheckoutLineIds } = useCart()
  const [selected, setSelected] = useState<Record<number, boolean>>({})

  const allIds = lines.map((l) => l.id)
  const allSelected = lines.length > 0 && allIds.every((id) => selected[id] !== false)

  function toggleSelectAll() {
    if (!lines.length) return
    const next = !allSelected
    const m: Record<number, boolean> = {}
    for (const id of allIds) m[id] = next
    setSelected(m)
  }

  function toggleOne(id: number) {
    setSelected((s) => {
      const cur = s[id] !== false
      return { ...s, [id]: !cur }
    })
  }

  useEffect(() => {
    if (lines.length === 0) {
      setSelected({})
      return
    }
    setSelected((s) => {
      const next = { ...s }
      for (const line of lines) {
        if (isProductDelisted(line)) next[line.id] = false
      }
      return next
    })
  }, [lines])

  const selectedLines = useMemo(
    () => lines.filter((l) => selected[l.id] !== false && !isProductDelisted(l)),
    [lines, selected],
  )

  const totalMinor = useMemo(
    () => selectedLines.reduce((s, l) => s + l.price_minor * l.qty, 0),
    [selectedLines],
  )
  const currency = selectedLines[0]?.currency ?? lines[0]?.currency ?? 'CNY'

  function goCheckout() {
    if (selectedLines.length === 0) return
    if (!token) {
      nav('/login?from=/checkout')
      return
    }
    const ids = selectedLines.map((l) => l.id)
    setCheckoutLineIds(ids)
    nav('/checkout')
  }

  const breadcrumb = (
    <section className="breadcrumb breadcrumb-compact">
      <div className="container">
        <div className="breadcrumb-content">
          <Link to="/">
            <i className="fas fa-home" /> 首页
          </Link>
          <i className="fas fa-chevron-right" />
          <span>购物车</span>
        </div>
      </div>
    </section>
  )

  if (authLoading || (token && cartLoading && lines.length === 0)) {
    return (
      <>
        <PageMeta title="购物车" description={PAGE_DESCRIPTIONS.cart} />
        {breadcrumb}
        <div className="container cart-page-wrap">
          <p className="muted">加载中…</p>
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <PageMeta title="购物车" description={PAGE_DESCRIPTIONS.cart} noIndex />
        {breadcrumb}
        <div className="container cart-page-wrap">
          <div className="cart-empty-static">
            <i className="fas fa-user-lock" style={{ fontSize: '3rem', opacity: 0.35 }} />
            <p>请先登录后再使用购物车</p>
            <p className="muted">登录后可将模板加入购物车并结算</p>
            <Link to="/login?from=/cart" className="btn btn-primary">
              去登录
            </Link>
            <Link to="/products" className="btn btn-secondary" style={{ marginLeft: 12 }}>
              浏览模板
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageMeta title="购物车" description={PAGE_DESCRIPTIONS.cart} noIndex />
      {breadcrumb}

      <div className="container cart-page-wrap">
        <div className="cart-page-toolbar">
          <div>
            <h2 className="cart-page-title">我的购物车</h2>
            <p className="cart-page-sub">已选模板可调整数量，勾选后前往结算</p>
          </div>
          <div className="deleteBtns">
            <button type="button" className="btn-delete" onClick={() => void clearAll()}>
              删除全部
            </button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="cart-empty-static">
            <i className="fas fa-shopping-basket" style={{ fontSize: '3rem', opacity: 0.35 }} />
            <p>购物车为空，快去选购模板吧！</p>
            <Link to="/products" className="btn btn-secondary">
              浏览模板
            </Link>
          </div>
        ) : (
          <>
            <table className="cart-table cart-table-desktop">
              <thead>
                <tr className="cart-thead-row">
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="全选"
                    />
                  </th>
                  <th>图片</th>
                  <th>模板名称</th>
                  <th>单价</th>
                  <th>数量</th>
                  <th>小计</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody className="cart-body">
                {lines.map((item) => {
                  const sub = item.price_minor * item.qty
                  const checked = selected[item.id] !== false
                  const delisted = isProductDelisted(item)
                  return (
                    <tr key={item.id} className={`cart-body-tr${delisted ? ' is-delisted' : ''}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={delisted}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`选择 ${item.title}`}
                        />
                      </td>
                      <td>
                        <CartThumb item={item} />
                      </td>
                      <td>
                        <CartItemTitle item={item} />
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {formatMinor(item.price_minor, item.currency)}
                      </td>
                      <td>
                        <CartQtyControls item={item} setQty={setQty} delisted={delisted} />
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {formatMinor(sub, item.currency)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-remove-line"
                          onClick={() => void removeLine(item.id)}
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="cart-mobile-list" aria-label="购物车商品列表">
              {lines.map((item) => {
                const sub = item.price_minor * item.qty
                const checked = selected[item.id] !== false
                const delisted = isProductDelisted(item)
                return (
                  <article key={item.id} className={`cart-item-card${delisted ? ' is-delisted' : ''}`}>
                    <div className="cart-item-card-head">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={delisted}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`选择 ${item.title}`}
                      />
                      <div className="cart-item-card-thumb">
                        <CartThumb item={item} />
                      </div>
                      <div className="cart-item-card-body">
                        {delisted ? (
                          <div className="cart-item-title-row">
                            <span className="cart-item-card-title is-static">{item.title}</span>
                            <span className="product-delisted-badge">已下架</span>
                          </div>
                        ) : (
                          <Link to={`/products/${item.id}`} className="cart-item-card-title">
                            {item.title}
                          </Link>
                        )}
                        <p className="cart-item-card-price">
                          {formatMinor(item.price_minor, item.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="cart-item-card-row">
                      <CartQtyControls item={item} setQty={setQty} delisted={delisted} />
                      <span className="cart-item-card-subtotal">{formatMinor(sub, item.currency)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-remove-line"
                      onClick={() => void removeLine(item.id)}
                    >
                      移除
                    </button>
                  </article>
                )
              })}
            </div>

            <div className="cart-footer cart-footer-inner">
              <div>
                <span style={{ fontSize: '1.1rem' }}>已选总计：</span>
                <span className="cart-total">{formatMinor(totalMinor, currency)}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-gopay"
                disabled={selectedLines.length === 0}
                onClick={goCheckout}
              >
                去结算
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
