const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  AUD: 'A$',
  CAD: 'C$',
}

function currencySymbol(code: string): string {
  const upper = code.toUpperCase()
  if (CURRENCY_SYMBOL[upper]) return CURRENCY_SYMBOL[upper]

  try {
    const part = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: upper,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')
    return part?.value ?? upper
  } catch {
    return upper
  }
}

/** 分 → 「USD$12.99」形式（ISO 代码 + 符号 + 金额） */
export function formatMinor(amountMinor: number, currency: string): string {
  const code = currency.trim().toUpperCase()
  const amount = (amountMinor / 100).toFixed(2)
  return `${code}${currencySymbol(code)}${amount}`
}
