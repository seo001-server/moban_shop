export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
  refunded: '已退款',
}

export function orderStatusClass(status: string): string {
  if (status === 'pending') return 'account-status-pending'
  if (status === 'paid') return 'account-status-paid'
  if (status === 'cancelled') return 'account-status-cancelled'
  if (status === 'refunded') return 'account-status-refunded'
  return 'account-status-cancelled'
}
