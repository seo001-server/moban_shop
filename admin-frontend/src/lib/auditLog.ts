const ACTION_LABELS: Record<string, string> = {
  'admin.login': '登录',
  'admin.update_me': '修改昵称',
  'admin.change_password': '修改密码',
  'order.update_status': '修改订单状态',
  'product.create': '创建模板',
  'product.update': '更新模板',
  'product.duplicate': '复制模板',
  'product.delete': '删除模板',
  'business.create': '创建业务产品',
  'business.update': '更新业务产品',
  'business.delete': '删除业务产品',
  'business_section.update': '更新业务板块',
  'doc.update': '更新文档',
  'site_content.update_homepage': '修改首页配置',
}

const RESOURCE_LABELS: Record<string, string> = {
  admin: '管理员',
  order: '订单',
  product: '模板',
  business: '业务产品',
  business_section: '业务板块',
  doc: '文档',
  site_content: '站点配置',
}

export const AUDIT_ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'admin.login', label: '登录' },
  { value: 'admin.update_me', label: '修改昵称' },
  { value: 'admin.change_password', label: '修改密码' },
  { value: 'order.update_status', label: '修改订单状态' },
  { value: 'product.create', label: '创建模板' },
  { value: 'product.update', label: '更新模板' },
  { value: 'product.duplicate', label: '复制模板' },
  { value: 'product.delete', label: '删除模板' },
  { value: 'business.create', label: '创建业务产品' },
  { value: 'business.update', label: '更新业务产品' },
  { value: 'business.delete', label: '删除业务产品' },
  { value: 'business_section.update', label: '更新业务板块' },
  { value: 'doc.update', label: '更新文档' },
  { value: 'site_content.update_homepage', label: '修改首页配置' },
] as const

export const AUDIT_RESOURCE_OPTIONS = [
  { value: '', label: '全部资源' },
  { value: 'admin', label: '管理员' },
  { value: 'order', label: '订单' },
  { value: 'product', label: '模板' },
  { value: 'business', label: '业务产品' },
  { value: 'business_section', label: '业务板块' },
  { value: 'doc', label: '文档' },
  { value: 'site_content', label: '站点配置' },
] as const

export function formatAuditAction(action: string) {
  return ACTION_LABELS[action] ?? action
}

export function formatAuditResource(resource: string) {
  return RESOURCE_LABELS[resource] ?? resource
}

export function canJumpAuditResource(resource: string, resourceId: string) {
  if (!resourceId) return false
  switch (resource) {
    case 'order':
    case 'product':
    case 'business_section':
    case 'site_content':
    case 'doc':
      return true
    default:
      return false
  }
}
