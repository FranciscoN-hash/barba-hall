import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Mail, Lock, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input, Field } from '@/components/ui/Input';

const FEATURES = [
  'Agenda inteligente com confirmação automática',
  'CRM completo com fidelidade e cashback',
  'PDV rápido com PIX, cartão e dinheiro',
  'Financeiro, estoque e relatórios em tempo real',
];

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { push } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) push({ tone: 'error', title: 'Erro ao entrar', description: error });
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) push({ tone: 'error', title: 'Erro ao cadastrar', description: error });
      else push({ tone: 'success', title: 'Conta criada!', description: 'Bem-vindo ao Barba Hall ERP.' });
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setMode('signup');
    setEmail(`barbershop${Math.floor(Math.random() * 9999)}@demo.com`);
    setPassword('demo1234');
    setFullName('Dono da Barbearia');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-ink-gradient overflow-hidden">
        <div className="absolute inset-0 bg-gold-sheen" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-gold-400/5 blur-3xl" />
        <div className="relative flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-xl font-bold tracking-tight">Barba Hall</p>
              <p className="text-xs text-gold-300 tracking-widest uppercase">ERP Premium</p>
            </div>
          </div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-bold leading-tight text-balance"
            >
              A gestão da sua barbearia, elevada ao próximo nível.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-ink-300 leading-relaxed"
            >
              Tudo em um só lugar: agenda, clientes, financeiro, estoque e vendas.
              Pensado para barbearias que querem crescer.
            </motion.p>
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-ink-200"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/20 text-gold-300">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  {f}
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-ink-400">© 2026 Barba Hall ERP. Feito no Brasil.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50 dark:bg-ink-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink-900 dark:text-white">Barba Hall</p>
              <p className="text-[10px] text-gold-500 tracking-widest uppercase">ERP Premium</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? 'Acesse o painel da sua barbearia.' : 'Comece a gerenciar em minutos.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <Field label="Nome completo" required>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <Input
                    className="pl-9"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </Field>
            )}
            <Field label="E-mail" required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <Input
                  type="email"
                  className="pl-9"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </Field>
            <Field label="Senha" required hint={mode === 'signup' ? 'Mínimo 6 caracteres' : undefined}>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <Input
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? (
              <>
                Não tem conta?{' '}
                <button onClick={() => setMode('signup')} className="font-semibold text-gold-600 dark:text-gold-400 hover:underline">
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button onClick={() => setMode('login')} className="font-semibold text-gold-600 dark:text-gold-400 hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 p-3 text-center">
            <p className="text-xs text-ink-400">Quer explorar com dados de exemplo?</p>
            <button onClick={fillDemo} className="mt-1 text-sm font-medium text-gold-600 dark:text-gold-400 hover:underline">
              Preencher conta demonstrativa
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
