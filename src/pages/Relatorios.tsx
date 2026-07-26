import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, LineChart } from 'recharts';
import { Download, BarChart3, TrendingUp, Users, Scissors, Package, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useSalesByRange, useTransactionsByRange, useCustomers, useServices, useProducts, useBarbers } from '@/hooks/useQueries';
import { formatCurrency, startOfMonth, subMonths, endOfDay, toISO, cn } from '@/lib/utils';

const PIE_COLORS = ['#D4AF37', '#1C1C1C', '#525252', '#A3A3A3', '#737373'];

export function Relatorios() {
  const { push } = useToast();
  const [range, setRange] = useState<'month' | 'quarter' | 'year'>('month');

  const now = new Date();
  const start = range === 'month' ? toISO(startOfMonth(now)) : range === 'quarter' ? toISO(subMonths(startOfMonth(now), 2)) : toISO(subMonths(startOfMonth(now), 11));
  const end = toISO(endOfDay(now));

  const { data: sales = [], isLoading: salesLoading } = useSalesByRange(start, end);
  const { data: txns = [], isLoading: txnLoading } = useTransactionsByRange(start, end);
  const { data: customers = [] } = useCustomers();
  const { data: services = [] } = useServices();
  const { data: products = [] } = useProducts();
  const { data: barbers = [] } = useBarbers();

  const revenue = txns.filter((t) => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = revenue - expense;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const avgTicket = sales.length > 0 ? sales.reduce((s, x) => s + x.total, 0) / sales.length : 0;

  // Service distribution from sales items
  const svcDist = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => s.sale_items?.forEach((si) => { map[si.name] = (map[si.name] ?? 0) + si.quantity; }));
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [sales]);

  // Payment distribution
  const payDist = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => { map[s.payment_method] = (map[s.payment_method] ?? 0) + s.total; });
    return Object.entries(map).map(([method, total]) => ({ name: ({ cash: 'Dinheiro', pix: 'PIX', credit: 'Crédito', debit: 'Débito' } as Record<string, string>)[method] ?? method, value: total }));
  }, [sales]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { revenue: number; expense: number }> = {};
    txns.forEach((t) => {
      const key = new Date(t.created_at).toISOString().slice(0, 7);
      if (!map[key]) map[key] = { revenue: 0, expense: 0 };
      map[key][t.type] += t.amount;
    });
    return Object.entries(map).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
  }, [txns]);

  const exportCSV = () => {
    const rows = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Status']];
    txns.forEach((t) => rows.push([new Date(t.created_at).toLocaleDateString('pt-BR'), t.type, t.category, t.description, String(t.amount), t.paid ? 'Pago' : 'Pendente']));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    push({ tone: 'success', title: 'Relatório exportado', description: 'CSV baixado com sucesso.' });
  };

  const summaryCards = [
    { label: 'Faturamento', value: formatCurrency(revenue), icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Despesas', value: formatCurrency(expense), icon: Wallet, accent: 'text-red-600 dark:text-red-400' },
    { label: 'Lucro líquido', value: formatCurrency(profit), icon: BarChart3, accent: 'text-gold-600 dark:text-gold-400' },
    { label: 'Margem', value: `${margin.toFixed(1)}%`, icon: TrendingUp, accent: 'text-ink-900 dark:text-white' },
    { label: 'Ticket médio', value: formatCurrency(avgTicket), icon: Scissors, accent: 'text-ink-900 dark:text-white' },
    { label: 'Vendas', value: String(sales.length), icon: Package, accent: 'text-ink-900 dark:text-white' },
  ];

  const loading = salesLoading || txnLoading;

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Análise de desempenho do seu negócio."
        action={<div className="flex items-center gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className="w-32">
            <option value="month">Este mês</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Ano</option>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Exportar</Button>
        </div>} />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className={cn('h-5 w-5', s.accent)} />
            <p className="mt-2 text-lg font-bold text-ink-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-ink-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Tendência mensal</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : monthlyTrend.length === 0 ? <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="Sem dados" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={56} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" name="Receita" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expense" name="Despesa" stroke="#525252" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Formas de pagamento</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : payDist.length === 0 ? <EmptyState icon={<Wallet className="h-6 w-6" />} title="Sem vendas" /> : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={payDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                      {payDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 w-full space-y-1.5">
                  {payDist.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{p.name}</span>
                      <span className="font-medium">{formatCurrency(p.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Serviços mais vendidos</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : svcDist.length === 0 ? <EmptyState icon={<Scissors className="h-6 w-6" />} title="Sem dados" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={svcDist} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.15)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip cursor={{ fill: 'rgba(212,175,55,0.06)' }} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  <Bar dataKey="count" name="Vendas" fill="#D4AF37" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Users className="h-4 w-4 text-gold-500" /><CardTitle>Resumo do cadastro</CardTitle></div></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Clientes', value: customers.length, sub: `${customers.filter((c) => c.status === 'vip').length} VIP` },
                { label: 'Barbeiros', value: barbers.length, sub: `${barbers.filter((b) => b.status === 'active').length} ativos` },
                { label: 'Serviços', value: services.length, sub: `${services.filter((s) => s.is_package).length} pacotes` },
                { label: 'Produtos', value: products.length, sub: `${products.filter((p) => p.stock <= p.min_stock).length} em baixa` },
              ].map((r) => (
                <div key={r.label} className="rounded-lg border border-ink-200 dark:border-ink-700 p-3">
                  <p className="text-2xl font-bold text-ink-900 dark:text-white">{r.value}</p>
                  <p className="text-xs text-ink-400">{r.label}</p>
                  <Badge tone="neutral" className="mt-1.5">{r.sub}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
