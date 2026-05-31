import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { useBusinessSections } from '../hooks/useBusinessSections'
import { GlobalSearch } from '../components/GlobalSearch'

function adminHref(): string | null {
  const raw = import.meta.env.VITE_ADMIN_URL
  if (!raw || typeof raw !== 'string') return null
  return raw.replace(/\/$/, '')
}

export function RootLayout() {
  const { me, logout } = useAuth()
  const { totalQty } = useCart()
  const { sections: businessSections } = useBusinessSections()
  const adminBase = adminHref()
  const [backTopVisible, setBackTopVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setBackTopVisible(window.scrollY > 380)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navCls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined)

  return (
    <>
      <header className="site-header">
        <div className="container">
          <nav className="navbar">
            <div className="logo">
              <Link to="/" className="logo-text">
                Moban Shop
              </Link>
            </div>
            <div className="nav-links">
              <NavLink to="/" end className={navCls}>
                首页
              </NavLink>
              {businessSections.map((s) => (
                <NavLink key={s.slug} to={`/${s.slug}`} className={navCls}>
                  {s.label}
                </NavLink>
              ))}
              <NavLink to="/products" className={navCls}>
                模板
              </NavLink>
              <NavLink to="/docs" className={navCls}>
                文档
              </NavLink>
            </div>
            <div className="navbar-actions">
              <GlobalSearch />
              <Link className="nav-btn-plain nav-cart-link" to="/cart">
                <span className="cart-icon-wrap" aria-hidden>
                  <i className="fas fa-shopping-cart" />
                  {totalQty > 0 ? (
                    <span className="cart-chip">{totalQty > 99 ? '99+' : totalQty}</span>
                  ) : null}
                </span>
              </Link>
              {me ? (
                <>
                  <Link
                    className="nav-btn-plain nav-icon-btn"
                    to="/account"
                    aria-label="个人中心"
                    title="个人中心"
                  >
                    <i className="fas fa-user-circle" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className="nav-btn-plain nav-icon-btn"
                    onClick={() => logout()}
                    aria-label="退出登录"
                    title="退出登录"
                  >
                    <i className="fas fa-sign-out-alt" aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <Link className="btn btn-login" to="/login">
                    登录
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="storefront-main">
        <Outlet />
      </main>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h3>关于我们</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: 20 }}>
                Moban Shop 提供高质量模板与站点脚手架，致力于为开发者提供专业、可用的商城与内容站方案。
              </p>
              {adminBase ? (
                <p style={{ color: 'var(--text-light)', fontSize: '0.92rem' }}>
                  后台管理：
                  <a href={adminBase} target="_blank" rel="noopener noreferrer">
                    打开控制台
                  </a>
                  （帐号与前台用户分离）
                </p>
              ) : null}
            </div>

            <div className="footer-col">
              <h3>产品服务</h3>
              <ul className="footer-links">
                {businessSections.map((s) => (
                  <li key={s.slug}>
                    <Link to={`/${s.slug}`}>
                      <i className="fas fa-angle-right" /> {s.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/products">
                    <i className="fas fa-angle-right" /> 模板商城
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3>帮助中心</h3>
              <ul className="footer-links">
                <li>
                  <Link to="/docs">
                    <i className="fas fa-angle-right" /> 开发文档
                  </Link>
                </li>
                <li>
                  <Link to="/products">
                    <i className="fas fa-angle-right" /> 浏览模板
                  </Link>
                </li>
                <li>
                  <Link to="/register">
                    <i className="fas fa-angle-right" /> 创建账户
                  </Link>
                </li>
                <li>
                  <Link to="/login">
                    <i className="fas fa-angle-right" /> 用户登录
                  </Link>
                </li>
                <li className="add-btn">
                  <span>
                    <i className="fas fa-angle-right" /> 联系我们
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="copyright">
            <p>© {new Date().getFullYear()} Moban Shop. 保留所有权利.</p>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className={`back-to-top${backTopVisible ? ' show' : ''}`}
        id="backToTop"
        aria-label="返回顶部"
        onClick={scrollTop}
      >
        <i className="fas fa-arrow-up" />
      </button>
    </>
  )
}
