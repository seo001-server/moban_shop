export function formatMoney(minor: number, currency: string) {
  const major = minor / 100
  return `${currency} ${major.toFixed(2)}`
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
  refunded: '已退款',
}

export function formatOrderStatus(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status
}

export function orderStatusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'badge--yes'
    case 'pending':
      return 'badge--pending'
    case 'cancelled':
    case 'refunded':
      return 'badge--muted'
    default:
      return ''
  }
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString()
}

/** 已支付/已退款订单展示支付时间，其余显示 — */
export function formatPaidAt(status: string, updatedAt?: string) {
  if (status !== 'paid' && status !== 'refunded') return '—'
  if (!updatedAt) return '—'
  return formatDateTime(updatedAt)
}
