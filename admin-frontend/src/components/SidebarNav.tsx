import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 2.5h5v5H2v-5Zm7 0h5v3h-5v-3ZM2 9.5h5v4H2v-4Zm7 1h5v3h-5v-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 4.5a2 2 0 1 1 0 4M11 13c0-1.5.8-2.8 2-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTemplates() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconBusiness() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5h4v3H3v-3Zm6 0h4v3H9v-3ZM3 9.5h4v2H3v-2Zm6 0h4v2H9v-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconOrders() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 2.5h10v11H3v-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCms() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3.5h10v9H3v-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 6.5h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3.5h10v9H3v-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 6.5h6M5 9h4M5 11.5h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type NavItemProps = {
  to: string
  icon: ReactNode
  label: string
  active?: boolean
  end?: boolean
}

function NavItem({ to, icon, label, active, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={() => `admin-sidebar__link${active ? ' is-active' : ''}`}
    >
      {icon}
      <span className="admin-sidebar__label">{label}</span>
    </NavLink>
  )
}

export function SidebarNav() {
  const { pathname } = useLocation()

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__mark">M</span>
        <span className="admin-sidebar__brand-text">Moban Shop</span>
      </div>

      <nav className="admin-sidebar__nav" aria-label="主导航">
        <NavItem to="/" icon={<IconDashboard />} label="数据看板" active={pathname === '/'} end />
        <NavItem
          to="/users"
          icon={<IconUsers />}
          label="用户管理"
          active={pathname.startsWith('/users')}
        />
        <NavItem
          to="/templates"
          icon={<IconTemplates />}
          label="模板管理"
          active={pathname.startsWith('/templates')}
        />
        <NavItem
          to="/business"
          icon={<IconBusiness />}
          label="业务产品"
          active={pathname.startsWith('/business')}
        />
        <NavItem
          to="/orders"
          icon={<IconOrders />}
          label="订单管理"
          active={pathname.startsWith('/orders')}
        />

        <div className="admin-sidebar__group-label">站点内容</div>
        <NavItem
          to="/cms/sections"
          icon={<IconCms />}
          label="业务板块"
          active={pathname.startsWith('/cms/sections')}
        />
        <NavItem
          to="/cms/homepage"
          icon={<IconCms />}
          label="首页配置"
          active={pathname.startsWith('/cms/homepage')}
        />
        <NavItem
          to="/cms/docs/template-dev"
          icon={<IconCms />}
          label="开发文档"
          active={pathname.startsWith('/cms/docs')}
        />

        <div className="admin-sidebar__group-label">系统</div>
        <NavItem
          to="/audit-logs"
          icon={<IconAudit />}
          label="审计日志"
          active={pathname.startsWith('/audit-logs')}
        />
      </nav>
    </aside>
  )
}

export { IconLogout }
