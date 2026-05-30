export function getRouteTitle(pathname: string, _search?: string): string {
  if (pathname === '/') return '数据看板'
  if (pathname === '/users') return '用户管理'
  const userDetail = /^\/users\/(\d+)$/.exec(pathname)
  if (userDetail) return `用户 #${userDetail[1]}`
  if (pathname === '/templates') return '模板管理'
  if (pathname === '/templates/new') return '新建模板'
  if (pathname === '/business') return '业务产品'
  if (pathname === '/orders') return '订单管理'
  const orderDetail = /^\/orders\/(\d+)$/.exec(pathname)
  if (orderDetail) return `订单 #${orderDetail[1]}`
  return '页面'
}
