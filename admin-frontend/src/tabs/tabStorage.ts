import { HOME_TAB_KEY, TAB_STORAGE_KEY } from './constants'

export type StoredTab = {
  key: string
  path: string
  title: string
  closable: boolean
  locationState?: unknown
}

type StoredTabs = {
  tabs: StoredTab[]
  activeKey: string
}

const DEFAULT: StoredTabs = {
  tabs: [{ key: HOME_TAB_KEY, path: HOME_TAB_KEY, title: '数据看板', closable: false }],
  activeKey: HOME_TAB_KEY,
}

export function loadStoredTabs(): StoredTabs | null {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredTabs
    if (!parsed.tabs?.length) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredTabs(data: StoredTabs) {
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredTabs() {
  sessionStorage.removeItem(TAB_STORAGE_KEY)
}

export function getDefaultTabs(): StoredTabs {
  return DEFAULT
}
