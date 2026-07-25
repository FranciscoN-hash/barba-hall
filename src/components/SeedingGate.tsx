import { motion } from 'framer-motion';
import { Scissors, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSeedOnAuth } from '@/hooks/useSeedOnAuth';

export function SeedingGate({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const state = useSeedOnAuth(user?.id, profile?.role === 'owner');

  if (state === 'seeding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-gradient overflow-hidden relative">
        <div className="absolute inset-0 bg-gold-sheen" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex flex-col items-center gap-5 text-white"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient text-ink-950 shadow-gold">
            <Scissors className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold">Preparando sua barbearia</p>
            <p className="mt-1 text-sm text-ink-300">Criando dados de demonstração...</p>
          </div>
          <div className="flex items-center gap-2 text-gold-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <Sparkles className="h-4 w-4" />
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
