import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  accent?: 'gold' | 'success' | 'danger' | 'neutral';
  delay?: number;
}) {
  const accentMap = {
    gold: 'bg-gold-100 text-gold-600 dark:bg-gold-400/15 dark:text-gold-300',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    neutral: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  };
  const positive = (delta ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      <Card className="p-5 hover:shadow-elevated transition-shadow">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accentMap[accent ?? 'neutral'])}>
            <Icon className="h-5 w-5" />
          </div>
          {delta !== undefined && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5',
              positive ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
            )}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        <p className="mt-4 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{label}</p>
        {deltaLabel && <p className="mt-1 text-xs text-ink-400">{deltaLabel}</p>}
      </Card>
    </motion.div>
  );
}
