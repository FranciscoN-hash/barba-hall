/*
# Barba Hall ERP — Core Schema

## Purpose
Establishes the complete data model for the Barba Hall ERP barbershop
management system: authentication profiles, barbers, customers, services,
products, appointments, sales (POS), financial transactions, cash register
sessions, and loyalty program records.

## Tables created
1. `profiles` — extends Supabase auth.users with full name, role, avatar.
2. `barbers` — staff members who perform services (commission, targets, schedule).
3. `customers` — CRM records with contact, preferences, loyalty, financial stats.
4. `services` — catalog of services offered (price, duration, commission, category).
5. `products` — inventory items with stock, cost, price, supplier, alerts.
6. `product_movements` — stock in/out ledger per product.
7. `appointments` — bookings linking customer + barber + service, with status + times.
8. `sales` — POS transactions (total, payment method, discounts, items snapshot).
9. `sale_items` — line items per sale (service or product, price, quantity, barber).
10. `transactions` — financial ledger entries (revenue/expense, category, due date).
11. `cash_sessions` — cash register open/close, sangrias, suprimentos, totals.
12. `audit_logs` — change history per user.

## Security
- RLS enabled on every table.
- Policies are owner-scoped via auth.uid() = ownership column.
- profiles: authenticated users manage their own row.
- All business tables scope to the authenticated user via ownership columns
  defaulting to auth.uid(), so frontend inserts work without passing user_id.

## Important notes
- Email confirmation stays OFF (Supabase default for this flow).
- All tables use gen_random_uuid() for primary keys.
- Timestamps default to now() in timestamptz.
- Foreign keys use ON DELETE CASCADE for owned child rows.
- Auto-creates a profile row on signup via trigger.
*/

-- =========================================================
-- PROFILES (extends auth.users)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','barber','cashier')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- BARBERS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  avatar_url text,
  phone text,
  email text,
  specialties text[] NOT NULL DEFAULT '{}',
  commission_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  monthly_target numeric(10,2) NOT NULL DEFAULT 0,
  work_days int[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  work_start text NOT NULL DEFAULT '09:00',
  work_end text NOT NULL DEFAULT '18:00',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','vacation')),
  rating numeric(3,2) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_barbers" ON public.barbers;
CREATE POLICY "select_own_barbers" ON public.barbers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_barbers" ON public.barbers;
CREATE POLICY "insert_own_barbers" ON public.barbers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_barbers" ON public.barbers;
CREATE POLICY "update_own_barbers" ON public.barbers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_barbers" ON public.barbers;
CREATE POLICY "delete_own_barbers" ON public.barbers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_barbers_user ON public.barbers(user_id);

-- =========================================================
-- CUSTOMERS (CRM)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  avatar_url text,
  phone text,
  whatsapp text,
  email text,
  birth_date date,
  address text,
  preferences text,
  notes text,
  loyalty_points integer NOT NULL DEFAULT 0,
  cashback_balance numeric(10,2) NOT NULL DEFAULT 0,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric(10,2) NOT NULL DEFAULT 0,
  avg_ticket numeric(10,2) NOT NULL DEFAULT 0,
  last_visit_at timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','vip')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
CREATE POLICY "select_own_customers" ON public.customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
CREATE POLICY "insert_own_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
CREATE POLICY "update_own_customers" ON public.customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;
CREATE POLICY "delete_own_customers" ON public.customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_birth ON public.customers(birth_date);

-- =========================================================
-- SERVICES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Geral',
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 30,
  commission_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  photo_url text,
  is_package boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_services" ON public.services;
CREATE POLICY "select_own_services" ON public.services FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_services" ON public.services;
CREATE POLICY "insert_own_services" ON public.services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_services" ON public.services;
CREATE POLICY "update_own_services" ON public.services FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_services" ON public.services;
CREATE POLICY "delete_own_services" ON public.services FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_services_user ON public.services(user_id);

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  barcode text,
  category text NOT NULL DEFAULT 'Geral',
  supplier text,
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  unit text NOT NULL DEFAULT 'un',
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_products" ON public.products;
CREATE POLICY "select_own_products" ON public.products FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_products" ON public.products;
CREATE POLICY "insert_own_products" ON public.products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_products" ON public.products;
CREATE POLICY "update_own_products" ON public.products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_products" ON public.products;
CREATE POLICY "delete_own_products" ON public.products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);

