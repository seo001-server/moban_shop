import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { formatMinor } from '../util/money'

export default function CartPage() {
  const nav = useNavigate()
  const { token } = useAuth()
  const { lines, setQty, removeLine, clearAll, setCheckoutLineIds } = useCart()
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
    if (lines.length === 0) setSelected({})
  }, [lines.length])

  const selectedLines = useMemo(
    () => lines.filter((l) => selected[l.id] !== false),
    [lines, selected],
  )

  const totalMinor = useMemo(
    () => selectedLines.reduce((s, l) => s + l.price_minor * l.qty, 0),
    [selectedLines],
  )
  const currency = selectedLines[0]?.currency ?? lines[0]?.currency ?? 'CNY'

  function goCheckout() {
    if (selectedLines.length === 0) return
    const ids = selectedLines.map((l) => l.id)
    setCheckoutLineIds(ids)
    if (!token) {
      nav('/login?from=/checkout')
      return
    }
    nav('/checkout')
  }

  return (
    <>
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

      <div className="container cart-page-wrap">
        <div className="cart-page-toolbar">
          <div>
            <h2 className="cart-page-title">我的购物车</h2>
            <p className="cart-page-sub">已选模板可调整数量，登录后可前往结算</p>
          </div>
          <div className="deleteBtns">
            <button type="button" className="btn-delete" onClick={() => clearAll()}>
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
            <table className="cart-table">
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
                  return (
                    <tr key={item.id} className="cart-body-tr">
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`选择 ${item.title}`}
                        />
                      </td>
                      <td>
                        {item.image_url ? (
                          <img className="cart-img" src={item.image_url} alt="" />
                        ) : (
                          <div className="cart-img cart-img-placeholder">
                            <i className="fas fa-image" />
                          </div>
                        )}
                      </td>
                      <td>
                        <Link to={`/products/${item.id}`}>{item.title}</Link>
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {formatMinor(item.price_minor, item.currency)}
                      </td>
                      <td>
                        <div className="cart-qty-group">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            disabled={item.qty <= 1}
                            onClick={() => setQty(item.id, item.qty - 1)}
                          >
                            -
                          </button>
                          <input
                            className="cart-qty-input"
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(ev) =>
                              setQty(item.id, parseInt(ev.target.value, 10) || 1)
                            }
                          />
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => setQty(item.id, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {formatMinor(sub, item.currency)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-remove-line"
                          onClick={() => removeLine(item.id)}
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

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
