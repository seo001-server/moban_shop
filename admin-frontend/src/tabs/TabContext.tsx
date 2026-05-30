import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { HOME_TAB_KEY, LIST_TAB_PATHS, MAX_TABS } from './constants'
import { getRouteTitle } from './routeTitles'
import { getDefaultTabs, loadStoredTabs, saveStoredTabs } from './tabStorage'

export type AdminTab = {
  key: string
  path: string
  title: string
  closable: boolean
  locationState?: unknown
}

type TabContextValue = {
  tabs: AdminTab[]
  activeKey: string
  contentScrollRef: RefObject<HTMLElement | null>
  switchTab: (key: string) => void
  closeTab: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
  updateTabTitle: (title: string, key?: string) => void
  resetTabTitle: (key?: string) => void
}

const TabContext = createContext<TabContextValue | null>(null)

function locationKey(loc: Pick<Location, 'pathname' | 'search'>) {
  return loc.pathname + loc.search
}

function tabKey(loc: Pick<Location, 'pathname' | 'search'>) {
  if (LIST_TAB_PATHS.has(loc.pathname)) {
    return loc.pathname
  }
  return locationKey(loc)
}

function normalizeTab(tab: AdminTab): AdminTab {
  const { pathname } = parseTabPath(tab.path)
  if (!LIST_TAB_PATHS.has(pathname)) {
    return tab
  }
  return { ...tab, key: pathname }
}

function normalizeTabs(tabs: AdminTab[]): AdminTab[] {
  const latest = new Map<string, AdminTab>()
  for (const tab of tabs) {
    const n = normalizeTab(tab)
    latest.set(n.key, n)
  }
  const seen = new Set<string>()
  const out: AdminTab[] = []
  for (const tab of tabs) {
    const n = normalizeTab(tab)
    if (seen.has(n.key)) continue
    seen.add(n.key)
    out.push(latest.get(n.key)!)
  }
  return out
}

function normalizeActiveKey(raw: string, tabs: AdminTab[]): string {
  const { pathname } = parseTabPath(raw.startsWith('/') ? raw : `/${raw}`)
  if (LIST_TAB_PATHS.has(pathname)) {
    return tabs.some((t) => t.key === pathname) ? pathname : tabs[0]?.key ?? HOME_TAB_KEY
  }
  return tabs.some((t) => t.key === raw) ? raw : tabs[0]?.key ?? HOME_TAB_KEY
}

function parseTabPath(path: string): { pathname: string; search: string } {
  const q = path.indexOf('?')
  if (q === -1) return { pathname: path || '/', search: '' }
  return { pathname: path.slice(0, q) || '/', search: path.slice(q) }
}

function createTab(loc: Location): AdminTab {
  const key = tabKey(loc)
  const path = locationKey(loc)
  return {
    key,
    path,
    title: getRouteTitle(loc.pathname, loc.search),
    closable: key !== HOME_TAB_KEY,
    locationState: loc.state,
  }
}

type Props = {
  children: ReactNode
  enabled: boolean
}

