export type BusinessSection = {
  slug: string
  label: string
  icon: string
  tagline: string
  description: string
  empty?: boolean
}

export const BUSINESS_SECTIONS: BusinessSection[] = [
  {
    slug: 'program',
    label: '程序',
    icon: 'fa-code',
    tagline: '站群管理程序',
    description:
      '面向多站点运营，提供站群统一管理程序，支持批量建站、内容分发与模板切换，快速搭建规模化内容站点矩阵。',
  },
  {
    slug: 'luodi',
    label: '落地',
    icon: 'fa-lock',
    tagline: '各种加密软件',
    description:
      '提供多种落地页加密与防护方案，降低站点在分发与访问链路中被识别、被拦截的风险。',
  },
  {
    slug: 'cdn',
    label: 'cdn',
    icon: 'fa-cloud',
    tagline: 'CDN 搭建',
    description:
      '面向内容分发与加速需求，提供 CDN 节点规划、回源配置、缓存策略与 HTTPS 接入支持。',
  },
  {
    slug: 'resources',
    label: '资源',
    icon: 'fa-database',
    tagline: '采集资源',
    description:
      '围绕内容站点运营，提供资源采集、整理、入库与更新流程支持，快速搭建可维护的内容资源池。',
  },
  {
    slug: 'monetize',
    label: '变现',
    icon: 'fa-chart-line',
    tagline: '回收流量',
    description:
      '针对已有流量与访问场景，提供流量回收、转化路径设计与变现策略，让访问价值高效沉淀。',
  },
]

export function getBusinessSection(slug: string): BusinessSection | undefined {
  return BUSINESS_SECTIONS.find((s) => s.slug === slug)
}
