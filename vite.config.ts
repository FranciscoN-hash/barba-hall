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
    // Prioriza corretude sobre estética de bundle: nunca mais separar uma
    // lib que usa React.createContext do próprio React em chunks
    // diferentes (foi exatamente isso que quebrou a build de produção —
    // funcionava no "npm run dev" porque o dev server não faz esse
    // split, só apareceu ao vivo na Vercel). 1200kb evita alarme falso
    // sem incentivar a fatiar de novo sem necessidade.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Seguro: nenhuma dessas duas depende de React em nenhum nível,
          // então não existe risco de ordem de carregamento.
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }

          // Tudo que usa React (react, react-dom, react-router,
          // framer-motion, @tanstack/react-query, react-hook-form, zod,
          // recharts/d3) fica junto, na ordem que o próprio Rollup
          // calcula — nunca mais separado manualmente por heurística.
          return 'vendor';
        },
      },
    },
  },
});
