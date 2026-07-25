import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Sparkles, Clock, Package2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useQueries';
import { formatCurrency, cn } from '@/lib/utils';
import type { Service } from '@/types';

const empty = { name: '', category: 'Cabelo', description: '', price: '', duration_min: '30', commission_pct: '50', is_package: false, active: true };

export function Servicos() {
  const { data: services = [], isLoading } = useServices();
  const { push } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name, category: form.category,
        description: form.description || null, price: Number(form.price),
        duration_min: Number(form.duration_min), commission_pct: Number(form.commission_pct),
        is_package: form.is_package, active: form.active,
      };
      if (editing) { const { error } = await supabase.from('services').update(body).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('services').insert(body); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setModal(false); push({ tone: 'success', title: editing ? 'Serviço atualizado' : 'Serviço criado' }); },
    onError: (e: Error) => push({ tone: 'error', title: 'Erro', description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('services').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setDeleteId(null); push({ tone: 'success', title: 'Serviço removido' }); },
  });

  const open = (s?: Service) => {
    setEditing(s ?? null);
    setForm(s ? { name: s.name, category: s.category, description: s.description ?? '', price: String(s.price), duration_min: String(s.duration_min), commission_pct: String(s.commission_pct), is_package: s.is_package, active: s.active } : empty);
    setModal(true);
  };

  return (
    <div>
      <PageHeader title="Serviços" subtitle={`${services.length} serviços cadastrados`} action={<Button variant="gold" onClick={() => open()}><Plus className="h-4 w-4" /> Novo serviço</Button>} />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : services.length === 0 ? (
        <Card><EmptyState icon={<Sparkles className="h-6 w-6" />} title="Nenhum serviço" description="Cadastre os serviços oferecidos." action={<Button variant="gold" size="sm" onClick={() => open()}><Plus className="h-4 w-4" /> Novo</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-5 hover:shadow-elevated transition-all flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.is_package ? 'bg-gold-100 dark:bg-gold-400/15 text-gold-600 dark:text-gold-300' : 'bg-ink-100 dark:bg-ink-800 text-ink-500')}>
                    {s.is_package ? <Package2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => open(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-white">{s.name}</p>
                <Badge tone="neutral" className="mt-1 self-start">{s.category}</Badge>
                <div className="mt-auto pt-4 grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-sm font-bold text-gold-600 dark:text-gold-400">{formatCurrency(s.price).replace(',00', '')}</p><p className="text-[10px] text-ink-400">preço</p></div>
                  <div><p className="text-sm font-bold text-ink-900 dark:text-white flex items-center justify-center gap-0.5"><Clock className="h-3 w-3" />{s.duration_min}</p><p className="text-[10px] text-ink-400">min</p></div>
                  <div><p className="text-sm font-bold text-ink-900 dark:text-white">{s.commission_pct}%</p><p className="text-[10px] text-ink-400">comissão</p></div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar serviço' : 'Novo serviço'} size="lg"
        footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button variant="gold" onClick={() => save.mutate()} loading={save.isPending}>{editing ? 'Salvar' : 'Criar'}</Button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Categoria"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Cabelo</option><option>Barba</option><option>Combo</option><option>Coloração</option><option>Estética</option><option>Tratamento</option><option>Geral</option></Select></Field>
          <Field label="Preço (R$)" required><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Duração (min)" required><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
          <Field label="Comissão (%)"><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} /></Field>
          <Field label="Pacote/Combo"><Select value={form.is_package ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_package: e.target.value === 'true' })}><option value="false">Não</option><option value="true">Sim</option></Select></Field>
          <div className="sm:col-span-2"><Field label="Descrição"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} title="Remover serviço?" description="O serviço será removido do catálogo." danger loading={del.isPending} />
    </div>
  );
}
