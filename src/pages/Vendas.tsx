import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, ShoppingCart, CreditCard, Banknote, QrCode, Wallet, X, Receipt, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useServices, useProducts, useCustomers, useBarbers, useCreateSale, type CartItem } from '@/hooks/useQueries';
import { formatCurrency, cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

type Tab = 'service' | 'product';

const PAY_METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
  { id: 'debit', label: 'Débito', icon: Wallet },
];

export function Vendas() {
  const { data: services = [] } = useServices();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: barbers = [] } = useBarbers();
  const createSale = useCreateSale();
  const { push } = useToast();

  const [tab, setTab] = useState<Tab>('service');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState('1');
  const [receipt, setReceipt] = useState<{ open: boolean; total: number }>({ open: false, total: 0 });

  const items = tab === 'service' ? services : products.filter((p) => p.sale_price > 0);
  const filtered = items.filter((i) => !query.trim() || i.name.toLowerCase().includes(query.toLowerCase()));

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.ref_id === item.id);
      if (existing) return prev.map((c) => c.ref_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_type: tab === 'service' ? 'service' : 'product', ref_id: item.id, name: item.name, unit_price: item.price, quantity: 1, barber_id: null }];
    });
  };
  const updateQty = (id: string | null, delta: number) => {
    setCart((prev) => prev.map((c) => c.ref_id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };
  const removeItem = (id: string | null) => setCart((prev) => prev.filter((c) => c.ref_id !== id));
  const setBarber = (refId: string | null, barberId: string) => setCart((prev) => prev.map((c) => c.ref_id === refId ? { ...c, barber_id: barberId || null } : c));

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.unit_price * i.quantity, 0), [cart]);
  const discountNum = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(0, subtotal - discountNum);

  const checkout = async () => {
    if (cart.length === 0) { push({ tone: 'warning', title: 'Carrinho vazio' }); return; }
    try {
      const res = await createSale.mutateAsync({ customer_id: customerId || null, items: cart, discount: discountNum, payment_method: payment, installments: Number(installments) });
      setReceipt({ open: true, total: res.total });
      setCart([]); setDiscount('0'); setCustomerId('');
    } catch (e) {
      push({ tone: 'error', title: 'Erro na venda', description: e instanceof Error ? e.message : 'Tente novamente' });
    }
  };

  return (
    <div>
      <PageHeader title="Vendas (PDV)" subtitle="Ponto de venda rápido para serviços e produtos." />

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Catalog */}
        <div>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTab('service')} className={cn('flex-1 rounded-lg py-2 text-sm font-medium transition-colors', tab === 'service' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'bg-white dark:bg-ink-900 text-ink-500 border border-ink-200 dark:border-ink-700')}>Serviços</button>
            <button onClick={() => setTab('product')} className={cn('flex-1 rounded-lg py-2 text-sm font-medium transition-colors', tab === 'product' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'bg-white dark:bg-ink-900 text-ink-500 border border-ink-200 dark:border-ink-700')}>Produtos</button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <Input className="pl-9" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((item) => (
              <button key={item.id} onClick={() => addToCart({ id: item.id, name: item.name, price: tab === 'service' ? (item as { price: number }).price : (item as { sale_price: number }).sale_price })}
                className="text-left">
                <Card className="p-4 hover:shadow-elevated hover:border-gold-400/40 transition-all active:scale-[0.98]">
                  <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{tab === 'service' ? (item as { category: string }).category : (item as { category: string }).category}</p>
                  <p className="mt-2 text-lg font-bold text-gold-600 dark:text-gold-400">{formatCurrency(tab === 'service' ? (item as { price: number }).price : (item as { sale_price: number }).sale_price)}</p>
                </Card>
              </button>
            ))}
            {filtered.length === 0 && <div className="sm:col-span-2 xl:col-span-3"><EmptyState icon={<Search className="h-6 w-6" />} title="Nada encontrado" /></div>}
          </div>
        </div>

        {/* Cart */}
        <Card className="flex flex-col h-[calc(100vh-200px)] sticky top-20">
          <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gold-500" />
            <h3 className="font-semibold text-ink-900 dark:text-white">Carrinho</h3>
            {cart.length > 0 && <Badge tone="gold">{cart.length}</Badge>}
            {cart.length > 0 && <button onClick={() => setCart([])} className="ml-auto text-xs text-ink-400 hover:text-red-500">Limpar</button>}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {cart.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title="Carrinho vazio" description="Selecione serviços ou produtos." className="py-8" />
            ) : (
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div key={item.ref_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-lg border border-ink-200 dark:border-ink-700 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900 dark:text-white">{item.name}</p>
                      <button onClick={() => removeItem(item.ref_id)} className="text-ink-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.ref_id, -1)} className="rounded-md p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.ref_id, 1)} className="rounded-md p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">{formatCurrency(item.unit_price * item.quantity)}</span>
                    </div>
                    {item.item_type === 'service' && (
                      <Select className="mt-2 h-8 text-xs" value={item.barber_id ?? ''} onChange={(e) => setBarber(item.ref_id, e.target.value)}>
                        <option value="">Barbeiro (opcional)</option>
                        {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </Select>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="border-t border-ink-200 dark:border-ink-800 p-4 space-y-3">
            <Field label="Cliente (opcional)">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Cliente avulso</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500 dark:text-ink-400">Subtotal</span>
              <span className="font-medium text-ink-900 dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            <Field label="Desconto (R$)">
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-9" />
            </Field>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900 dark:text-white">Total</span>
              <span className="text-xl font-bold text-gold-600 dark:text-gold-400">{formatCurrency(total)}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-1.5">Pagamento</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PAY_METHODS.map((m) => (
                  <button key={m.id} onClick={() => setPayment(m.id)} className={cn('flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-all', payment === m.id ? 'bg-gold-gradient text-ink-950' : 'bg-ink-100 dark:bg-ink-800 text-ink-500 hover:bg-ink-200 dark:hover:bg-ink-700')}>
                    <m.icon className="h-4 w-4" />{m.label}
                  </button>
                ))}
              </div>
            </div>
            {payment === 'credit' && (
              <Field label="Parcelas"><Select value={installments} onChange={(e) => setInstallments(e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</Select></Field>
            )}
            <Button variant="gold" size="lg" className="w-full" onClick={checkout} loading={createSale.isPending} disabled={cart.length === 0}>
              <Receipt className="h-4 w-4" /> Finalizar venda
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={receipt.open} onClose={() => setReceipt({ open: false, total: 0 })} title="Venda concluída!" size="sm">
        <div className="flex flex-col items-center text-center py-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </motion.div>
          <p className="mt-4 text-2xl font-bold text-gold-600 dark:text-gold-400">{formatCurrency(receipt.total)}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Venda registrada com sucesso.</p>
          <Button variant="outline" className="mt-6 w-full" onClick={() => setReceipt({ open: false, total: 0 })}>Nova venda</Button>
        </div>
      </Modal>
    </div>
  );
}
