import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Scissors, X, Sparkles } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/useQueries';
import { cn } from '@/lib/utils';

const GROUPS: Array<{ key: 'principal' | 'operacional' | 'gestao'; label: string }> = [
  { key: 'principal', label: 'Principal' },
  { key: 'operacional', label: 'Operacional' },
  { key: 'gestao', label: 'Gestão' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { profile } = useAuth();
  const { data: settings } = useCompanySettings();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (profile && item.roles.includes(profile.role)));
  const companyName = settings?.name || 'Barba Hall';

  useEffect(() => {
    document.title = companyName;
  }, [companyName]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 flex flex-col border-r border-ink-200/60 dark:border-ink-800 bg-white dark:bg-ink-900 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-ink-200/60 dark:border-ink-800">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={companyName} className="h-full w-full object-contain" />
              ) : (
                <Scissors className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white leading-none truncate max-w-[140px]">{companyName}</p>
              <p className="text-[10px] text-gold-500 tracking-widest uppercase mt-0.5">ERP Premium</p>
            </div>
          </NavLink>
          <button onClick={onClose} className="lg:hidden text-ink-400 hover:text-ink-700 dark:hover:text-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
          {GROUPS.map((group) => (
            <div key={group.key}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{group.label}</p>
              <div className="space-y-0.5">
                {visibleItems.filter((n) => n.group === group.key).map((item) => {
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'text-ink-900 dark:text-white'
                          : 'text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:bg-ink-50 dark:hover:bg-ink-800',
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-lg bg-ink-100 dark:bg-ink-800"
                          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        />
                      )}
                      {active && (
                        <motion.span
                          layoutId="sidebar-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gold-gradient"
                        />
                      )}
                      <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', active && 'text-gold-500')} />
                      <span className="relative">{item.label}</span>
                      {item.badge && (
                        <span className="relative ml-auto rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-semibold text-gold-600 dark:text-gold-400">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-ink-200/60 dark:border-ink-800">
          <div className="rounded-xl bg-gold-sheen border border-gold-400/20 p-3">
            <div className="flex items-center gap-2 text-gold-600 dark:text-gold-400">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold">Barba Hall Pro</p>
            </div>
            <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">Sistema premium para barbearias.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
