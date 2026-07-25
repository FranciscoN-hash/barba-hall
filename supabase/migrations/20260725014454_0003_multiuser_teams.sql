-- =========================================================
-- MULTIUSUÁRIO — equipe compartilhando os dados de uma barbearia
-- =========================================================
-- Problema resolvido: hoje todo cadastro novo nasce com role='owner' e
-- todas as tabelas isolam dados por auth.uid() = user_id. Ou seja, cada
-- login é uma "barbearia" isolada — não existe like convidar um barbeiro
-- ou um caixa para trabalhar dentro da MESMA conta do proprietário.
--
-- A partir desta migration:
--   1. O proprietário convida um e-mail com um papel (manager/barber/
--      cashier) via public.team_members.
--   2. Quando essa pessoa se cadastra normalmente no sistema, uma trigger
--      casa o e-mail com o convite pendente, define o role correto no
--      profile e vincula o membro ao dono da conta.
--   3. Toda leitura/escrita nas tabelas de negócio passa a ser resolvida
--      pelo "tenant" (dono da conta) em vez do auth.uid() cru — tanto no
--      RLS quanto na própria escrita (trigger BEFORE INSERT reescreve
--      user_id automaticamente, então nenhuma tela do frontend precisa
--      ser tocada para escrever no lugar certo).

-- ---------------------------------------------------------
-- 1. TABELA DE EQUIPE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'barber', 'cashier')),
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON public.team_members(member_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);

DROP TRIGGER IF EXISTS trg_team_members_updated ON public.team_members;
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- 2. FUNÇÕES DE RESOLUÇÃO DE TENANT
-- ---------------------------------------------------------

-- Todas as contas (dono ou membro ativo) que o usuário atual pode acessar.
CREATE OR REPLACE FUNCTION public.my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid()
  WHERE auth.uid() IS NOT NULL
  UNION
  SELECT owner_id FROM public.team_members
  WHERE member_id = auth.uid() AND status = 'active';
$$;

-- A conta (tenant) em que o usuário atual deve gravar dados: a própria,
-- ou a do proprietário que o convidou, se ele for um membro ativo.
CREATE OR REPLACE FUNCTION public.resolve_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members WHERE member_id = auth.uid() AND status = 'active' LIMIT 1),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant IN (SELECT public.my_tenant_ids());
$$;

-- Papel do usuário atual dentro de um tenant específico.
CREATE OR REPLACE FUNCTION public.my_role_for(tenant uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN tenant = auth.uid() THEN 'owner'
    ELSE (
      SELECT role FROM public.team_members
      WHERE owner_id = tenant AND member_id = auth.uid() AND status = 'active'
      LIMIT 1
    )
  END;
$$;

-- Dono ou gerente podem administrar (editar preços, estoque, excluir).
-- Barbeiro/caixa operam o dia a dia (agenda, vendas) mas não configuram.
CREATE OR REPLACE FUNCTION public.can_manage(tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.my_role_for(tenant) IN ('owner', 'manager');
$$;

-- Trigger BEFORE INSERT: reescreve user_id para o tenant correto, sempre.
-- Isso garante que nenhuma tela do frontend precise ser alterada para
-- gravar no lugar certo — mesmo que uma página antiga mande user_id
-- errado, o banco corrige antes de persistir.
CREATE OR REPLACE FUNCTION public.set_tenant_user_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.user_id := public.resolve_tenant_id();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- 3. TRIGGERS BEFORE INSERT nas tabelas de negócio
-- ---------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'barbers', 'customers', 'services', 'products', 'product_movements',
    'appointments', 'sales', 'sale_items', 'transactions', 'cash_sessions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_tenant_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_tenant_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_user_id();',
      t, t
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------
-- 4. RLS: substitui "auth.uid() = user_id" por acesso baseado em tenant
-- ---------------------------------------------------------

-- Leitura: qualquer membro ativo do tenant.
-- Escrita/exclusão: dono e gerente sempre podem; barbeiro/caixa só nas
-- tabelas do dia a dia (agenda, vendas, caixa, movimentação de estoque).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'barbers', 'customers', 'services', 'products', 'product_movements',
    'appointments', 'sales', 'sale_items', 'transactions', 'cash_sessions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_select_%I" ON public.%I FOR SELECT TO authenticated USING (public.has_tenant_access(user_id));',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_tenant_access(user_id));',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%I" ON public.%I;', t, t);
  END LOOP;
