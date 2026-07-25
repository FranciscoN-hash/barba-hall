import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Scissors, Star, Target, TrendingUp, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useBarbers } from '@/hooks/useQueries';
import { formatCurrency } from '@/lib/utils';
import type { Barber } from '@/types';

const statusTone = { active: 'success', inactive: 'neutral', vacation: 'warning' } as const;
const statusLabel = { active: 'Ativo', inactive: 'Inativo', vacation: 'Férias' } as const;

const empty = { name: '', phone: '', email: '', specialties: '', commission_pct: '50', monthly_target: '5000', work_start: '09:00', work_end: '18:00', status: 'active' as Barber['status'] };

export function Barbeiros() {
  const { data: barbers = [], isLoading } = useBarbers();
  const { push } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        commission_pct: Number(form.commission_pct),
        monthly_target: Number(form.monthly_target),
        work_start: form.work_start,
        work_end: form.work_end,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('barbers').update(body).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('barbers').insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); setModal(false); push({ tone: 'success', title: editing ? 'Barbeiro atualizado' : 'Barbeiro adicionado' }); },
    onError: (e: Error) => push({ tone: 'error', title: 'Erro', description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('barbers').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); setDeleteId(null); push({ tone: 'success', title: 'Barbeiro removido' }); },
  });

  const open = (b?: Barber) => {
    setEditing(b ?? null);
    setForm(b ? {
      name: b.name, phone: b.phone ?? '', email: b.email ?? '',
      specialties: b.specialties.join(', '), commission_pct: String(b.commission_pct),
      monthly_target: String(b.monthly_target), work_start: b.work_start, work_end: b.work_end, status: b.status,
    } : empty);
    setModal(true);
  };

  return (
    <div>
      <PageHeader title="Barbeiros" subtitle={`${barbers.length} profissionais`} action={<Button variant="gold" onClick={() => open()}><Plus className="h-4 w-4" /> Novo barbeiro</Button>} />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)}</div>
      ) : barbers.length === 0 ? (
        <Card><EmptyState icon={<Scissors className="h-6 w-6" />} title="Nenhum barbeiro" description="Adicione seu primeiro profissional." action={<Button variant="gold" size="sm" onClick={() => open()}><Plus className="h-4 w-4" /> Novo</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5 hover:shadow-elevated transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={b.avatar_url} name={b.name} size="lg" ring />
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{b.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3.5 w-3.5 text-gold-400 fill-gold-400" />
                        <span className="text-xs text-ink-500 dark:text-ink-400">{b.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge tone={statusTone[b.status]} dot>{statusLabel[b.status]}</Badge>
                </div>
                {b.specialties.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.specialties.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-ink-400" /><div><p className="font-semibold text-ink-900 dark:text-white">{b.commission_pct}%</p><p className="text-[10px] text-ink-400">comissão</p></div></div>
                  <div className="flex items-center gap-2"><Target className="h-4 w-4 text-ink-400" /><div><p className="font-semibold text-ink-900 dark:text-white">{formatCurrency(b.monthly_target).replace(',00', '')}</p><p className="text-[10px] text-ink-400">meta/mês</p></div></div>
                </div>
                <div className="mt-4 pt-3 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between">
                  <span className="text-xs text-ink-400 flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone ?? '—'}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => open(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar barbeiro' : 'Novo barbeiro'} size="lg"
        footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button variant="gold" onClick={() => save.mutate()} loading={save.isPending}>{editing ? 'Salvar' : 'Adicionar'}</Button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 9..." /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Especialidades" hint="Separadas por vírgula"><Input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Corte, Barba" /></Field>
          <Field label="Comissão (%)"><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} /></Field>
          <Field label="Meta mensal (R$)"><Input type="number" value={form.monthly_target} onChange={(e) => setForm({ ...form, monthly_target: e.target.value })} /></Field>
          <Field label="Início expediente"><Input type="time" value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} /></Field>
          <Field label="Fim expediente"><Input type="time" value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Barber['status'] })}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="vacation">Férias</option></Select></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} title="Remover barbeiro?" description="O profissional será removido do sistema." danger loading={del.isPending} />
    </div>
  );
}
