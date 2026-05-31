import { useEffect } from 'react'

const SITE_NAME = 'Moban Shop'

type Props = {
  title: string
  description?: string
  noIndex?: boolean
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

/** 设置 document.title 与基础 SEO meta（无需 react-helmet） */
export function PageMeta({ title, description, noIndex }: Props) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
    document.title = fullTitle

    if (description) {
      upsertMeta('description', description)
      upsertMeta('og:title', fullTitle, 'property')
      upsertMeta('og:description', description, 'property')
    }

    if (noIndex) {
      upsertMeta('robots', 'noindex, nofollow')
    } else {
      const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
      if (robots?.content === 'noindex, nofollow') {
        robots.remove()
      }
    }
  }, [title, description, noIndex])

  return null
}

export const PAGE_DESCRIPTIONS = {
  home: '高质量网站模板与站点脚手架，影视、阅读、游戏、商城等多场景开箱即用。',
  products: '浏览全部模板，按类目筛选，在线演示与一键购买。',
  cart: '管理已选模板，调整数量并前往结算。',
  checkout: '确认订单信息并完成支付。',
  account: '查看订单、已购资源与账户安全设置。',
  login: '使用邮箱登录 Moban Shop 前台账户。',
  register: '创建 Moban Shop 账户，购买与管理模板。',
  docs: '部署文档与使用说明，快速上线您的站点。',
  notFound: '您访问的页面不存在。',
} as const
