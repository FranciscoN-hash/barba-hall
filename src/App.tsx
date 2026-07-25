import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { SeedingGate } from '@/components/SeedingGate';
import { isSupabaseConfigured } from '@/lib/supabase';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Agenda = lazy(() => import('@/pages/Agenda').then((m) => ({ default: m.Agenda })));
const Clientes = lazy(() => import('@/pages/Clientes').then((m) => ({ default: m.Clientes })));
const ClienteDetalhe = lazy(() => import('@/pages/ClienteDetalhe').then((m) => ({ default: m.ClienteDetalhe })));
const Barbeiros = lazy(() => import('@/pages/Barbeiros').then((m) => ({ default: m.Barbeiros })));
const Servicos = lazy(() => import('@/pages/Servicos').then((m) => ({ default: m.Servicos })));
const Produtos = lazy(() => import('@/pages/Produtos').then((m) => ({ default: m.Produtos })));
const Vendas = lazy(() => import('@/pages/Vendas').then((m) => ({ default: m.Vendas })));
const Financeiro = lazy(() => import('@/pages/Financeiro').then((m) => ({ default: m.Financeiro })));
const Caixa = lazy(() => import('@/pages/Caixa').then((m) => ({ default: m.Caixa })));
const Marketing = lazy(() => import('@/pages/Marketing').then((m) => ({ default: m.Marketing })));
const Relatorios = lazy(() => import('@/pages/Relatorios').then((m) => ({ default: m.Relatorios })));
const Configuracoes = lazy(() => import('@/pages/Configuracoes').then((m) => ({ default: m.Configuracoes })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
          <p className="text-sm text-ink-500">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <SeedingGate>
              <AppLayout />
            </SeedingGate>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
        <Route path="/agenda" element={<Suspense fallback={<PageFallback />}><Agenda /></Suspense>} />
        <Route path="/clientes" element={<Suspense fallback={<PageFallback />}><Clientes /></Suspense>} />
        <Route path="/clientes/:id" element={<Suspense fallback={<PageFallback />}><ClienteDetalhe /></Suspense>} />
        <Route path="/barbeiros" element={<Suspense fallback={<PageFallback />}><Barbeiros /></Suspense>} />
        <Route path="/servicos" element={<Suspense fallback={<PageFallback />}><Servicos /></Suspense>} />
        <Route path="/produtos" element={<Suspense fallback={<PageFallback />}><Produtos /></Suspense>} />
        <Route path="/vendas" element={<Suspense fallback={<PageFallback />}><Vendas /></Suspense>} />
        <Route path="/financeiro" element={<Suspense fallback={<PageFallback />}><Financeiro /></Suspense>} />
        <Route path="/caixa" element={<Suspense fallback={<PageFallback />}><Caixa /></Suspense>} />
        <Route path="/marketing" element={<Suspense fallback={<PageFallback />}><Marketing /></Suspense>} />
        <Route path="/relatorios" element={<Suspense fallback={<PageFallback />}><Relatorios /></Suspense>} />
        <Route path="/configuracoes" element={<Suspense fallback={<PageFallback />}><Configuracoes /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const [client] = useState(() => queryClient);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100 p-8">
        <div className="max-w-xl rounded-3xl border border-ink-200/70 bg-white p-10 shadow-card dark:border-ink-700/70 dark:bg-ink-900">
          <h1 className="text-3xl font-bold mb-4">Configuração do Supabase ausente</h1>
          <p className="text-sm text-ink-600 dark:text-ink-300 mb-6">
            Crie um arquivo <code className="font-mono">.env</code> na raiz do projeto com as variáveis <code className="font-mono">VITE_SUPABASE_URL</code> e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
          </p>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Copie os valores do seu projeto Supabase para que a aplicação possa autenticar e carregar os dados corretamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
