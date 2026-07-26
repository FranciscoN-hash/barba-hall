import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Plus, TrendingUp, TrendingDown, Wallet, DollarSign, Pencil, Trash2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useTransactionsByRange, useUpsertTransaction, useDeleteTransaction } from '@/hooks/useQueries';
import { formatCurrency, formatDate, startOfMonth, endOfDay, toISO, cn } from '@/lib/utils';
import type { Transaction } from '@/types';

const CATEGORIES = ['Serviços', 'Vendas', 'Aluguel', 'Energia', 'Água', 'Internet', 'Fornecedores', 'Marketing', 'Comissões', 'Salários', 'Impostos', 'Outros'];

const empty = { type: 'revenue' as Transaction['type'], category: 'Serviços', description: '', amount: '', payment_method: 'pix', due_date: '', paid: true };

export function Financeiro() {
  const now = new Date();
  const start = toISO(startOfMonth(now));
  const end = toISO(endOfDay(now));
  const { data: transactions = [], isLoading } = useTransactionsByRange(start, end);
  const upsert = useUpsertTransaction();
  const del = useDeleteTransaction();
  const { push } = useToast();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const revenue = transactions.filter((t) => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const pending = transactions.filter((t) => !t.paid).reduce((s, t) => s + t.amount, 0);
    return { revenue, expense, profit: revenue - expense, pending };
  }, [transactions]);

  const chartData = useMemo(() => {
    const map: Record<string, { revenue: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = new Date(t.created_at).toISOString().slice(0, 10);
      if (!map[key]) map[key] = { revenue: 0, expense: 0 };
      map[key][t.type] += t.amount;
    });
    return Object.entries(map).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const open = (t?: Transaction) => {
    setEditing(t ?? null);
    setForm(t ? { type: t.type, category: t.category, description: t.description, amount: String(t.amount), payment_method: t.payment_method ?? 'pix', due_date: t.due_date ?? '', paid: t.paid } : empty);
    setModal(true);
  };

  const submit = async () => {
    await upsert.mutateAsync({
      id: editing?.id,
      type: form.type,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      due_date: form.due_date || null,
      paid: form.paid,
    });
    push({ tone: 'success', title: editing ? 'Lançamento atualizado' : 'Lançamento criado' });
    setModal(false);
  };

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa, contas e resultados do mês." action={<Button variant="gold" onClick={() => open()}><Plus className="h-4 w-4" /> Novo lançamento</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /><span className="text-xs text-ink-400">Receitas</span></div><p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.revenue)}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /><span className="text-xs text-ink-400">Despesas</span></div><p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.expense)}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-gold-500" /><span className="text-xs text-ink-400">Lucro</span></div><p className={cn('mt-2 text-xl font-bold', stats.profit >= 0 ? 'text-gold-600 dark:text-gold-400' : 'text-red-600 dark:text-red-400')}>{formatCurrency(stats.profit)}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /><span className="text-xs text-ink-400">Pendente</span></div><p className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.pending)}</p></Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Fluxo de caixa do mês</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? <EmptyState icon={<DollarSign className="h-6 w-6" />} title="Sem movimentações" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="frev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="fexp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.15)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={56} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => formatDate(l as string)} />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" strokeWidth={2.5} fill="url(#frev)" />
                <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" strokeWidth={2} fill="url(#fexp)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-ink-200 dark:border-ink-800 text-left text-xs uppercase text-ink-400"><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium text-right">Valor</th><th className="px-4 py-3 font-medium text-center">Status</th><th className="px-4 py-3 font-medium text-right">Ações</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-8"><Skeleton className="h-8" /></td></tr> :
                transactions.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<Wallet className="h-6 w-6" />} title="Sem lançamentos" description="Adicione receitas e despesas." /></td></tr> :
                transactions.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-ink-100 dark:border-ink-800/60 hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{t.description}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{t.category}</Badge></td>
                    <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{formatDate(t.created_at)}</td>
                    <td className={cn('px-4 py-3 text-right font-semibold', t.type === 'revenue' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{t.type === 'revenue' ? '+' : '-'}{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-center">{t.paid ? <Badge tone="success" dot>Pago</Badge> : <Badge tone="warning" dot>Pendente</Badge>}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => open(t)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar lançamento' : 'Novo lançamento'}
        footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button variant="gold" onClick={submit} loading={upsert.isPending}>{editing ? 'Salvar' : 'Criar'}</Button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Transaction['type'] })}><option value="revenue">Receita</option><option value="expense">Despesa</option></Select></Field>
          <Field label="Categoria"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="Descrição" required><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <Field label="Valor (R$)" required><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Vencimento"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="Forma de pagamento"><Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="credit">Crédito</option><option value="debit">Débito</option><option value="transfer">Transferência</option><option value="boleto">Boleto</option></Select></Field>
          <Field label="Status"><Select value={form.paid ? 'paid' : 'pending'} onChange={(e) => setForm({ ...form, paid: e.target.value === 'paid' })}><option value="paid">Pago</option><option value="pending">Pendente</option></Select></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await del.mutateAsync(deleteId); push({ tone: 'success', title: 'Lançamento removido' }); setDeleteId(null); } }} title="Remover lançamento?" danger loading={del.isPending} />
    </div>
  );
}
