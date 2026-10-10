export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number; // Untuk kalkulasi laba/rugi
  stock: number;
  minStock: number; // Batas minimum sebelum peringatan stok menipis
  imageUrl?: string;
}

export interface TransactionItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  discount: number; // Diskon nominal per item
  total: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // ISO String
  items: TransactionItem[];
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: "cash" | "qris" | "gopay" | "ovo" | "dana" | "shopeepay";
  cashAmount?: number;
  changeAmount?: number;
  cashierId: string;
  cashierName: string;
}

export type UserRole = "owner" | "admin" | "cashier";

export interface User {
  id: string;
  auth_id?: string; // Tambahan untuk merujuk ke ID Supabase Auth
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface SyncConfig {
  googleSheetsUrl: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
}

export interface StoreSettings {
  id?: number | string;
  name: string;
  address: string;
  phone: string;
  isTaxEnabled?: boolean;
  taxPercentage?: number;
  is_tax_enabled?: boolean;
  tax_percentage?: number;
}

export interface Category {
  id: string;
  name: string;
}

export type ActiveTab =
  | "dashboard"
  | "kasir"
  | "riwayat"
  | "stok"
  | "kategori"
  | "user"
  | "pengaturan";

// Data awal default untuk pengguna (akun sistem)
export const INITIAL_USERS: User[] = [];

// Kategori awal bawaan tanpa properti icon sama sekali
export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
