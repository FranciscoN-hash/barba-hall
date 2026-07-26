-- =========================================================
-- IDENTIDADE DA EMPRESA (nome + logo configuráveis)
-- =========================================================
-- Até agora "Dados da empresa" em Configurações era decorativo — o botão
-- Salvar só mostrava um toast, nada persistia. Isso importa especialmente
-- porque o Barba Hall é um produto revendido para várias barbearias
-- diferentes, cada uma com sua própria marca — precisa dar pra
-- personalizar sem editar código a cada cliente novo.

CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Minha Barbearia',
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_tenant_company_settings ON public.company_settings;
CREATE TRIGGER trg_tenant_company_settings BEFORE INSERT ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_user_id();

DROP TRIGGER IF EXISTS trg_lock_tenant_company_settings ON public.company_settings;
CREATE TRIGGER trg_lock_tenant_company_settings BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.lock_tenant_user_id();

DROP TRIGGER IF EXISTS trg_company_settings_updated ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_company_settings ON public.company_settings;
CREATE TRIGGER trg_audit_company_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_row();

-- Leitura: qualquer membro ativo do tenant vê os dados da empresa.
DROP POLICY IF EXISTS "tenant_select_company_settings" ON public.company_settings;
CREATE POLICY "tenant_select_company_settings" ON public.company_settings FOR SELECT
  TO authenticated USING (public.has_tenant_access(user_id));

-- Leitura pública (sem login): a tela de login precisa mostrar nome/logo
-- ANTES de a pessoa entrar. Como cada cliente roda seu próprio projeto
-- Supabase isolado (uma barbearia por deployment), expor nome/logo sem
-- autenticação não vaza nada sensível de outro cliente — é literalmente
-- a marca que aparece pública no próprio site da barbearia de qualquer
-- forma. Se um dia isso virar um SaaS com várias barbearias no MESMO
-- projeto Supabase, essa política precisa ser revista.
DROP POLICY IF EXISTS "public_select_company_settings" ON public.company_settings;
CREATE POLICY "public_select_company_settings" ON public.company_settings FOR SELECT
  TO anon USING (true);

-- Escrita: só dono/gerente administram a identidade da empresa.
DROP POLICY IF EXISTS "manage_insert_company_settings" ON public.company_settings;
CREATE POLICY "manage_insert_company_settings" ON public.company_settings FOR INSERT
  TO authenticated WITH CHECK (public.can_manage(user_id));

DROP POLICY IF EXISTS "manage_update_company_settings" ON public.company_settings;
CREATE POLICY "manage_update_company_settings" ON public.company_settings FOR UPDATE
  TO authenticated USING (public.can_manage(user_id)) WITH CHECK (public.can_manage(user_id));

-- ---------------------------------------------------------
-- Storage: bucket para logos, com leitura pública (mesma lógica acima)
-- ---------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_company_logos" ON storage.objects;
CREATE POLICY "public_read_company_logos" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

-- Upload/atualização: só autenticado, e só dentro da própria "pasta"
-- (o primeiro segmento do caminho do arquivo precisa ser o próprio uid).
DROP POLICY IF EXISTS "owner_upload_company_logos" ON storage.objects;
CREATE POLICY "owner_upload_company_logos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = public.resolve_tenant_id()::text);

DROP POLICY IF EXISTS "owner_update_company_logos" ON storage.objects;
CREATE POLICY "owner_update_company_logos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = public.resolve_tenant_id()::text);

DROP POLICY IF EXISTS "owner_delete_company_logos" ON storage.objects;
CREATE POLICY "owner_delete_company_logos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = public.resolve_tenant_id()::text);
