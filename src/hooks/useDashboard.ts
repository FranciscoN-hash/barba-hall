import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';
import { startOfMonth, subDays, toISO } from '@/lib/utils';

const uid = getTenantId;

export interface DashboardData {
  todayAppointments: Array<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    price: number;
    customer: { name: string; avatar_url: string | null } | null;
    barber: { name: string; avatar_url: string | null } | null;
    service: { name: string } | null;
  }>;
  todayRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  todayCount: number;
  completedToday: number;
  newCustomers: number;
  totalCustomers: number;
  lowStock: Array<{ id: string; name: string; stock: number; min_stock: number; category: string }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  barberRanking: Array<{ id: string; name: string; avatar_url: string | null; revenue: number; appointments: number; rating: number }>;
  revenueSeries: Array<{ date: string; revenue: number; expense: number }>;
  paymentBreakdown: Array<{ method: string; total: number; count: number }>;
  pendingBills: number;
  birthdaysThisMonth: Array<{ id: string; name: string; birth_date: string }>;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const userId = await uid();
      if (!userId) throw new Error('No user');

      const now = new Date();
      const dayStart = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
      const dayEnd = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
      const monthStart = toISO(startOfMonth(now));
      const lastMonthStart = toISO(startOfMonth(subDays(startOfMonth(now), 1)));
      const lastMonthEnd = toISO(subDays(startOfMonth(now), 1));
      const sevenDaysAgo = toISO(subDays(now, 6));

      const todayAppts = supabase
        .from('appointments')
        .select('id,start_at,end_at,status,price, customer:customers(name,avatar_url), barber:barbers(name,avatar_url), service:services(name)')
        .eq('user_id', userId)
        .gte('start_at', dayStart)
        .lte('start_at', dayEnd)
        .order('start_at');

      const monthTxn = supabase
        .from('transactions')
        .select('amount,type,created_at')
        .eq('user_id', userId)
        .gte('created_at', monthStart);

      const lastMonthTxn = supabase
        .from('transactions')
        .select('amount,type')
        .eq('user_id', userId)
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd);

      const sales7 = supabase
        .from('sales')
        .select('total,payment_method,created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo);

      const productsQ = supabase.from('products').select('id,name,stock,min_stock,category').eq('user_id', userId);

      const customersQ = supabase.from('customers').select('id,name,birth_date,created_at,status').eq('user_id', userId);

      const saleItemsQ = supabase
        .from('sale_items')
        .select('name,sale_id,sale:sales(created_at)')
        .eq('user_id', userId)
        .gte('sale.created_at', monthStart);

      const apptBarberQ = supabase
        .from('appointments')
        .select('id,barber_id,price,status, barber:barbers(id,name,avatar_url,rating)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('start_at', monthStart);

      const pendingBillsQ = supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('paid', false);

      const txn7 = supabase
        .from('transactions')
        .select('amount,type,created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo);

      const [
        { data: appts },
        { data: mTxn },
        { data: lmTxn },
        { data: salesWeek },
        { data: products },
        { data: customers },
        { data: saleItems },
        { data: apptBarber },
        { data: pendingBills },
        { data: txnWeek },
      ] = await Promise.all([
        todayAppts, monthTxn, lastMonthTxn, sales7, productsQ, customersQ, saleItemsQ, apptBarberQ, pendingBillsQ, txn7,
      ]);

      const todayRevenue = (appts ?? [])
        .filter((a) => a.status === 'completed')
        .reduce((s, a) => s + Number(a.price), 0);

      const monthRevenue = (mTxn ?? []).filter((t) => t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
      const lastMonthRevenue = (lmTxn ?? []).filter((t) => t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);

      const completedToday = (appts ?? []).filter((a) => a.status === 'completed').length;

      const newCustomers = (customers ?? []).filter((c) => new Date(c.created_at) >= startOfMonth(now)).length;

      const lowStock = (products ?? [])
        .filter((p) => p.stock <= p.min_stock)
        .slice(0, 5);

      // Top services by sale items this month
      const svcCount: Record<string, { count: number; revenue: number }> = {};
      for (const si of saleItems ?? []) {
        const s = si as unknown as { name: string; sale: { created_at: string } | null };
        if (!svcCount[s.name]) svcCount[s.name] = { count: 0, revenue: 0 };
        svcCount[s.name].count += 1;
        const sale = Array.isArray(s.sale) ? s.sale[0] : s.sale;
        svcCount[s.name].revenue += sale ? Number(sale.created_at ? 1 : 1) : 0;
      }

      const topServices = Object.entries(svcCount)
        .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Barber ranking this month
      const barberMap: Record<string, { revenue: number; appointments: number; name: string; avatar_url: string | null; rating: number }> = {};
      for (const a of apptBarber ?? []) {
        const rec = a as unknown as { barber_id: string; price: number; barber: { id: string; name: string; avatar_url: string | null; rating: number } | { id: string; name: string; avatar_url: string | null; rating: number }[] | null };
        const barber = Array.isArray(rec.barber) ? rec.barber[0] : rec.barber;
        if (!barber) continue;
        if (!barberMap[barber.id]) barberMap[barber.id] = { revenue: 0, appointments: 0, name: barber.name, avatar_url: barber.avatar_url, rating: Number(barber.rating) };
        barberMap[barber.id].revenue += Number(rec.price);
        barberMap[barber.id].appointments += 1;
      }
      const barberRanking = Object.entries(barberMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue series last 7 days
      const seriesMap: Record<string, { revenue: number; expense: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i);
        const key = d.toISOString().slice(0, 10);
        seriesMap[key] = { revenue: 0, expense: 0 };
      }
      for (const t of txnWeek ?? []) {
        const key = new Date(t.created_at).toISOString().slice(0, 10);
        if (seriesMap[key]) {
          if (t.type === 'revenue') seriesMap[key].revenue += Number(t.amount);
          else seriesMap[key].expense += Number(t.amount);
        }
      }
      const revenueSeries = Object.entries(seriesMap).map(([date, v]) => ({ date, ...v }));

      // Payment breakdown last 7 days
      const payMap: Record<string, { total: number; count: number }> = {};
      for (const s of salesWeek ?? []) {
        const m = s.payment_method;
        if (!payMap[m]) payMap[m] = { total: 0, count: 0 };
        payMap[m].total += Number(s.total);
        payMap[m].count += 1;
      }
      const paymentBreakdown = Object.entries(payMap).map(([method, v]) => ({ method, ...v }));

      // Birthdays this month
      const monthNum = now.getMonth() + 1;
      const birthdaysThisMonth = (customers ?? [])
        .filter((c) => {
          if (!c.birth_date) return false;
          const m = new Date(c.birth_date).getMonth() + 1;
          return m === monthNum;
        })
        .slice(0, 5)
        .map((c) => ({ id: c.id, name: c.name, birth_date: c.birth_date as string }));

      return {
        todayAppointments: (appts ?? []).map((a) => {
          const r = a as unknown as {
            id: string; start_at: string; end_at: string; status: string; price: number;
            customer: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null;
            barber: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null;
            service: { name: string } | { name: string }[] | null;
          };
          return {
            id: r.id,
            start_at: r.start_at,
            end_at: r.end_at,
            status: r.status,
            price: Number(r.price),
            customer: Array.isArray(r.customer) ? r.customer[0] : r.customer,
            barber: Array.isArray(r.barber) ? r.barber[0] : r.barber,
            service: Array.isArray(r.service) ? r.service[0] : r.service,
          };
        }),
        todayRevenue,
        monthRevenue,
        lastMonthRevenue,
        todayCount: appts?.length ?? 0,
        completedToday,
        newCustomers,
        totalCustomers: customers?.length ?? 0,
        lowStock,
        topServices,
        barberRanking,
        revenueSeries,
        paymentBreakdown,
        pendingBills: pendingBills?.length ?? 0,
        birthdaysThisMonth,
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
