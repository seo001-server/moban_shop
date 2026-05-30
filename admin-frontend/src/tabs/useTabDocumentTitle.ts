import { useEffect } from 'react'
import { useTabs } from '../tabs/TabContext'
import { getRouteTitle } from '../tabs/routeTitles'

/** 根据页面内状态（如弹窗）更新当前页签标题，关闭时恢复默认标题 */
export function useTabDocumentTitle(
  detailTitle: string | null,
  pathname: string,
  search = '',
) {
  const { updateTabTitle, resetTabTitle } = useTabs()
  const baseTitle = getRouteTitle(pathname, search)

  useEffect(() => {
    if (detailTitle) {
      updateTabTitle(`${baseTitle} · ${detailTitle}`)
    } else {
      resetTabTitle()
    }
  }, [detailTitle, baseTitle, updateTabTitle, resetTabTitle])
}
