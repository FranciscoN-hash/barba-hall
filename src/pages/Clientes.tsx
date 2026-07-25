import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Users, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCustomers } from '@/hooks/useQueries';
import { formatCurrency, relativeTime, cn } from '@/lib/utils';
import type { CustomerStatus } from '@/types';

const statusTone: Record<CustomerStatus, 'success' | 'neutral' | 'gold'> = {
  active: 'success',
  inactive: 'neutral',
  vip: 'gold',
};
const statusLabel: Record<CustomerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  vip: 'VIP',
};

export function Clientes() {
  const { data: customers = [], isLoading } = useCustomers();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | CustomerStatus>('all');

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
    });
  }, [customers, query, filter]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} clientes cadastrados`}
        action={<Button variant="gold"><Plus className="h-4 w-4" /> Novo cliente</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg border border-ink-200 dark:border-ink-700 p-0.5 bg-white dark:bg-ink-900">
          {(['all', 'active', 'vip', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', filter === f ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white')}
            >
              {f === 'all' ? 'Todos' : statusLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum cliente" description="Cadastre seu primeiro cliente." action={<Button variant="gold" size="sm"><Plus className="h-4 w-4" /> Novo cliente</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/clientes/${c.id}`}>
                <Card className="p-4 hover:shadow-elevated transition-all hover:-translate-y-0.5">
                  <div className="flex items-start gap-3">
                    <Avatar src={c.avatar_url} name={c.name} size="lg" ring={c.status === 'vip'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{c.name}</p>
                        <Badge tone={statusTone[c.status]} dot>{statusLabel[c.status]}</Badge>
                      </div>
                      {c.phone && <p className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-bold text-ink-900 dark:text-white">{c.total_visits}</p>
                          <p className="text-[10px] text-ink-400">visitas</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gold-600 dark:text-gold-400">{formatCurrency(c.avg_ticket).replace(',00', '')}</p>
                          <p className="text-[10px] text-ink-400">ticket</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink-900 dark:text-white">{c.loyalty_points}</p>
                          <p className="text-[10px] text-ink-400">pontos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {c.last_visit_at && (
                    <p className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-400">
                      Última visita {relativeTime(c.last_visit_at)}
                    </p>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
