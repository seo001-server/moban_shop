export type PaginatedList<T> = {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type BusinessItem = {
  id: number
  section_slug: 'program' | 'luodi' | 'cdn' | 'resources' | 'monetize'
  title: string
  description: string
  sort_order: number
  created_at: string
  updated_at?: string
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
  visible: boolean
  downloads: number
  score: number
  created_at: string
}

export type AdminAuditLog = {
  id: number
  admin_id: number
  admin_account: string
  admin_nickname: string
  action: string
  resource: string
  resource_id: string
  detail: string
  ip: string
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type AdminProfile = {
  id: number
  account: string
  nickname: string
}

export type AdminMeResponse = {
  admin: AdminProfile
}

export type AdminUser = {
  id: number
  user_no: string
  email: string
  created_at: string
}

export type AdminOrderItem = {
  product_id: number
  product_title: string
  quantity: number
  unit_price_minor: number
  line_total_minor: number
}

export type AdminOrder = {
  id: number
  order_no: string
  user_id: number
  user_email: string
  status: string
  total_amount_minor: number
  currency: string
  item_count: number
  items_summary: string
  items?: AdminOrderItem[]
  created_at: string
  updated_at: string
}

export type DashboardStats = {
  users_count: number
  templates_count: number
  orders_count: number
  orders_pending_count: number
  orders_paid_count: number
  revenue_minor: number
}

export type DailyCount = {
  date: string
  count: number
}

export type DashboardTrendSummary = {
  yesterday_users: number
  yesterday_orders: number
  today_users: number
  today_orders: number
}

export type TopProductSales = {
  product_id: number
  product_title: string
  sales_qty: number
}

export type DashboardTrends = {
  users_days: number
  users: DailyCount[]
  orders_days: number
  orders: DailyCount[]
  top_days: number
  summary: DashboardTrendSummary
  top_products: TopProductSales[]
}

export type DashboardData = {
  stats: DashboardStats
  trends: DashboardTrends
}

export type BusinessSectionMeta = {
  slug: string
  label: string
  icon: string
  tagline: string
  description: string
  sort_order: number
  enabled: boolean
}

export type HomepageButton = {
  label: string
  to: string
}

export type HomepageHero = {
  title: string
  subtitle: string
  primary_button: HomepageButton
  secondary_button: HomepageButton
}

export type HomepageCategoryCard = {
  icon: string
  title: string
  description: string
  to: string
}

export type HomepageFeature = {
  icon: string
  title: string
  text: string
}

export type HomepageContent = {
  hero: HomepageHero
  category_cards: HomepageCategoryCard[]
  features: HomepageFeature[]
}

export type ProductBatchDeleteResult = {
  deleted: number[]
  blocked: { id: number; reason: string }[]
}

export type ProductBatchUpdateResult = {
  updated: number[]
}

export type DocSummary = {
  slug: string
  title: string
  updated_at: string
}

export type DocDetail = {
  slug: string
  title: string
  markdown: string
  updated_at: string
}
