import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { seedDemoData } from '@/lib/seed';

type SeededState = 'idle' | 'seeding' | 'done' | 'error';

export function useSeedOnAuth(userId: string | undefined, isOwner: boolean) {
  const [state, setState] = useState<SeededState>('idle');

  useEffect(() => {
    if (!userId) return;

    // Membros de equipe (barbeiro/gerente/caixa) nunca disparam seed —
    // isso é uma ação de onboarding do proprietário da conta. Um membro
    // entra direto na conta que já existe.
    if (!isOwner) {
      setState('done');
      return;
    }

    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('barbers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if ((count ?? 0) === 0) {
        if (cancelled) return;
        setState('seeding');
        const res = await seedDemoData(userId);
        if (cancelled) return;
        setState(res.success ? 'done' : 'error');
      } else {
        setState('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isOwner]);

  return state;
}
