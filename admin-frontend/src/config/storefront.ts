/** 商城前台站点根地址（与当前后台不同端口/域名）。 */
export function storefrontUrl(path = '/') {
  const raw = import.meta.env.VITE_STOREFRONT_URL || 'http://127.0.0.1:5173'
  const base = raw.replace(/\/$/, '')
  if (!path.startsWith('/')) {
    return `${base}/${path}`
  }
  return `${base}${path}`
}
