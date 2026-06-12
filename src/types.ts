export interface Page {
  id: string
  name: string
  category?: string | null
  picture?: string | null
  fan_count?: number | null
  webhook_subscribed: string
}

export type StockStatus = 'in_stock' | 'low_stock' | 'stockout'

export interface Product {
  id: string
  page_id: string
  sku?: string | null
  name: string
  description?: string | null
  price: number
  currency: string
  stock_qty: number
  low_stock_threshold: number
  image_url?: string | null
  is_active: boolean
  status: StockStatus
  updated_at?: string | null
}

export interface ProductListResponse {
  products: Product[]
  total: number
  in_stock: number
  low_stock: number
  stockout: number
}

export interface Merchant {
  page_id: string
  merchant_name: string
  bank_account: string
  merchant_city: string
  terminal_label: string
  store_label: string
  phone_number?: string | null
  is_active: boolean
}

export interface OrderItem {
  product_id?: string | null
  name: string
  qty: number
  price: number
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'expired'

export interface Order {
  id: string
  page_id: string
  sender_id?: string | null
  items: OrderItem[]
  total: number
  currency: string
  customer_name?: string | null
  delivery_info?: string | null
  note?: string | null
  status: OrderStatus
  created_at: string
}

export interface OrderListResponse {
  orders: Order[]
  total: number
  pending: number
  paid: number
  revenue: number
}

export interface PaymentInit {
  order_id: string
  payment_id: string
  amount: number
  currency: string
  md5_hash: string
  qr_string: string
  image_uri?: string | null
  deeplink?: string | null
  expires_at?: string | null
}

export interface PaymentStatus {
  order_id: string
  payment_id: string
  status: 'Pending' | 'Paid' | 'Expired'
  order_status: OrderStatus
  paid_at?: string | null
}
