import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MapPin, Cake, Star, Gift, Wallet, Calendar, TrendingUp, MessageCircle, Pencil,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCustomer } from '@/hooks/useQueries';
import { formatCurrency, formatDate, formatDateTime, relativeTime, cn } from '@/lib/utils';

export function ClienteDetalhe() {
  const { id } = useParams();
  const { data: customer, isLoading } = useCustomer(id);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Cliente" />
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <Card><EmptyState icon={<Star className="h-6 w-6" />} title="Cliente não encontrado" action={<Link to="/clientes"><Button variant="outline" size="sm">Ver todos</Button></Link>} /></Card>
      </div>
    );
  }

  return (
    <div>
      <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4"><ArrowLeft className="h-4 w-4" /> Clientes</Link>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar src={customer.avatar_url} name={customer.name} size="xl" ring={customer.status === 'vip'} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{customer.name}</h1>
                <Badge tone={customer.status === 'vip' ? 'gold' : customer.status === 'inactive' ? 'neutral' : 'success'} dot>
                  {customer.status === 'vip' ? 'VIP' : customer.status === 'inactive' ? 'Inativo' : 'Ativo'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-500 dark:text-ink-400">
                {customer.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{customer.phone}</span>}
                {customer.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{customer.email}</span>}
                {customer.birth_date && <span className="flex items-center gap-1.5"><Cake className="h-4 w-4" />{formatDate(customer.birth_date)}</span>}
                {customer.address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{customer.address}</span>}
              </div>
              {customer.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {customer.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {customer.whatsapp && (
                <a href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp</Button>
                </a>
              )}
              <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {[
          { label: 'Visitas totais', value: String(customer.total_visits), icon: Calendar, accent: 'text-ink-900 dark:text-white' },
          { label: 'Total gasto', value: formatCurrency(customer.total_spent), icon: Wallet, accent: 'text-gold-600 dark:text-gold-400' },
          { label: 'Ticket médio', value: formatCurrency(customer.avg_ticket), icon: TrendingUp, accent: 'text-ink-900 dark:text-white' },
          { label: 'Pontos fidelidade', value: String(customer.loyalty_points), icon: Gift, accent: 'text-gold-600 dark:text-gold-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <s.icon className="h-5 w-5 text-ink-400" />
              <p className={cn('mt-2 text-xl font-bold', s.accent)}>{s.value}</p>
              <p className="text-xs text-ink-400">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* Preferences / notes */}
        <Card>
          <CardHeader><CardTitle>Preferências e observações</CardTitle></CardHeader>
          <CardContent>
            {customer.preferences || customer.notes ? (
              <div className="space-y-3 text-sm">
                {customer.preferences && <div><p className="text-xs font-semibold text-ink-400 uppercase">Preferências</p><p className="text-ink-700 dark:text-ink-200 mt-0.5">{customer.preferences}</p></div>}
                {customer.notes && <div><p className="text-xs font-semibold text-ink-400 uppercase">Observações</p><p className="text-ink-700 dark:text-ink-200 mt-0.5">{customer.notes}</p></div>}
              </div>
            ) : (
              <EmptyState title="Sem observações" description="Adicione preferências do cliente." />
            )}
          </CardContent>
        </Card>

        {/* Loyalty */}
        <Card>
          <CardHeader><CardTitle>Programa de fidelidade</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl bg-gold-sheen border border-gold-400/20 p-4">
              <div>
                <p className="text-xs text-ink-500 dark:text-ink-400">Cashback disponível</p>
                <p className="text-2xl font-bold text-gold-600 dark:text-gold-400">{formatCurrency(customer.cashback_balance)}</p>
              </div>
              <Gift className="h-10 w-10 text-gold-400/60" />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-ink-500 dark:text-ink-400">Pontos: {customer.loyalty_points}</span>
                <span className="text-ink-400 text-xs">Próximo prêmio: 200 pts</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${Math.min(100, (customer.loyalty_points / 200) * 100)}%` }} />
              </div>
            </div>
            {customer.last_visit_at && (
              <p className="mt-4 text-xs text-ink-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Última visita: {formatDateTime(customer.last_visit_at)} ({relativeTime(customer.last_visit_at)})
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
