import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // تقسيم الكود لملفات أصغر
      rollupOptions: {
        output: {
          manualChunks: {
            // المكتبات الكبيرة في chunks منفصلة
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-openai': ['openai'],
          }
        }
      },
      // رفع حد التحذير (اختياري)
      chunkSizeWarningLimit: 600,
      // تسريع البناء
      sourcemap: false,
      minify: 'esbuild', // أسرع من terser
    },
    // تحسين التطوير
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js']
    }
  };
});
