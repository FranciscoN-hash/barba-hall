import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';
import type { Barber, Customer, Service, Product, Appointment, Sale, Transaction, CashSession, AuditLog, TeamMember, UserRole, AppointmentStatus, PaymentMethod } from '@/types';

const uid = getTenantId;

function stale(ms: number) {
  return { staleTime: ms, refetchOnWindowFocus: false } as const;
}

// ---------------- Barbers ----------------
export function useBarbers() {
  return useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase.from('barbers').select('*').eq('user_id', id).order('name');
      if (error) throw error;
      return data as Barber[];
    },
    ...stale(60000),
  });
}

// ---------------- Services ----------------
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase.from('services').select('*').eq('user_id', id).order('name');
      if (error) throw error;
      return data as Service[];
    },
    ...stale(60000),
  });
}

// ---------------- Products ----------------
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase.from('products').select('*').eq('user_id', id).order('name');
      if (error) throw error;
      return data as Product[];
    },
    ...stale(60000),
  });
}

// ---------------- Customers ----------------
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase.from('customers').select('*').eq('user_id', id).order('name');
      if (error) throw error;
      return data as Customer[];
    },
    ...stale(60000),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Customer | null;
    },
    ...stale(30000),
  });
}

// ---------------- Appointments ----------------
export function useAppointmentsByRange(start: string, end: string) {
  return useQuery({
    queryKey: ['appointments', start, end],
    queryFn: async () => {
      const userId = await uid();
      const { data, error } = await supabase
        .from('appointments')
        .select('*, customer:customers(id,name,avatar_url,phone), barber:barbers(id,name,avatar_url), service:services(id,name,duration_min)')
        .eq('user_id', userId)
        .gte('start_at', start)
        .lte('start_at', end)
        .order('start_at');
      if (error) throw error;
      return data as Appointment[];
    },
    ...stale(30000),
  });
}

export function useUpsertAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Appointment> & { start_at: string; end_at: string }) => {
      const userId = await uid();
      const { id, ...rest } = payload as Record<string, unknown>;
      const body = { ...rest, user_id: userId };
      if (id) {
        const { data, error } = await supabase.from('appointments').update(body).eq('id', id).select().maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('appointments').insert(body).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---------------- Sales (POS) ----------------
export function useSalesByRange(start: string, end: string) {
  return useQuery({
    queryKey: ['sales', start, end],
    queryFn: async () => {
      const userId = await uid();
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, barber:barbers(id,name)), customer:customers(id,name)')
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    ...stale(30000),
  });
}

export interface CartItem {
  item_type: 'service' | 'product' | 'package';
  ref_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  barber_id?: string | null;
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      customer_id: string | null;
      items: CartItem[];
      discount: number;
      payment_method: PaymentMethod;
      installments: number;
    }) => {
      // Toda a venda (sale + sale_items + transação + baixa de estoque)
      // acontece em uma única transação no banco (função create_sale,
      // migration 0005) — antes eram 5+ chamadas separadas, sem garantia
      // de atomicidade e com risco de corrida na baixa de estoque quando
      // dois caixas vendem o mesmo produto ao mesmo tempo.
      const { data: saleId, error } = await supabase.rpc('create_sale', {
        p_customer_id: payload.customer_id,
        p_items: payload.items,
        p_discount: payload.discount,
        p_payment_method: payload.payment_method,
        p_installments: payload.installments,
      });
      if (error) throw error;

      const subtotal = payload.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const total = Math.max(0, subtotal - payload.discount);
      return { saleId: saleId as string, total };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ---------------- Transactions (finance) ----------------
export function useTransactionsByRange(start: string, end: string) {
  return useQuery({
    queryKey: ['transactions', start, end],
    queryFn: async () => {
      const userId = await uid();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    ...stale(30000),
  });
}

export function useUpsertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Transaction> & { type: 'revenue' | 'expense'; category: string; description: string; amount: number }) => {
      const userId = await uid();
      const { id, ...rest } = payload as Record<string, unknown>;
      const body = { ...rest, user_id: userId };
      if (id) {
        const { data, error } = await supabase.from('transactions').update(body).eq('id', id).select().maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('transactions').insert(body).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---------------- Cash sessions ----------------
export function useOpenCashSession() {
  return useQuery({
    queryKey: ['cash-open'],
    queryFn: async () => {
      const userId = await uid();
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data as CashSession | null;
    },
    ...stale(15000),
  });
}

export function useOpenCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opening: number) => {
      const userId = await uid();
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({ user_id: userId, opening_amount: opening, status: 'open' })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-open'] }),
  });
}

export function useCloseCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, closing, expected }: { id: string; closing: number; expected: number }) => {
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closing_amount: closing,
          expected_amount: expected,
          difference: closing - expected,
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-open'] }),
  });
}

// ---------------- Profile ----------------
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    ...stale(60000),
  });
}

// ---------------- Audit Logs ----------------
export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AuditLog[];
    },
    ...stale(30000),
  });
}

// ---------------- Equipe (multiusuário) ----------------
// Diferente das demais entidades, a equipe é sempre lida/gravada pelo
// owner_id do PRÓPRIO usuário logado (não pelo tenant resolvido) — só o
// dono da conta convida gente, então aqui usamos o id bruto de propósito.
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', user.id)
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return data as TeamMember[];
    },
    ...stale(30000),
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: Exclude<UserRole, 'owner'> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sem usuário');
      const { error } = await supabase
        .from('team_members')
        .insert({ owner_id: user.id, email: input.email.trim().toLowerCase(), role: input.role });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });
}

export function useRevokeTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').update({ status: 'revoked' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });
}
