import { createContext, useContext, type ReactNode } from 'react'

type TabPageContextValue = {
  tabKey: string
  isActive: boolean
}

const TabPageContext = createContext<TabPageContextValue>({
  tabKey: '',
  isActive: true,
})

export function TabPageProvider({
  tabKey,
  isActive,
  children,
}: {
  tabKey: string
  isActive: boolean
  children: ReactNode
}) {
  return (
    <TabPageContext.Provider value={{ tabKey, isActive }}>{children}</TabPageContext.Provider>
  )
}

/** 当前页签面板是否处于激活（可见）状态，非激活时不应抢焦点或弹窗 */
export function useTabPageActive() {
  return useContext(TabPageContext).isActive
}

export function useTabPageKey() {
  return useContext(TabPageContext).tabKey
}
