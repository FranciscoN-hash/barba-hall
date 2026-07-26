-- =========================================================
-- ACEITAR CONVITE NO LOGIN (não só no cadastro)
-- =========================================================
-- handle_new_user (migration 0003) só casa o convite pendente no momento
-- do CADASTRO (INSERT em auth.users). Isso cobre quem nunca teve conta.
-- Mas quem já tinha conta — por exemplo, foi revogado e convidado de
-- novo — nunca passa por esse trigger outra vez, porque não está se
-- cadastrando, só logando. Sem isso, o convite fica "Convidado" para
-- sempre e a pessoa nunca ganha acesso de volta.
--
-- Esta função é chamada pelo frontend a cada login (ver AuthContext) e
-- resolve isso: verifica se o e-mail da pessoa logada tem um convite
-- pendente, e se tiver, vincula e atualiza o papel.

CREATE OR REPLACE FUNCTION public.accept_pending_invite()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_invite public.team_members;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_invite FROM public.team_members
    WHERE email = v_email AND status = 'invited'
    ORDER BY invited_at DESC
    LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.team_members
      SET member_id = auth.uid(), status = 'active', joined_at = now()
      WHERE id = v_invite.id;

    UPDATE public.profiles
      SET role = v_invite.role
      WHERE id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_pending_invite() TO authenticated;
