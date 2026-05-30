export type BusinessItem = {
  id: number
  section_slug: string
  title: string
  description: string
  sort_order: number
  created_at: string
}

export type Product = {
  id: number
  slug: string
  category: string
  title: string
  description?: string | null
  price_minor: number
  currency: string
  image_url?: string | null
  preview_url?: string | null
  sort_order: number
  recommended: boolean
  downloads: number
  score: number
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type MeResponse = {
  user: {
    id: number
    user_no: string
    email: string
    created_at: string
  }
}

export type OrderItem = {
  product_id: number
  product_slug: string
  product_title: string
  preview_url?: string | null
  image_url?: string | null
  quantity: number
  unit_price_minor: number
  line_total_minor: number
}

export type Order = {
  id: number
  order_no: string
  status: string
  total_amount_minor: number
  currency: string
  item_count: number
  items_summary: string
  items?: OrderItem[]
  created_at: string
}

export type PaginatedOrders = {
  items: Order[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type CreateOrderRequest = {
  items: { product_id: number; quantity: number }[]
  mock_pay?: boolean
}
