import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Package, Search, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProducts } from '@/hooks/useQueries';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

const empty = { name: '', barcode: '', category: 'Geral', supplier: '', cost_price: '', sale_price: '', stock: '0', min_stock: '5', unit: 'un' };

export function Produtos() {
  const { data: products = [], isLoading } = useProducts();
  const { push } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = products.filter((p) => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode?.includes(query));
  const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;
  const stockValue = products.reduce((s, p) => s + p.cost_price * p.stock, 0);
  const potentialRevenue = products.reduce((s, p) => s + p.sale_price * p.stock, 0);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name, barcode: form.barcode || null, category: form.category,
        supplier: form.supplier || null, cost_price: Number(form.cost_price), sale_price: Number(form.sale_price),
        stock: Number(form.stock), min_stock: Number(form.min_stock), unit: form.unit,
      };
      if (editing) { const { error } = await supabase.from('products').update(body).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('products').insert(body); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setModal(false); push({ tone: 'success', title: editing ? 'Produto atualizado' : 'Produto criado' }); },
    onError: (e: Error) => push({ tone: 'error', title: 'Erro', description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('products').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteId(null); push({ tone: 'success', title: 'Produto removido' }); },
  });

  const open = (p?: Product) => {
    setEditing(p ?? null);
    setForm(p ? { name: p.name, barcode: p.barcode ?? '', category: p.category, supplier: p.supplier ?? '', cost_price: String(p.cost_price), sale_price: String(p.sale_price), stock: String(p.stock), min_stock: String(p.min_stock), unit: p.unit } : empty);
    setModal(true);
  };

  const margin = form.cost_price && form.sale_price ? (((Number(form.sale_price) - Number(form.cost_price)) / Number(form.sale_price)) * 100).toFixed(0) : '0';

  return (
    <div>
      <PageHeader title="Produtos" subtitle={`${products.length} itens em estoque`} action={<Button variant="gold" onClick={() => open()}><Plus className="h-4 w-4" /> Novo produto</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-4"><Package className="h-5 w-5 text-ink-400" /><p className="mt-2 text-xl font-bold text-ink-900 dark:text-white">{products.length}</p><p className="text-xs text-ink-400">Produtos</p></Card>
        <Card className="p-4"><AlertTriangle className="h-5 w-5 text-amber-500" /><p className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">{lowStockCount}</p><p className="text-xs text-ink-400">Estoque baixo</p></Card>
        <Card className="p-4"><TrendingDown className="h-5 w-5 text-ink-400" /><p className="mt-2 text-xl font-bold text-ink-900 dark:text-white">{formatCurrency(stockValue).replace(',00', '')}</p><p className="text-xs text-ink-400">Valor estoque</p></Card>
        <Card className="p-4"><TrendingUp className="h-5 w-5 text-gold-500" /><p className="mt-2 text-xl font-bold text-gold-600 dark:text-gold-400">{formatCurrency(potentialRevenue).replace(',00', '')}</p><p className="text-xs text-ink-400">Receita potencial</p></Card>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <Input className="pl-9" placeholder="Buscar produto ou código..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Package className="h-6 w-6" />} title="Nenhum produto" description="Cadastre seu primeiro produto." action={<Button variant="gold" size="sm" onClick={() => open()}><Plus className="h-4 w-4" /> Novo</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800 text-left text-xs uppercase text-ink-400">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium text-right">Custo</th>
                  <th className="px-4 py-3 font-medium text-right">Venda</th>
                  <th className="px-4 py-3 font-medium text-center">Estoque</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-ink-100 dark:border-ink-800/60 hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-ink-400">{p.supplier ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3"><Badge tone="neutral">{p.category}</Badge></td>
                    <td className="px-4 py-3 text-right text-ink-600 dark:text-ink-300">{formatCurrency(p.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gold-600 dark:text-gold-400">{formatCurrency(p.sale_price)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={p.stock === 0 ? 'danger' : p.stock <= p.min_stock ? 'warning' : 'success'}>
                        {p.stock} {p.unit}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => open(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar produto' : 'Novo produto'} size="lg"
        footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button variant="gold" onClick={() => save.mutate()} loading={save.isPending}>{editing ? 'Salvar' : 'Criar'}</Button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Código de barras"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></Field>
          <Field label="Categoria"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Geral</option><option>Cabelo</option><option>Barba</option><option>Higiene</option><option>Equipamento</option><option>Descartável</option></Select></Field>
          <Field label="Fornecedor"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
          <Field label="Preço de custo" required><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></Field>
          <Field label="Preço de venda" required><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></Field>
          <Field label="Estoque atual"><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          <Field label="Estoque mínimo"><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-gold-100/60 dark:bg-gold-400/10 p-3">
            <span className="text-sm text-ink-600 dark:text-ink-300">Margem de lucro</span>
            <span className="text-sm font-semibold text-gold-700 dark:text-gold-300">{margin}%</span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} title="Remover produto?" description="O produto será removido do estoque." danger loading={del.isPending} />
    </div>
  );
}
