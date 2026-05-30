export type HomepageButton = {
  label: string
  to: string
}

export type HomepageHero = {
  title: string
  subtitle: string
  primary_button: HomepageButton
  secondary_button: HomepageButton
}

export type HomepageCategoryCard = {
  icon: string
  title: string
  description: string
  to: string
}

export type HomepageFeature = {
  icon: string
  title: string
  text: string
}

export type HomepageContent = {
  hero: HomepageHero
  category_cards: HomepageCategoryCard[]
  features: HomepageFeature[]
}

export const FALLBACK_HOMEPAGE: HomepageContent = {
  hero: {
    title: '专业级 <span>站群系统</span> 一站式解决方案',
    subtitle:
      '探索精心打磨的高质量前台与模板方案，示例数据可随时替换；注册用户即可管理个人账户，购物车与结账能力可按路线图接入后端。',
    primary_button: { label: '浏览热门模板', to: '/products' },
    secondary_button: { label: '查看推荐列表', to: '#featured-templates' },
  },
  category_cards: [
    {
      icon: 'fa-film',
      title: '影视娱乐',
      description: '点播、剧集、CMS 前台展示一站式主题',
      to: '/products?cat=film',
    },
    {
      icon: 'fa-book',
      title: '小说阅读',
      description: '书库、书架与章节阅读体验优化模板',
      to: '/products?cat=book',
    },
    {
      icon: 'fa-gamepad',
      title: '游戏社区',
      description: '资讯、攻略与下载资源整合布局',
      to: '/products?cat=game',
    },
    {
      icon: 'fa-shopping-cart',
      title: '商城导购',
      description: '模板选购、 SKU 呈现与购物车流程',
      to: '/products?cat=shop',
    },
  ],
  features: [
    {
      icon: 'fa-sync-alt',
      title: '持续更新',
      text: '所有模板保持定期迭代，可免费获取更新要点，让您的站点紧跟技术演进。',
    },
    {
      icon: 'fa-headset',
      title: '专业支持',
      text: '提供工作日在线答疑，协助您完成部署、主题配置与常见问题排查。',
    },
    {
      icon: 'fa-mobile-alt',
      title: '响应式设计',
      text: '模板面向多端适配，手机与桌面均可获得连贯的浏览体验。',
    },
    {
      icon: 'fa-shield-alt',
      title: '安全可靠',
      text: '代码结构与依赖保持透明，可降低未知脚本带来的运维风险。',
    },
    {
      icon: 'fa-rocket',
      title: '优化性能',
      text: '重视首屏加载与资源编排，更易与 CDN、缓存策略结合。',
    },
    {
      icon: 'fa-palette',
      title: '高度定制',
      text: '提供可替换的版面与色系思路，按需二次开发即可完成品牌化。',
    },
  ],
}
