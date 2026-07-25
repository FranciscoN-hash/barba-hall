-- =========================================================
-- VENDA ATÔMICA (PDV) — corrige dois bugs reais no fluxo de venda
-- =========================================================
-- O fluxo antigo (em useCreateSale, no frontend) fazia a venda em 5+
-- chamadas REST separadas: insert em sales, insert em sale_items, insert
-- em transactions, e depois, por item de produto, um SELECT do estoque
-- seguido de um UPDATE. Dois problemas reais nisso:
--
-- 1. NÃO É ATÔMICO. Se qualquer chamada falhar no meio (rede, RLS,
--    produto excluído), sobra uma venda pela metade: por exemplo, a
--    venda existe mas sem os itens, ou o estoque já baixou mas não há
--    registro financeiro da receita.
--
-- 2. CONDIÇÃO DE CORRIDA NO ESTOQUE. "SELECT stock, depois UPDATE
--    stock = valor lido - quantidade" não é seguro com duas vendas
--    simultâneas do mesmo produto (dois caixas vendendo ao mesmo tempo,
--    agora que existe múltiplos usuários) — as duas leem o mesmo valor
--    antes de qualquer uma escrever, e uma baixa se perde.
--
-- A correção: uma função no banco que faz tudo em UMA transação (se
-- qualquer parte falhar, tudo desfaz automaticamente) e baixa o estoque
-- com "UPDATE ... SET stock = stock - quantidade" — o Postgres bloqueia
-- a linha durante a transação, então a segunda venda espera a primeira
-- terminar em vez de ler um valor desatualizado.

-- SECURITY DEFINER de propósito: fechar uma venda precisa gravar uma
-- transação de receita e baixar estoque, mas a migration 0003 restringe
-- INSERT/UPDATE direto em transactions/products a dono/gerente (um
-- caixa não deve editar preço ou lançar despesa manualmente). Em vez de
-- abrir essas tabelas para todo mundo, a função roda com privilégio
-- elevado só para essas duas escritas específicas e controladas — o
-- caixa continua sem acesso direto a Financeiro ou ao catálogo.
CREATE OR REPLACE FUNCTION public.create_sale(
  p_customer_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_payment_method text,
  p_installments integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid := gen_random_uuid();
  v_subtotal numeric(10,2);
  v_total numeric(10,2);
  v_item jsonb;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Venda sem itens';
  END IF;

  SELECT COALESCE(SUM((i->>'unit_price')::numeric * (i->>'quantity')::numeric), 0)
    INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS i;

  v_total := GREATEST(0, v_subtotal - p_discount);

  INSERT INTO public.sales (
    id, customer_id, cashier_id, subtotal, discount, total,
    payment_method, installments, status, created_at
  ) VALUES (
    v_sale_id, p_customer_id, auth.uid(), v_subtotal, p_discount, v_total,
    p_payment_method, p_installments, 'completed', now()
  );
  -- user_id é preenchido pela trigger set_tenant_user_id (migration 0003).

  INSERT INTO public.sale_items (sale_id, item_type, ref_id, name, unit_price, quantity, barber_id, created_at)
  SELECT
    v_sale_id,
    i->>'item_type',
    (i->>'ref_id')::uuid,
    i->>'name',
    (i->>'unit_price')::numeric,
    (i->>'quantity')::integer,
    CASE WHEN i->>'barber_id' IS NULL OR i->>'barber_id' = '' THEN NULL ELSE (i->>'barber_id')::uuid END,
    now()
  FROM jsonb_array_elements(p_items) AS i;

  INSERT INTO public.transactions (
    type, category, description, amount, payment_method,
    paid, paid_at, reference_id, reference_type, created_at
  ) VALUES (
    'revenue', 'Vendas', 'Venda PDV #' || left(v_sale_id::text, 8), v_total, p_payment_method,
    true, now(), v_sale_id, 'sale', now()
  );

  -- Baixa de estoque atômica: uma linha por vez, sem janela de corrida.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item->>'item_type' = 'product' AND v_item->>'ref_id' IS NOT NULL THEN
      UPDATE public.products
        SET stock = GREATEST(0, stock - (v_item->>'quantity')::integer)
        WHERE id = (v_item->>'ref_id')::uuid;

      INSERT INTO public.product_movements (product_id, type, quantity, reason)
      VALUES ((v_item->>'ref_id')::uuid, 'out', (v_item->>'quantity')::integer, 'Venda PDV');
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale(uuid, jsonb, numeric, text, integer) TO authenticated;