export function TabProvider({ children, enabled }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const stored = loadStoredTabs()
  const defaults = getDefaultTabs()

  const [tabs, setTabs] = useState<AdminTab[]>(() =>
    normalizeTabs(stored?.tabs ?? defaults.tabs),
  )
  const [activeKey, setActiveKey] = useState(() =>
    normalizeActiveKey(stored?.activeKey ?? defaults.activeKey, normalizeTabs(stored?.tabs ?? defaults.tabs)),
  )

  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey

  const contentScrollRef = useRef<HTMLElement | null>(null)
  const scrollTopsRef = useRef<Record<string, number>>({})
  const prevActiveKeyRef = useRef(activeKey)

  useEffect(() => {
    if (!enabled) return

    const key = tabKey(location)
    const path = locationKey(location)

    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.key === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          path,
          locationState: location.state,
        }
        return next
      }

      if (prev.length >= MAX_TABS) {
        showToast(`最多同时打开 ${MAX_TABS} 个页签`, 'warning')
        queueMicrotask(() => {
          const current = prev.find((t) => t.key === activeKeyRef.current)
          if (current) {
            navigate(current.path, { replace: true, state: current.locationState })
          }
        })
        return prev
      }

      return [...prev, createTab(location)]
    })

    setActiveKey(key)
  }, [enabled, location.pathname, location.search, location.state, location.key, navigate, showToast])

  useEffect(() => {
    if (!enabled) return
    saveStoredTabs({ tabs, activeKey })
  }, [enabled, tabs, activeKey])

  useEffect(() => {
    if (!enabled) return

    const prev = prevActiveKeyRef.current
    const next = activeKey
    if (prev === next) return

    const el = contentScrollRef.current
    if (el) {
      scrollTopsRef.current[prev] = el.scrollTop
      requestAnimationFrame(() => {
        el.scrollTop = scrollTopsRef.current[next] ?? 0
      })
    }

    prevActiveKeyRef.current = next
  }, [enabled, activeKey])

  const updateTabTitle = useCallback((title: string, key?: string) => {
    const target = key ?? activeKeyRef.current
    setTabs((prev) => prev.map((t) => (t.key === target ? { ...t, title } : t)))
  }, [])

  const resetTabTitle = useCallback((key?: string) => {
    const target = key ?? activeKeyRef.current
    setTabs((prev) =>
      prev.map((t) => {
        if (t.key !== target) return t
        const { pathname, search } = parseTabPath(t.path)
        return { ...t, title: getRouteTitle(pathname, search) }
      }),
    )
  }, [])

  const switchTab = useCallback(
    (key: string) => {
      const tab = tabs.find((t) => t.key === key)
      if (!tab) return
      navigate(tab.path, { state: tab.locationState })
    },
    [tabs, navigate],
  )

  const closeTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.key === key)
        if (!tab?.closable) return prev

        const idx = prev.findIndex((t) => t.key === key)
        const next = prev.filter((t) => t.key !== key)
        delete scrollTopsRef.current[key]

        if (activeKeyRef.current === key) {
          const fallback = next[Math.min(idx, next.length - 1)] ?? next[next.length - 1]
          if (fallback) {
            queueMicrotask(() => navigate(fallback.path, { state: fallback.locationState }))
          }
        }

        return next
      })
    },
    [navigate],
  )

  const closeOtherTabs = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const keep = prev.filter((t) => t.key === key || !t.closable)
        const keepKeys = new Set(keep.map((t) => t.key))
        for (const k of Object.keys(scrollTopsRef.current)) {
          if (!keepKeys.has(k)) delete scrollTopsRef.current[k]
        }
        if (activeKeyRef.current !== key) {
          const tab = keep.find((t) => t.key === key)
          if (tab) {
            queueMicrotask(() => navigate(tab.path, { state: tab.locationState }))
          }
        }
        return keep
      })
    },
    [navigate],
  )

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => {
      const home = prev.filter((t) => !t.closable)
      scrollTopsRef.current = { [HOME_TAB_KEY]: scrollTopsRef.current[HOME_TAB_KEY] ?? 0 }
      queueMicrotask(() => navigate(HOME_TAB_KEY, { replace: true }))
      return home.length > 0 ? home : getDefaultTabs().tabs
    })
  }, [navigate])

  const value = useMemo(
    () => ({
      tabs,
      activeKey,
      contentScrollRef,
      switchTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      updateTabTitle,
      resetTabTitle,
    }),
    [
      tabs,
      activeKey,
      switchTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      updateTabTitle,
      resetTabTitle,
    ],
  )

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>
}

export function useTabs() {
  const ctx = useContext(TabContext)
  if (!ctx) {
    throw new Error('useTabs 须在 TabProvider 内使用')
  }
  return ctx
}

export function tabToLocation(tab: AdminTab): Location {
  const { pathname, search } = parseTabPath(tab.path)
  return {
    pathname,
    search,
    hash: '',
    state: tab.locationState ?? null,
    key: tab.key,
    unstable_mask: undefined,
  }
}
