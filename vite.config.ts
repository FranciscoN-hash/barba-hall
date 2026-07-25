import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // 500kb é o padrão do Rollup; o app tem picos legítimos (recharts) que
    // já ficam isolados em chunks lazy — 700kb evita alarme falso mantendo
    // o alerta útil caso algo realmente grande volte a entrar no bundle.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Separa bibliotecas de terceiros do código da aplicação: o
        // navegador cacheia o vendor separadamente do app, então deploys
        // que só mudam código próprio não invalidam o cache do vendor.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('react-router-dom') || id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts';
          }
          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'vendor-forms';
          }
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }
          return 'vendor';
        },
      },
    },
  },
});
