export function formatMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amountMinor / 100)
  } catch {
    return `${amountMinor / 100} ${currency}`
  }
}
