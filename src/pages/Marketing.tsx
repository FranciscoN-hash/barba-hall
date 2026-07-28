import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Cake, UserX, TrendingDown, Send, MessageCircle, Mail, Smartphone, Sparkles, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea, Field } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCustomers, useCompanySettings } from '@/hooks/useQueries';
import { formatDate, relativeTime, cn } from '@/lib/utils';

type CampaignType = 'birthday' | 'inactive' | 'promo' | 'custom';

const CAMPAIGNS: { id: CampaignType; label: string; description: string; icon: typeof Cake; tone: 'gold' | 'warning' | 'success' | 'neutral' }[] = [
  { id: 'birthday', label: 'Aniversariantes', description: 'Clientes que fazem aniversário este mês', icon: Cake, tone: 'gold' },
  { id: 'inactive', label: 'Clientes inativos', description: 'Sem visita há mais de 60 dias', icon: UserX, tone: 'warning' },
  { id: 'promo', label: 'Promoção', description: 'Oferta para todos os clientes ativos', icon: TrendingDown, tone: 'success' },
  { id: 'custom', label: 'Personalizada', description: 'Selecione manualmente os destinatários', icon: Users, tone: 'neutral' },
];

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'email', label: 'E-mail', icon: Mail },
];

export function Marketing() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: settings } = useCompanySettings();
  const companyName = settings?.name || 'BarberFlow';
  const { push } = useToast();
  const [selected, setSelected] = useState<CampaignType>('birthday');
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<{ name: string; type: CampaignType; channel: string; date: string }[]>([]);

  const now = new Date();
  const monthNum = now.getMonth() + 1;

  const recipients = customers.filter((c) => {
    if (selected === 'birthday') return c.birth_date && new Date(c.birth_date).getMonth() + 1 === monthNum;
    if (selected === 'inactive') return c.status === 'inactive' || (c.last_visit_at && new Date(c.last_visit_at) < new Date(Date.now() - 60 * 86400000));
    if (selected === 'promo') return c.status !== 'inactive';
    return false;
  });

  const send = () => {
    if (recipients.length === 0) { push({ tone: 'warning', title: 'Sem destinatários' }); return; }
    if (!message.trim()) { push({ tone: 'warning', title: 'Mensagem vazia' }); return; }
    setSent((prev) => [{ name: `${recipients.length} destinatários`, type: selected, channel, date: new Date().toISOString() }, ...prev]);
    push({ tone: 'success', title: 'Campanha enviada!', description: `${recipients.length} clientes via ${channel}.` });
    setMessage('');
  };

  const defaultMessage = (type: CampaignType) => {
    if (type === 'birthday') return `Feliz aniversário! Ganhe 20% de desconto em qualquer serviço este mês. ${companyName}`;
    if (type === 'inactive') return `Sentimos sua falta! Volte e ganhe um corte com 15% de desconto. ${companyName}`;
    if (type === 'promo') return `Promoção especial esta semana! Corte + Barba com desconto. Agende já. ${companyName}`;
    return '';
  };

  return (
    <div>
      <PageHeader title="Marketing" subtitle="Campanhas e disparos de mensagens para seus clientes." />

      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        {/* Campaign builder */}
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {CAMPAIGNS.map((c) => (
              <motion.button key={c.id} onClick={() => { setSelected(c.id); setMessage(defaultMessage(c.id)); }} whileTap={{ scale: 0.98 }}>
                <Card className={cn('p-4 text-left h-full transition-all', selected === c.id ? 'border-gold-400 ring-2 ring-gold-400/30' : 'hover:border-ink-300')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', `bg-${c.tone === 'gold' ? 'gold' : 'ink'}-100 dark:bg-ink-800`, c.tone === 'gold' && 'dark:bg-gold-400/15')}>
                      <c.icon className={cn('h-5 w-5', c.tone === 'gold' ? 'text-gold-600 dark:text-gold-400' : 'text-ink-500')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{c.label}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{c.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.button>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Mensagem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-1.5">Canal</p>
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => (
                    <button key={ch.id} onClick={() => setChannel(ch.id)} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', channel === ch.id ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'bg-ink-100 dark:bg-ink-800 text-ink-500')}>
                      <ch.icon className="h-4 w-4" /> {ch.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Conteúdo da mensagem">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Escreva sua mensagem..." />
              </Field>
              <Button variant="gold" onClick={send} className="w-full"><Send className="h-4 w-4" /> Disparar para {recipients.length} {recipients.length === 1 ? 'cliente' : 'clientes'}</Button>
            </CardContent>
          </Card>

          {/* Recipients preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Destinatários ({recipients.length})</CardTitle>
                <Badge tone="gold"><Sparkles className="h-3 w-3" /> IA: segmentação automática</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-20" /> : recipients.length === 0 ? (
                <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum destinatário" description="Nenhum cliente neste segmento." />
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                  {recipients.slice(0, 20).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                      <div>
                        <p className="text-sm font-medium text-ink-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-ink-400">{c.phone ?? c.email ?? '—'}</p>
                      </div>
                      <span className="text-xs text-ink-400">{c.last_visit_at ? relativeTime(c.last_visit_at) : 'novo'}</span>
                    </div>
                  ))}
                  {recipients.length > 20 && <p className="text-center text-xs text-ink-400 pt-2">+{recipients.length - 20} outros</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sent history */}
        <Card className="h-fit sticky top-20">
          <CardHeader><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-gold-500" /><CardTitle>Campanhas enviadas</CardTitle></div></CardHeader>
          <CardContent>
            {sent.length === 0 ? (
              <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Nenhuma campanha" description="Suas campanhas disparadas aparecem aqui." />
            ) : (
              <div className="space-y-3">
                {sent.map((s, i) => {
                  const camp = CAMPAIGNS.find((c) => c.id === s.type);
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg border border-ink-200 dark:border-ink-700 p-3">
                      <div className="flex items-center gap-2">
                        {camp && <camp.icon className="h-4 w-4 text-gold-500" />}
                        <p className="text-sm font-medium text-ink-900 dark:text-white">{s.name}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-400">
                        <Badge tone="neutral">{camp?.label}</Badge>
                        <span className="capitalize">{s.channel}</span>
                        <span>· {formatDate(s.date)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
