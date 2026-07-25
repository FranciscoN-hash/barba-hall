import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Search, Sun, Moon, LogOut, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const blurRef = useRef<number | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const onBlur = () => {
    blurRef.current = window.setTimeout(() => setFocused(false), 120);
  };
  const onFocus = () => {
    if (blurRef.current) clearTimeout(blurRef.current);
    setFocused(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-ink-200/60 dark:border-ink-800">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onMenu}
          className="lg:hidden rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            id="global-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Buscar... (Ctrl+K)"
            className="w-full rounded-lg bg-ink-100/80 dark:bg-ink-800/80 pl-9 pr-12 py-2 text-sm text-ink-900 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40 border border-transparent focus:border-gold-400/30"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-ink-300 dark:border-ink-600 px-1.5 py-0.5 text-[10px] text-ink-400">
            ⌘K
          </kbd>
          <AnimatePresence>
            {focused && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full mt-2 w-full glass-strong rounded-xl shadow-elevated p-1.5 z-50"
              >
                {results.map((r) => (
                  <button
                    key={r.to}
                    onClick={() => {
                      navigate(r.to);
                      setQuery('');
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  >
                    <r.icon className="h-4 w-4 text-ink-400" />
                    {r.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold-400 ring-2 ring-white dark:ring-ink-900" />
          </button>
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 ml-1 border-l border-ink-200 dark:border-ink-700">
            <Avatar src={null} name={profile?.full_name ?? 'User'} size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-ink-900 dark:text-white leading-none max-w-[120px] truncate">
                {profile?.full_name ?? 'Usuário'}
              </p>
              <p className="text-[11px] text-ink-400 capitalize mt-0.5">{profile?.role ?? 'owner'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6')}>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
