import { supabase } from './supabase';

/**
 * Toda leitura/escrita nas tabelas de negócio deve ser filtrada pelo
 * "tenant" (a conta da barbearia), não pelo auth.uid() cru.
 *
 * - Se o usuário é o próprio dono (profile.role === 'owner'), o tenant é
 *   o próprio id.
 * - Se é um membro de equipe (barbeiro/gerente/caixa) convidado e ativo,
 *   o tenant é o owner_id do convite em team_members.
 *
 * A escrita já é garantida no banco (trigger BEFORE INSERT em
 * set_tenant_user_id, ver migration 0003) — este helper existe para que
 * as leituras explícitas (`.eq('user_id', tenantId)`) filtrem pelo lugar
 * certo também no cliente.
 *
 * Cache simples em memória por sessão: evita repetir a consulta de
 * team_members em toda chamada de hook. Invalidado em signOut ou troca
 * de usuário (ver clearTenantCache, chamado pelo AuthContext).
 */

let cachedTenantId: string | undefined;
let cachedForUserId: string | undefined;
let inFlight: Promise<string | undefined> | null = null;

export async function getTenantId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    clearTenantCache();
    return undefined;
  }

  if (cachedForUserId === user.id && cachedTenantId) {
    return cachedTenantId;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let tenant = user.id;

    if (profile && profile.role !== 'owner') {
      const { data: membership } = await supabase
        .from('team_members')
        .select('owner_id')
        .eq('member_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (membership) tenant = membership.owner_id;
    }

    cachedTenantId = tenant;
    cachedForUserId = user.id;
    inFlight = null;
    return tenant;
  })();

  return inFlight;
}

export function clearTenantCache() {
  cachedTenantId = undefined;
  cachedForUserId = undefined;
  inFlight = null;
}
