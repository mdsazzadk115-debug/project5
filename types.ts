
export interface Product {
  id?: string;
  name: string;
  brand: string;
  price: number;
  qty: number;
  img: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  discountPercent: number;
  stock: number;
  status: boolean;
  img: string;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  orderCount: number;
  address?: string;
}

export interface OrderStatusHistory {
  placed: string;
  packaging?: string;
  shipping?: string;
  delivered?: string;
}

export interface Order {
  id: string;
  timestamp: number;
  customer: Customer;
  address: string;
  date: string;
  products: Product[];
  paymentMethod: string;
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  status: 'Shipping' | 'Rejected' | 'Packaging' | 'Pending' | 'Delivered' | 'Returned' | 'Cancelled';
  statusHistory: OrderStatusHistory;
  courier_tracking_code?: string;
  courier_status?: string;
  courier_name?: 'Steadfast' | 'Pathao';
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  timestamp: number;
}

export interface DashboardStats {
  netProfit: number;
  grossProfit: number;
  totalExpenses: number;
  totalRevenue: number;
  onlineSold: number;
  orders: number;
  customers: number;
  totalProducts: number;
}

export interface CourierConfig {
  apiKey: string;
  secretKey: string;
}

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  isSandbox: boolean;
  webhookSecret?: string;
}
