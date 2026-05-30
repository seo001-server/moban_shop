export function getRouteTitle(pathname: string, _search?: string): string {
  if (pathname === '/') return '数据看板'
  if (pathname === '/users') return '用户管理'
  const userDetail = /^\/users\/(\d+)$/.exec(pathname)
  if (userDetail) return `用户 #${userDetail[1]}`
  if (pathname === '/templates') return '模板管理'
  if (pathname === '/templates/new') return '新建模板'
  if (pathname === '/business') return '业务产品'
  if (pathname === '/cms/sections') return '业务板块'
  if (pathname === '/cms/homepage') return '首页配置'
  if (pathname.startsWith('/cms/docs/')) return '文档编辑'
  if (pathname === '/orders') return '订单管理'
  if (pathname === '/audit-logs') return '审计日志'
  const orderDetail = /^\/orders\/(\d+)$/.exec(pathname)
  if (orderDetail) return `订单 #${orderDetail[1]}`
  return '页面'
}
