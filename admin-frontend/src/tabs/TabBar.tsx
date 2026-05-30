import { useEffect, useRef, useState } from 'react'
import { useTabs } from './TabContext'

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 3l6 6M9 3 3 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

type MenuState = {
  x: number
  y: number
  tabKey: string
} | null

export function TabBar() {
  const { tabs, activeKey, switchTab, closeTab, closeOtherTabs, closeAllTabs } = useTabs()
  const [menu, setMenu] = useState<MenuState>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenu(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menu])

  if (tabs.length === 0) return null

  const menuTab = menu ? tabs.find((t) => t.key === menu.tabKey) : null

  return (
    <>
      <div className="admin-tabbar" role="tablist" aria-label="已打开页面">
        <div className="admin-tabbar__scroll">
          {tabs.map((tab) => {
            const active = tab.key === activeKey
            return (
              <div
                key={tab.key}
                className={`admin-tabbar__item${active ? ' is-active' : ''}`}
                role="tab"
                aria-selected={active}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ x: e.clientX, y: e.clientY, tabKey: tab.key })
                }}
              >
                <button
                  type="button"
                  className="admin-tabbar__label"
                  onClick={() => switchTab(tab.key)}
                  title={tab.title}
                >
                  {tab.title}
                </button>
                {tab.closable ? (
                  <button
                    type="button"
                    className="admin-tabbar__close"
                    aria-label={`关闭 ${tab.title}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.key)
                    }}
                  >
                    <IconClose />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {menu && menuTab ? (
        <div
          ref={menuRef}
          className="admin-tabbar-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            className="admin-tabbar-menu__item"
            role="menuitem"
            disabled={!menuTab.closable}
            onClick={() => {
              closeTab(menu.tabKey)
              setMenu(null)
            }}
          >
            关闭
          </button>
          <button
            type="button"
            className="admin-tabbar-menu__item"
            role="menuitem"
            onClick={() => {
              closeOtherTabs(menu.tabKey)
              setMenu(null)
            }}
          >
            关闭其他
          </button>
          <button
            type="button"
            className="admin-tabbar-menu__item"
            role="menuitem"
            onClick={() => {
              closeAllTabs()
              setMenu(null)
            }}
          >
            关闭全部
          </button>
        </div>
      ) : null}
    </>
  )
}
