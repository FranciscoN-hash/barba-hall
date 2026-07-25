-- =========================================================
-- AUDIT LOGGING — populate public.audit_logs automatically
-- =========================================================
-- A tabela audit_logs já existia (com RLS e policies), mas nada gravava
-- nela. Esta migration cria uma trigger genérica que registra INSERT,
-- UPDATE e DELETE em todas as tabelas de negócio, sem depender do
-- frontend lembrar de chamar nada — se alguém alterar dados direto pelo
-- SQL editor do Supabase, também fica registrado.
--
-- user_id  = dono dos dados (tenant), tirado da própria linha alterada.
-- actor_id = quem de fato executou a ação (auth.uid() no momento da
--            operação) — hoje é sempre igual ao user_id porque o sistema
--            ainda é single-tenant-por-login, mas já fica pronto para
--            quando existir barbeiro/caixa operando dentro da conta do
--            owner (ver módulo de multiusuário).
-- detail   = snapshot em jsonb do "antes" e/ou "depois" da linha.

CREATE OR REPLACE FUNCTION public.audit_log_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_entity_id uuid;
  v_detail jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_entity_id := OLD.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
    v_entity_id := NEW.id;
    v_detail := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_user_id := NEW.user_id;
    v_entity_id := NEW.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (user_id, actor_id, action, entity, entity_id, detail)
  VALUES (v_user_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id, v_detail);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Variante para profiles: não existe coluna user_id própria — o id da
-- linha já É o id do usuário (auth.users.id), então usamos NEW.id/OLD.id
-- direto como tenant.
CREATE OR REPLACE FUNCTION public.audit_log_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_detail jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id := NEW.id;
    v_detail := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_user_id := NEW.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (user_id, actor_id, action, entity, entity_id, detail)
  VALUES (v_user_id, auth.uid(), lower(TG_OP), 'profiles', v_user_id, v_detail);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ---- Anexa a trigger genérica em cada tabela de negócio ----
DROP TRIGGER IF EXISTS trg_audit_barbers ON public.barbers;
CREATE TRIGGER trg_audit_barbers
  AFTER INSERT OR UPDATE OR DELETE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_services ON public.services;
CREATE TRIGGER trg_audit_services
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
CREATE TRIGGER trg_audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_product_movements ON public.product_movements;
CREATE TRIGGER trg_audit_product_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.product_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_appointments ON public.appointments;
CREATE TRIGGER trg_audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_sales ON public.sales;
CREATE TRIGGER trg_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_sale_items ON public.sale_items;
CREATE TRIGGER trg_audit_sale_items
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_cash_sessions ON public.cash_sessions;
CREATE TRIGGER trg_audit_cash_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_profile();
