import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  adminApiFetch,
  getAdminToken,
  setAdminToken,
  setAdminUnauthorizedHandler,
} from '../api/adminHttp'
import type { AdminMeResponse, AdminProfile } from '../api/types'
import { AdminSettingsPanel } from '../components/AdminSettingsPanel'
import { Dialog } from '../components/Dialog'
import { IconLogout, SidebarNav } from '../components/SidebarNav'
import { TabBar } from '../tabs/TabBar'
import { TabPanels } from '../tabs/TabPanels'
import { TabProvider, useTabs } from '../tabs/TabContext'
import { clearStoredTabs } from '../tabs/tabStorage'

function IconSidebarToggle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 3.5h12M2 8h12M2 12.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function adminInitial(nickname: string): string {
  const s = nickname.trim()
  if (!s) return '?'
  return s[0].toUpperCase()
}

function AdminShellBody({ ready, sidebarCollapsed, admin, onToggleSidebar, onLogout, onOpenSettings }: {
  ready: boolean
  sidebarCollapsed: boolean
  admin: AdminProfile | null
  onToggleSidebar: () => void
  onLogout: () => void
  onOpenSettings: () => void
}) {
  const { contentScrollRef } = useTabs()

  return (
    <>
      <header className="admin-header">
        <div className="admin-header__leading">
          <button
            type="button"
            className="admin-header__toggle"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? '展开菜单' : '收起菜单'}
            aria-expanded={!sidebarCollapsed}
          >
            <IconSidebarToggle />
          </button>
          <span className="admin-header__title">管理后台</span>
        </div>
        <div className="admin-header__actions">
          {admin ? (
            <button type="button" className="admin-header__user" title={admin.account} onClick={onOpenSettings}>
              <span className="admin-header__avatar" aria-hidden="true">
                {adminInitial(admin.nickname)}
              </span>
              <span className="admin-header__nickname">{admin.nickname}</span>
            </button>
          ) : null}
          <button type="button" className="linkish" onClick={onLogout}>
            <IconLogout />
            退出
          </button>
        </div>
      </header>

      {ready ? <TabBar /> : null}

      <main className="admin-content" ref={contentScrollRef}>
        {ready ? <TabPanels /> : <div className="loading-state">验证登录…</div>}
      </main>
    </>
  )
}

export function MainLayout() {
  const nav = useNavigate()
  const token = getAdminToken()
  const [ready, setReady] = useState(false)
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setAdminUnauthorizedHandler((reason) => {
      nav('/login', { replace: true, state: reason ? { reason } : undefined })
    })
    return () => setAdminUnauthorizedHandler(null)
  }, [nav])

  useEffect(() => {
    if (!token) {
      setReady(false)
      setAdmin(null)
      return
    }
    let alive = true
    setReady(false)
    setAdmin(null)
    ;(async () => {
      try {
        const res = await adminApiFetch<AdminMeResponse>('/api/admin/me')
        if (alive) {
          setAdmin(res.admin)
          setReady(true)
        }
      } catch {
        if (alive) {
          setAdmin(null)
          setReady(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [token])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  function logout() {
    setAdminToken(null)
    clearStoredTabs()
    nav('/login', { replace: true })
  }

  return (
    <TabProvider enabled={ready}>
      <div className={`admin-shell${sidebarCollapsed ? ' admin-shell--sidebar-collapsed' : ''}`}>
        <SidebarNav />

        <div className="admin-main">
          <AdminShellBody
            ready={ready}
            sidebarCollapsed={sidebarCollapsed}
            admin={admin}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            onLogout={logout}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <Dialog open={settingsOpen && admin !== null} title="账号设置" onClose={() => setSettingsOpen(false)}>
        {admin ? (
          <AdminSettingsPanel
            admin={admin}
            onUpdated={(next) => setAdmin(next)}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </Dialog>
    </TabProvider>
  )
}
