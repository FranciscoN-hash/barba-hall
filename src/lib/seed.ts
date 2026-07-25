import { supabase } from '@/lib/supabase';

interface SeedResult {
  success: boolean;
  message: string;
}

const SERVICE_NAMES = [
  { name: 'Corte Masculino', category: 'Cabelo', price: 50, duration: 40, commission: 50 },
  { name: 'Barba Completa', category: 'Barba', price: 35, duration: 30, commission: 50 },
  { name: 'Corte + Barba', category: 'Combo', price: 80, duration: 70, commission: 55, is_package: true },
  { name: 'Pezinho', category: 'Barba', price: 15, duration: 15, commission: 50 },
  { name: 'Sobrancelha', category: 'Estética', price: 20, duration: 15, commission: 40 },
  { name: 'Platinado', category: 'Coloração', price: 180, duration: 120, commission: 35 },
  { name: 'Pigmentação', category: 'Barba', price: 60, duration: 45, commission: 45 },
  { name: 'Hidratação Capilar', category: 'Tratamento', price: 45, duration: 30, commission: 40 },
];

const PRODUCT_NAMES = [
  { name: 'Pomada Modeladora Black', category: 'Cabelo', cost: 18, sale: 45, stock: 24, min: 8, supplier: 'Barber Supply' },
  { name: 'Óleo para Barba Premium', category: 'Barba', cost: 22, sale: 59, stock: 6, min: 8, supplier: 'Barber Supply' },
  { name: 'Shampoo Anticaspa', category: 'Higiene', cost: 12, sale: 29, stock: 40, min: 10, supplier: 'Clean Hair' },
  { name: 'Cera Modeladora Forte', category: 'Cabelo', cost: 16, sale: 39, stock: 18, min: 6, supplier: 'Barber Supply' },
  { name: 'Máquina de Corte Profissional', category: 'Equipamento', cost: 280, sale: 0, stock: 3, min: 1, supplier: 'Pro Tools' },
  { name: 'Navaja Descartável (pack 10)', category: 'Descartável', cost: 8, sale: 19, stock: 60, min: 20, supplier: 'Blade Co' },
  { name: 'Balm Pós Barba', category: 'Barba', cost: 14, sale: 34, stock: 4, min: 6, supplier: 'Clean Hair' },
  { name: 'Tônico Capilar', category: 'Higiene', cost: 10, sale: 25, stock: 30, min: 8, supplier: 'Clean Hair' },
];

const BARBER_NAMES = [
  { name: 'Rafael Costa', specialties: ['Corte', 'Barba', 'Pigmentação'], commission: 50, target: 6000, rating: 4.9 },
  { name: 'Lucas Almeida', specialties: ['Corte', 'Platinado', 'Coloração'], commission: 55, target: 7000, rating: 4.8 },
  { name: 'Diego Souza', specialties: ['Barba', 'Pezinho', 'Sobrancelha'], commission: 45, target: 5000, rating: 4.7 },
];

const CUSTOMER_NAMES = [
  'João Pereira', 'Pedro Santos', 'Mateus Oliveira', 'Gabriel Lima', 'Thiago Ferreira',
  'Bruno Carvalho', 'Felipe Rocha', 'Vinicius Martins', 'Caio Ribeiro', 'André Gomes',
  'Ricardo Nunes', 'Marcelo Dias', 'Eduardo Barros', 'Paulo César', 'Rodrigo Aires',
];

const TAGS_POOL = ['fidelizado', 'semanal', 'mensal', 'indicado', 'VIP', 'nova barba'];

function avatarUrl(name: string): string {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=0B0B0B,1C1C1C`;
}

function barberAvatar(name: string): string {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=D4AF37,1C1C1C&fontWeight=600`;
}