-- =========================================================
-- PRODUCT MOVEMENTS (stock ledger)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.product_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in','out','adjust')),
  quantity integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_product_movements" ON public.product_movements;
CREATE POLICY "select_own_product_movements" ON public.product_movements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_product_movements" ON public.product_movements;
CREATE POLICY "insert_own_product_movements" ON public.product_movements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_product_movements" ON public.product_movements;
CREATE POLICY "delete_own_product_movements" ON public.product_movements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pm_user ON public.product_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_product ON public.product_movements(product_id);

-- =========================================================
-- APPOINTMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_appointments" ON public.appointments;
CREATE POLICY "select_own_appointments" ON public.appointments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_appointments" ON public.appointments;
CREATE POLICY "insert_own_appointments" ON public.appointments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_appointments" ON public.appointments;
CREATE POLICY "update_own_appointments" ON public.appointments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_appointments" ON public.appointments;
CREATE POLICY "delete_own_appointments" ON public.appointments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appt_user ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appt_start ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appt_barber ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appt_status ON public.appointments(status);

-- =========================================================
-- SALES (POS)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','pix','credit','debit')),
  installments integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded','pending')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sales" ON public.sales;
CREATE POLICY "select_own_sales" ON public.sales FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sales" ON public.sales;
CREATE POLICY "insert_own_sales" ON public.sales FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales" ON public.sales;
CREATE POLICY "update_own_sales" ON public.sales FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales" ON public.sales;
CREATE POLICY "delete_own_sales" ON public.sales FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);

-- =========================================================
-- SALE ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item_type text NOT NULL CHECK (item_type IN ('service','product','package')),
  ref_id uuid,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sale_items" ON public.sale_items;
CREATE POLICY "select_own_sale_items" ON public.sale_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sale_items" ON public.sale_items;
CREATE POLICY "insert_own_sale_items" ON public.sale_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sale_items" ON public.sale_items;
CREATE POLICY "delete_own_sale_items" ON public.sale_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_si_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_si_user ON public.sale_items(user_id);

-- =========================================================
-- TRANSACTIONS (financial ledger)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('revenue','expense')),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  due_date date,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  reference_id uuid,
  reference_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON public.transactions;
CREATE POLICY "select_own_transactions" ON public.transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON public.transactions;
CREATE POLICY "insert_own_transactions" ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON public.transactions;
CREATE POLICY "update_own_transactions" ON public.transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON public.transactions;
CREATE POLICY "delete_own_transactions" ON public.transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_txn_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_txn_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_txn_due ON public.transactions(due_date);

-- =========================================================
-- CASH SESSIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  operator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  opening_amount numeric(10,2) NOT NULL DEFAULT 0,
  closing_amount numeric(10,2),
  expected_amount numeric(10,2),
  difference numeric(10,2),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_cash_sessions" ON public.cash_sessions;
CREATE POLICY "insert_own_cash_sessions" ON public.cash_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_cash_sessions" ON public.cash_sessions;
CREATE POLICY "select_own_cash_sessions" ON public.cash_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cash_sessions" ON public.cash_sessions;
CREATE POLICY "update_own_cash_sessions" ON public.cash_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cash_sessions" ON public.cash_sessions;
CREATE POLICY "delete_own_cash_sessions" ON public.cash_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cash_user ON public.cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_status ON public.cash_sessions(status);

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_logs" ON public.audit_logs;
CREATE POLICY "select_own_audit_logs" ON public.audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audit_logs" ON public.audit_logs;
CREATE POLICY "insert_own_audit_logs" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);

-- =========================================================
-- AUTH TRIGGER — auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- UPDATED_AT helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_barbers_updated ON public.barbers;
CREATE TRIGGER trg_barbers_updated BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated ON public.appointments;
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
