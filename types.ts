
// Enums
export enum ProductType {
  FINAL = 'Produto Final',
  INSUMO = 'Insumo'
}

export enum MovementType {
  ENTRADA_COMPRA = 'Entrada Compra',
  ENTRADA_AJUSTE = 'Entrada Ajuste',
  SAIDA_VENDA = 'Saída Venda',
  SAIDA_PERDA = 'Saída Perda',
  SAIDA_CONSUMO = 'Saída Consumo Interno',
  PRODUCAO = 'Produção',
  AJUSTE = 'Ajuste de Inventário',
  ESTORNO_VENDA = 'Estorno de Venda'
}

export enum PaymentMethod {
  DINHEIRO = 'Dinheiro',
  DEBITO = 'Débito',
  CREDITO = 'Crédito',
  PIX = 'Pix',
  VR = 'VR',
  FUNCIONARIO = 'Funcionário'
}

export enum SaleStatus {
  ABERTA = 'Aberta',
  FECHADA = 'Fechada',
  CANCELADA = 'Cancelada'
}

export enum ExpenseCategory {
  ALUGUEL = 'Aluguel',
  ENERGIA = 'Energia',
  INSUMOS = 'Insumos',
  FOLHA = 'Folha',
  OUTROS = 'Outros'
}

// Interfaces matching Database Schema (snake_case)

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'venda';
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  active: boolean;
}

export interface Product {
  id: string;
  category: string; // text in DB
  name: string;
  type: string;
  unit: string;
  price: number;
  cost: number;
  min_stock: number; // db: min_stock
  image_url?: string; // db: image_url
  active: boolean;
  created_at?: string;
}

export interface StockMovement {
  id: string;
  created_at: string;
  movement_type: string; // db: movement_type
  product_id: string; // db: product_id
  quantity: number;
  unit_cost?: number; // db: unit_cost
  origin?: string;
  notes?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  unit_cost: number;
  // Join fields
  products?: { name: string }; 
}

export interface Sale {
  id: string;
  sale_datetime: string; // db: sale_datetime
  channel: string;
  status: string;
  payment_method: string;
  origin?: string; // 'cliente' | 'funcionario'
  gross_value: number;
  discount_value: number;
  net_value: number;
  total_cost: number;
  canceled: boolean;
  // Join fields
  sale_items?: SaleItem[]; 
}

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  value: number;
  payment_method: string;
  fixed_or_variable: string;
  canceled: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  daily_meal_limit: number;
  weekly_hours_expected?: number;
  default_shift_type?: string;
  default_start_time?: string;
  default_end_time?: string;
  active: boolean;
}

export interface MealConsumption {
  id: string;
  meal_date: string;
  employee_id: string;
  value: number;
  description: string;
  related_sale_id?: string;
  canceled: boolean;
}

export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_date: string;
  shift_type: string;
  planned_start: string;
  planned_end: string;
  status: string;
  notes?: string;
  // Join fields
  employees?: { name: string };
}

export interface EmployeeTimeRecord {
  id: string;
  employee_id: string;
  record_date: string;
  check_in_time: string;
  check_out_time?: string;
  source: string;
  notes?: string;
  // Join fields
  employees?: { name: string };
}

// Helper types for UI
export interface CartItem {
  product: Product;
  quantity: number;
  total: number;
}