export async function seedDemoData(userId: string): Promise<SeedResult> {
  try {
    const { count: existing } = await supabase
      .from('barbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((existing ?? 0) > 0) {
      return { success: true, message: 'Dados já existem.' };
    }

    // Services
    const servicesToInsert = SERVICE_NAMES.map((s) => ({
      user_id: userId,
      name: s.name,
      category: s.category,
      price: s.price,
      duration_min: s.duration,
      commission_pct: s.commission,
      is_package: s.is_package ?? false,
      description: `${s.name} realizado por profissionais experientes.`,
    }));
    const { data: services, error: svcErr } = await supabase.from('services').insert(servicesToInsert).select();
    if (svcErr) throw svcErr;

    // Barbers
    const barbersToInsert = BARBER_NAMES.map((b) => ({
      user_id: userId,
      name: b.name,
      avatar_url: barberAvatar(b.name),
      phone: '+55 11 9' + Math.floor(10000000 + Math.random() * 89999999),
      specialties: b.specialties,
      commission_pct: b.commission,
      monthly_target: b.target,
      rating: b.rating,
    }));
    const { data: barbers, error: barbErr } = await supabase.from('barbers').insert(barbersToInsert).select();
    if (barbErr) throw barbErr;

    // Products
    const productsToInsert = PRODUCT_NAMES.map((p) => ({
      user_id: userId,
      name: p.name,
      category: p.category,
      cost_price: p.cost,
      sale_price: p.sale,
      stock: p.stock,
      min_stock: p.min,
      supplier: p.supplier,
      barcode: '789' + Math.floor(1000000 + Math.random() * 8999999),
    }));
    const { error: prodErr } = await supabase.from('products').insert(productsToInsert);
    if (prodErr) throw prodErr;

    // Customers
    const customersToInsert = CUSTOMER_NAMES.map((name) => {
      const visits = Math.floor(3 + Math.random() * 25);
      const spent = visits * (40 + Math.random() * 60);
      const monthsAgo = Math.floor(Math.random() * 4);
      const lastVisit = new Date();
      lastVisit.setMonth(lastVisit.getMonth() - monthsAgo);
      lastVisit.setDate(Math.floor(1 + Math.random() * 27));
      return {
        user_id: userId,
        name,
        avatar_url: avatarUrl(name),
        phone: '+55 11 9' + Math.floor(10000000 + Math.random() * 89999999),
        whatsapp: '+55 11 9' + Math.floor(10000000 + Math.random() * 89999999),
        email: name.toLowerCase().replace(/\s+/g, '.') + '@email.com',
        birth_date: `199${Math.floor(Math.random() * 9)}-0${Math.floor(1 + Math.random() * 8)}-1${Math.floor(Math.random() * 9)}`,
        total_visits: visits,
        total_spent: Math.round(spent),
        avg_ticket: Math.round(spent / visits),
        loyalty_points: visits * 10,
        cashback_balance: Math.round(spent * 0.03),
        last_visit_at: lastVisit.toISOString(),
        tags: [TAGS_POOL[Math.floor(Math.random() * TAGS_POOL.length)]],
        status: monthsAgo > 2 ? 'inactive' : visits > 15 ? 'vip' : 'active',
      };
    });
    const { data: customers, error: custErr } = await supabase.from('customers').insert(customersToInsert).select();
    if (custErr) throw custErr;

    // Appointments — spread across last 14 days and next 7 days
    if (barbers && customers && services) {
      const appointments: Record<string, unknown>[] = [];
      const statuses = ['completed', 'completed', 'completed', 'cancelled', 'confirmed', 'scheduled'];
      for (let i = -14; i <= 7; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const count = Math.floor(2 + Math.random() * 5);
        for (let j = 0; j < count; j++) {
          const barber = barbers[j % barbers.length];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const service = services[Math.floor(Math.random() * services.length)];
          const hour = 9 + j;
          const start = new Date(day);
          start.setHours(hour, j % 2 ? 30 : 0, 0, 0);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + service.duration_min);
          const status = i < 0 ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)];
          appointments.push({
            user_id: userId,
            customer_id: customer.id,
            barber_id: barber.id,
            service_id: service.id,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            status,
            price: service.price,
          });
        }
      }
      const { error: apptErr } = await supabase.from('appointments').insert(appointments);
      if (apptErr) throw apptErr;

      // Generate sales + revenue transactions for completed appointments in last 14 days
      const sales: Record<string, unknown>[] = [];
      const saleItems: Record<string, unknown>[] = [];
      const transactions: Record<string, unknown>[] = [];
      const payments: Array<'cash' | 'pix' | 'credit' | 'debit'> = ['cash', 'pix', 'credit', 'debit'];

      for (let i = -14; i <= 0; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const dailySales = Math.floor(3 + Math.random() * 4);
        for (let s = 0; s < dailySales; s++) {
          const service = services[Math.floor(Math.random() * services.length)];
          const barber = barbers[s % barbers.length];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const method = payments[Math.floor(Math.random() * payments.length)];
          const qty = 1 + (s % 2);
          const subtotal = service.price * qty;
          const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
          const total = subtotal - discount;
          const saleTime = new Date(day);
          saleTime.setHours(10 + s, Math.floor(Math.random() * 50), 0, 0);

          const tempId = crypto.randomUUID();
          sales.push({
            id: tempId,
            user_id: userId,
            customer_id: customer.id,
            subtotal,
            discount,
            total,
            payment_method: method,
            installments: method === 'credit' ? 1 + (s % 6) : 1,
            status: 'completed',
            created_at: saleTime.toISOString(),
          });
          saleItems.push({
            sale_id: tempId,
            user_id: userId,
            item_type: 'service',
            ref_id: service.id,
            name: service.name,
            unit_price: service.price,
            quantity: qty,
            barber_id: barber.id,
            created_at: saleTime.toISOString(),
          });
          transactions.push({
            user_id: userId,
            type: 'revenue',
            category: 'Serviços',
            description: `${service.name} - ${customer.name}`,
            amount: total,
            payment_method: method,
            paid: true,
            paid_at: saleTime.toISOString(),
            reference_type: 'sale',
            created_at: saleTime.toISOString(),
          });
        }
      }

      if (sales.length) {
        const { error: saleErr } = await supabase.from('sales').insert(sales);
        if (saleErr) throw saleErr;
        const { error: siErr } = await supabase.from('sale_items').insert(saleItems);
        if (siErr) throw siErr;
        const { error: txnErr } = await supabase.from('transactions').insert(transactions);
        if (txnErr) throw txnErr;
      }

      // Expenses
      const expenses = [
        { category: 'Aluguel', description: 'Aluguel do espaço', amount: 2500, day: 5 },
        { category: 'Energia', description: 'Conta de energia elétrica', amount: 480, day: 10 },
        { category: 'Fornecedores', description: 'Compra de produtos Barber Supply', amount: 1200, day: 8 },
        { category: 'Internet', description: 'Internet empresarial', amount: 120, day: 12 },
        { category: 'Marketing', description: 'Anúncios Instagram', amount: 350, day: 7 },
        { category: 'Comissões', description: 'Pagamento de comissões', amount: 2100, day: 15 },
      ];
      const expenseRows = expenses.map((e) => {
        const d = new Date();
        d.setDate(e.day);
        return {
          user_id: userId,
          type: 'expense' as const,
          category: e.category,
          description: e.description,
          amount: e.amount,
          paid: true,
          paid_at: d.toISOString(),
          created_at: d.toISOString(),
        };
      });
      const { error: expErr } = await supabase.from('transactions').insert(expenseRows);
      if (expErr) throw expErr;

      // Open cash session for today
      const openTime = new Date();
      openTime.setHours(8, 0, 0, 0);
      const { error: cashErr } = await supabase.from('cash_sessions').insert({
        user_id: userId,
        opening_amount: 200,
        status: 'open',
        opened_at: openTime.toISOString(),
      });
      if (cashErr) throw cashErr;
    }

    return { success: true, message: 'Dados de demonstração criados com sucesso!' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar dados de demonstração.';
    return { success: false, message };
  }
}
