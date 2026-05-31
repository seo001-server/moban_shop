export type CartLine = {
  id: number
  slug: string
  title: string
  price_minor: number
  currency: string
  image_url: string | null
  product_visible?: boolean
  qty: number
}

export const CART_STORAGE_KEY = 'moban_shop_cart'