END;
$$;

-- UPDATE: permitido a qualquer membro ativo (agenda/vendas mudam de status
-- o tempo todo); DELETE restrito a dono/gerente (evita que um caixa exclua
-- uma venda ou um barbeiro exclua outro barbeiro).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'barbers', 'customers', 'services', 'products', 'product_movements',
    'appointments', 'sales', 'sale_items', 'transactions', 'cash_sessions'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "update_own_%I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_update_%I" ON public.%I FOR UPDATE TO authenticated USING (public.has_tenant_access(user_id)) WITH CHECK (public.has_tenant_access(user_id));',
      t, t
    );

    EXECUTE format(
      'CREATE POLICY "tenant_delete_%I" ON public.%I FOR DELETE TO authenticated USING (public.can_manage(user_id));',
      t, t
    );
  END LOOP;
END;
$$;

-- Cadastro e precificação (barbeiros, serviços, produtos) e o financeiro
-- ficam restritos a dono/gerente mesmo na criação/edição — barbeiro e
-- caixa não devem alterar preço, comissão ou dados de outro profissional.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['barbers', 'services', 'products', 'transactions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage(user_id));',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_update_%I" ON public.%I FOR UPDATE TO authenticated USING (public.can_manage(user_id)) WITH CHECK (public.can_manage(user_id));',
      t, t
    );
  END LOOP;
END;
$$;

-- audit_logs: leitura estendida para qualquer membro ativo do tenant
-- (a escrita continua só pela trigger, via SECURITY DEFINER).
DROP POLICY IF EXISTS "select_own_audit_logs" ON public.audit_logs;
CREATE POLICY "tenant_select_audit_logs" ON public.audit_logs FOR SELECT
  TO authenticated USING (public.has_tenant_access(user_id));

-- ---------------------------------------------------------
-- 5. RLS de team_members
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "tenant_select_team_members" ON public.team_members;
CREATE POLICY "tenant_select_team_members" ON public.team_members FOR SELECT
  TO authenticated USING (public.has_tenant_access(owner_id) OR member_id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_team_members" ON public.team_members;
CREATE POLICY "owner_insert_team_members" ON public.team_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_update_team_members" ON public.team_members;
CREATE POLICY "owner_update_team_members" ON public.team_members FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_delete_team_members" ON public.team_members;
CREATE POLICY "owner_delete_team_members" ON public.team_members FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ---------------------------------------------------------
-- 6. handle_new_user: casa convite pendente por e-mail, define o role
--    correto e vincula o membro à conta do proprietário.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.team_members;
BEGIN
  SELECT * INTO v_invite FROM public.team_members
    WHERE email = NEW.email AND status = 'invited'
    ORDER BY invited_at DESC
    LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      v_invite.role
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.team_members
      SET member_id = NEW.id, status = 'active', joined_at = now()
      WHERE id = v_invite.id;
  ELSE
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'owner'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- 7. Auditoria também para a tabela de equipe
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_team_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_entity_id uuid;
  v_detail jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant := OLD.owner_id;
    v_entity_id := OLD.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant := NEW.owner_id;
    v_entity_id := NEW.id;
    v_detail := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_tenant := NEW.owner_id;
    v_entity_id := NEW.id;
    v_detail := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (user_id, actor_id, action, entity, entity_id, detail)
  VALUES (v_tenant, auth.uid(), lower(TG_OP), 'team_members', v_entity_id, v_detail);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_team_members ON public.team_members;
CREATE TRIGGER trg_audit_team_members
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_team_member();
