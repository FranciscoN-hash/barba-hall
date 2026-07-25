import { motion } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CalendarCheck, DollarSign, Users, TrendingUp, Package, Trophy, Cake, Clock, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatTime, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusTone: Record<string, 'gold' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  scheduled: 'gold',
  confirmed: 'info' as never,
  completed: 'success',
  cancelled: 'danger',
  no_show: 'warning',
};
const statusLabel: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};

const PIE_COLORS = ['#D4AF37', '#1C1C1C', '#525252', '#A3A3A3'];
const PAY_LABEL: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', credit: 'Crédito', debit: 'Débito' };

export function Dashboard() {
  const { profile } = useAuth();
  const { data, isLoading } = useDashboard();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin';

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Visão geral da sua barbearia" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const monthDelta = data.lastMonthRevenue > 0
    ? Math.round(((data.monthRevenue - data.lastMonthRevenue) / data.lastMonthRevenue) * 100)
    : 0;

  return (
    <div>
      <PageHeader title={`Olá, ${firstName}`} subtitle="Aqui está o resumo da sua barbearia hoje." />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(data.monthRevenue)}
          icon={DollarSign}
          delta={monthDelta}
          deltaLabel={data.lastMonthRevenue > 0 ? `vs ${formatCurrency(data.lastMonthRevenue)} mês passado` : 'primeiro mês'}
          accent="gold"
          delay={0}
        />
        <StatCard
          label="Faturamento hoje"
          value={formatCurrency(data.todayRevenue)}
          icon={TrendingUp}
          accent="success"
          delay={0.05}
        />
        <StatCard
          label="Agendamentos hoje"
          value={String(data.todayCount)}
          icon={CalendarCheck}
          deltaLabel={`${data.completedToday} concluídos`}
          accent="neutral"
          delay={0.1}
        />
        <StatCard
          label="Clientes"
          value={String(data.totalCustomers)}
          icon={Users}
          deltaLabel={`${data.newCustomers} novos este mês`}
          accent="neutral"
          delay={0.15}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Faturamento x Despesas (7 dias)</CardTitle>
              <Badge tone="gold" dot>Tempo real</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#525252" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#525252" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.15)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={56} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)', fontSize: 12 }}
                  formatter={(v) => formatCurrency(Number(v))}
                  labelFormatter={(l) => formatDate(l as string)}
                />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#D4AF37" strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="expense" name="Despesa" stroke="#525252" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formas de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {data.paymentBreakdown.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-6 w-6" />} title="Sem vendas ainda" description="As vendas do PDV aparecem aqui." />
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.paymentBreakdown.map((p) => ({ name: PAY_LABEL[p.method] ?? p.method, value: p.total }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                      {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 w-full space-y-2">
                  {data.paymentBreakdown.map((p, i) => (
                    <div key={p.method} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {PAY_LABEL[p.method] ?? p.method}
                      </span>
                      <span className="font-medium text-ink-700 dark:text-ink-200">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agenda + side panels */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {/* Today's agenda */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agenda de hoje</CardTitle>
              <Link to="/agenda" className="text-sm font-medium text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1">
                Ver agenda <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.todayAppointments.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="Nenhum agendamento hoje" description="Os agendamentos do dia aparecem aqui." />
            ) : (
              data.todayAppointments.slice(0, 6).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 rounded-lg bg-ink-100 dark:bg-ink-800 py-1.5">
                    <span className="text-sm font-semibold text-ink-900 dark:text-white">{formatTime(a.start_at)}</span>
                    <span className="text-[10px] text-ink-400">{formatTime(a.end_at)}</span>
                  </div>
                  <Avatar src={a.customer?.avatar_url ?? null} name={a.customer?.name ?? 'Cliente'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{a.customer?.name ?? 'Cliente avulso'}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400 truncate">
                      {a.service?.name ?? 'Serviço'} · {a.barber?.name ?? '—'}
                    </p>
                  </div>
                  <Badge tone={statusTone[a.status] ?? 'neutral'}>{statusLabel[a.status] ?? a.status}</Badge>
                  <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 hidden sm:block">{formatCurrency(a.price)}</span>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle>Estoque baixo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lowStock.length === 0 ? (
              <EmptyState icon={<Package className="h-6 w-6" />} title="Tudo em ordem" description="Nenhum produto com estoque baixo." />
            ) : (
              data.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.category}</p>
                  </div>
                  <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>
                    {p.stock}/{p.min_stock}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking + services + birthdays */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold-500" />
              <CardTitle>Ranking de barbeiros</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.barberRanking.length === 0 ? (
              <EmptyState icon={<Trophy className="h-6 w-6" />} title="Sem dados" description="O ranking aparece após atendimentos." />
            ) : (
              data.barberRanking.map((b, i) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    i === 0 ? 'bg-gold-gradient text-ink-950' : 'bg-ink-100 dark:bg-ink-800 text-ink-500',
                  )}>{i + 1}</span>
                  <Avatar src={b.avatar_url} name={b.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{b.name}</p>
                    <p className="text-xs text-ink-400">{b.appointments} atend. · ★ {b.rating.toFixed(1)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gold-600 dark:text-gold-400">{formatCurrency(b.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="Sem vendas" description="Os serviços aparecem aqui." />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.topServices} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.15)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip cursor={{ fill: 'rgba(212,175,55,0.06)' }} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  <Bar dataKey="count" name="Vendas" fill="#D4AF37" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-gold-500" />
              <CardTitle>Aniversariantes do mês</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.birthdaysThisMonth.length === 0 ? (
              <EmptyState icon={<Cake className="h-6 w-6" />} title="Nenhum aniversário" description="Os aniversariantes aparecem aqui." />
            ) : (
              data.birthdaysThisMonth.map((c) => (
                <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                  <Avatar src={null} name={c.name} size="sm" />
                  <p className="text-sm font-medium text-ink-900 dark:text-white flex-1 truncate">{c.name}</p>
                  <span className="text-xs text-ink-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(c.birth_date, { day: '2-digit', month: '2-digit' })}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
