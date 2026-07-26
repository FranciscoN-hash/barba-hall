import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Package,
  ShoppingCart,
  Wallet,
  DollarSign,
  Megaphone,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: 'principal' | 'operacional' | 'gestao';
  badge?: string;
  // Se ausente, o item aparece para qualquer papel. Financeiro/Relatórios
  // mostram faturamento consolidado da barbearia — restrito a quem
  // administra o negócio, não a quem só opera o dia a dia.
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'principal' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, group: 'principal' },
  { to: '/clientes', label: 'Clientes', icon: Users, group: 'principal' },
  { to: '/barbeiros', label: 'Barbeiros', icon: Scissors, group: 'operacional' },
  { to: '/servicos', label: 'Serviços', icon: Sparkles, group: 'operacional' },
  { to: '/produtos', label: 'Produtos', icon: Package, group: 'operacional' },
  { to: '/vendas', label: 'Vendas (PDV)', icon: ShoppingCart, group: 'operacional' },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, group: 'gestao', roles: ['owner', 'manager'] },
  { to: '/caixa', label: 'Caixa', icon: DollarSign, group: 'gestao' },
  { to: '/marketing', label: 'Marketing', icon: Megaphone, group: 'gestao' },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, group: 'gestao', roles: ['owner', 'manager'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, group: 'gestao' },
];
