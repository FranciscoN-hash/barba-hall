export type UserRole = 'owner' | 'manager' | 'barber' | 'cashier';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  specialties: string[];
  commission_pct: number;
  monthly_target: number;
  work_days: number[];
  work_start: string;
  work_end: string;
  status: 'active' | 'inactive' | 'vacation';
  rating: number;
  created_at: string;
  updated_at: string;
}

export type CustomerStatus = 'active' | 'inactive' | 'vip';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  address: string | null;
  preferences: string | null;
  notes: string | null;
  loyalty_points: number;
  cashback_balance: number;
  total_visits: number;
  total_spent: number;
  avg_ticket: number;
  last_visit_at: string | null;
  tags: string[];
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration_min: number;
  commission_pct: number;
  photo_url: string | null;
  is_package: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  barcode: string | null;
  category: string;
  supplier: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductMovementType = 'in' | 'out' | 'adjust';

export interface ProductMovement {
  id: string;
  user_id: string;
  product_id: string;
  type: ProductMovementType;
  quantity: number;
  reason: string | null;
  created_at: string;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  user_id: string;
  customer_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Pick<Customer, 'id' | 'name' | 'avatar_url' | 'phone'> | null;
  barber?: Pick<Barber, 'id' | 'name' | 'avatar_url'> | null;
  service?: Pick<Service, 'id' | 'name' | 'duration_min'> | null;
}

export type PaymentMethod = 'cash' | 'pix' | 'credit' | 'debit';

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  cashier_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  installments: number;
  status: 'completed' | 'refunded' | 'pending';
  notes: string | null;
  created_at: string;
  sale_items?: SaleItem[];
  customer?: Pick<Customer, 'id' | 'name'> | null;
}

export type SaleItemType = 'service' | 'product' | 'package';

export interface SaleItem {
  id: string;
  sale_id: string;
  user_id: string;
  item_type: SaleItemType;
  ref_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  barber_id: string | null;
  created_at: string;
  barber?: Pick<Barber, 'id' | 'name'> | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'revenue' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface CashSession {
  id: string;
  user_id: string;
  operator_id: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export type TeamMemberStatus = 'invited' | 'active' | 'revoked';

export interface TeamMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  email: string;
  role: Exclude<UserRole, 'owner'>;
  barber_id: string | null;
  status: TeamMemberStatus;
  invited_at: string;
  joined_at: string | null;
  updated_at: string;
}
