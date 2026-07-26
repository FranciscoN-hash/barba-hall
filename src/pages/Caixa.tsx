import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Lock, Unlock, TrendingUp, TrendingDown, Wallet, Calculator } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useOpenCashSession, useOpenCash, useCloseCash, useSalesByRange, useTransactionsByRange } from '@/hooks/useQueries';
import { formatCurrency, formatDateTime, startOfDay, endOfDay, toISO, cn } from '@/lib/utils';

export function Caixa() {
  const { data: session, isLoading } = useOpenCashSession();
  const openCash = useOpenCash();
  const closeCash = useCloseCash();
  const { push } = useToast();

  const [openModal, setOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('200');
  const [closeModal, setCloseModal] = useState(false);
  const [counted, setCounted] = useState('');

  const dayStart = toISO(startOfDay(new Date()));
  const dayEnd = toISO(endOfDay(new Date()));
  const { data: sales = [] } = useSalesByRange(dayStart, dayEnd);
  const { data: txns = [] } = useTransactionsByRange(dayStart, dayEnd);

  const cashSales = sales.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cashExpenses = txns.filter((t) => t.type === 'expense' && t.payment_method === 'cash' && t.paid).reduce((sum, t) => sum + t.amount, 0);
  const expected = (session?.opening_amount ?? 0) + cashSales - cashExpenses;
  const countedNum = Number(counted) || 0;
  const difference = countedNum - expected;

  const handleOpen = async () => {
    await openCash.mutateAsync(Number(openingAmount) || 0);
    push({ tone: 'success', title: 'Caixa aberto', description: `Abertura: ${formatCurrency(Number(openingAmount) || 0)}` });
    setOpenModal(false);
  };
  const handleClose = async () => {
    if (!session) return;
    await closeCash.mutateAsync({ id: session.id, closing: countedNum, expected });
    push({ tone: 'success', title: 'Caixa fechado', description: `Diferença: ${formatCurrency(difference)}` });
    setCloseModal(false);
    setCounted('');
  };

  if (isLoading) return <div><PageHeader title="Caixa" /><Skeleton className="h-64" /></div>;

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Controle de abertura e fechamento do caixa." />

      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn('p-6', session ? 'border-emerald-400/30' : 'border-amber-400/30')}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', session ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400')}>
                {session ? <Unlock className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-sm text-ink-400">Status do caixa</p>
                <p className="text-xl font-bold text-ink-900 dark:text-white">{session ? 'Aberto' : 'Fechado'}</p>
                {session && <p className="text-xs text-ink-400 mt-0.5">Aberto em {formatDateTime(session.opened_at)}</p>}
              </div>
            </div>
            {session ? (
              <Button variant="danger" onClick={() => setCloseModal(true)}><Lock className="h-4 w-4" /> Fechar caixa</Button>
            ) : (
              <Button variant="gold" onClick={() => setOpenModal(true)}><Unlock className="h-4 w-4" /> Abrir caixa</Button>
            )}
          </div>
        </Card>
      </motion.div>

      {session ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Card className="p-4"><Wallet className="h-5 w-5 text-ink-400" /><p className="mt-2 text-xl font-bold text-ink-900 dark:text-white">{formatCurrency(session.opening_amount)}</p><p className="text-xs text-ink-400">Abertura</p></Card>
            <Card className="p-4"><TrendingUp className="h-5 w-5 text-emerald-500" /><p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cashSales)}</p><p className="text-xs text-ink-400">Vendas em dinheiro</p></Card>
            <Card className="p-4"><TrendingDown className="h-5 w-5 text-red-500" /><p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(cashExpenses)}</p><p className="text-xs text-ink-400">Saídas em dinheiro</p></Card>
            <Card className="p-4"><Calculator className="h-5 w-5 text-gold-500" /><p className="mt-2 text-xl font-bold text-gold-600 dark:text-gold-400">{formatCurrency(expected)}</p><p className="text-xs text-ink-400">Esperado em caixa</p></Card>
          </div>

          {/* Recent cash sales */}
          <Card className="mt-4">
            <CardHeader><CardTitle>Movimentações em dinheiro hoje</CardTitle></CardHeader>
            <CardContent>
              {sales.filter((s) => s.payment_method === 'cash').length === 0 ? (
                <EmptyState icon={<DollarSign className="h-6 w-6" />} title="Sem vendas em dinheiro" description="As vendas em dinheiro aparecem aqui." />
              ) : (
                <div className="space-y-2">
                  {sales.filter((s) => s.payment_method === 'cash').map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                      <div><p className="text-sm font-medium text-ink-900 dark:text-white">{s.customer?.name ?? 'Cliente avulso'}</p><p className="text-xs text-ink-400">{formatDateTime(s.created_at)}</p></div>
                      <Badge tone="success">+{formatCurrency(s.total)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="mt-4"><EmptyState icon={<DollarSign className="h-6 w-6" />} title="Caixa fechado" description="Abra o caixa para registrar movimentações do dia." action={<Button variant="gold" size="sm" onClick={() => setOpenModal(true)}><Unlock className="h-4 w-4" /> Abrir caixa</Button>} /></Card>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caixa" size="sm"
        footer={<><Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button><Button variant="gold" onClick={handleOpen} loading={openCash.isPending}>Confirmar abertura</Button></>}>
        <Field label="Valor de abertura" required>
          <Input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
        </Field>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Fechar caixa" description="Conte o dinheiro físico e informe o total." size="sm"
        footer={<><Button variant="outline" onClick={() => setCloseModal(false)}>Cancelar</Button><Button variant="danger" onClick={handleClose} loading={closeCash.isPending}>Confirmar fechamento</Button></>}>
        <div className="space-y-4">
          <div className="rounded-lg bg-ink-100 dark:bg-ink-800 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">Abertura</span><span className="font-medium">{formatCurrency(session?.opening_amount ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">+ Vendas dinheiro</span><span className="font-medium text-emerald-600">{formatCurrency(cashSales)}</span></div>
            <div className="flex justify-between"><span className="text-ink-500 dark:text-ink-400">- Saídas dinheiro</span><span className="font-medium text-red-600">{formatCurrency(cashExpenses)}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-ink-200 dark:border-ink-700"><span className="font-semibold">Esperado</span><span className="font-bold text-gold-600 dark:text-gold-400">{formatCurrency(expected)}</span></div>
          </div>
          <Field label="Valor contado" required>
            <Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0,00" />
          </Field>
          {counted && (
            <div className={cn('rounded-lg p-3 text-center', Math.abs(difference) < 0.01 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300')}>
              <p className="text-sm font-semibold">Diferença: {formatCurrency(difference)}</p>
              <p className="text-xs mt-0.5">{Math.abs(difference) < 0.01 ? 'Caixa conferido!' : difference > 0 ? 'Sobra no caixa' : 'Falta no caixa'}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
