-- =========================================================
-- TRAVA DE TENANT NO UPDATE
-- =========================================================
-- A migration 0003 criou uma trigger BEFORE INSERT que corrige o
-- user_id automaticamente. Mas várias páginas do frontend (Barbeiros,
-- Serviços, Produtos) reenviam `user_id: user.id` também no UPDATE de um
-- registro já existente. Se quem está editando for um funcionário
-- (barbeiro/gerente/caixa), esse valor é o próprio id da pessoa, não o
-- da conta — e o UPDATE passaria pela policy (has_tenant_access aceita o
-- próprio id trivialmente), silenciosamente tirando o registro da conta
-- compartilhada.
--
-- Corrigido de uma vez para todas as tabelas: no UPDATE, o user_id
-- sempre permanece o que já estava salvo (OLD.user_id), nunca o que o
-- cliente mandar.

CREATE OR REPLACE FUNCTION public.lock_tenant_user_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'barbers', 'customers', 'services', 'products', 'product_movements',
    'appointments', 'sales', 'sale_items', 'transactions', 'cash_sessions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_lock_tenant_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_lock_tenant_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_tenant_user_id();',
      t, t
    );
  END LOOP;
END;
$$;
