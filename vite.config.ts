import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';

function cleanViteEnv(val?: string): string {
  if (!val) return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower.includes('your-project') ||
    lower.includes('your-anon-key') ||
    lower.includes('your-gemini-api-key')
  ) {
    return '';
  }
  return trimmed;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl =
    cleanViteEnv(env.VITE_SUPABASE_URL) ||
    cleanViteEnv(env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanViteEnv(env.SUPABASE_URL) ||
    cleanViteEnv(process.env.VITE_SUPABASE_URL) ||
    cleanViteEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanViteEnv(process.env.SUPABASE_URL);

  const supabaseAnonKey =
    cleanViteEnv(env.VITE_SUPABASE_ANON_KEY) ||
    cleanViteEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanViteEnv(env.SUPABASE_ANON_KEY) ||
    cleanViteEnv(process.env.VITE_SUPABASE_ANON_KEY) ||
    cleanViteEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanViteEnv(process.env.SUPABASE_ANON_KEY);

  const geminiApiKey =
    cleanViteEnv(env.VITE_GEMINI_API_KEY) ||
    cleanViteEnv(env.GEMINI_API_KEY) ||
    cleanViteEnv(process.env.VITE_GEMINI_API_KEY) ||
    cleanViteEnv(process.env.GEMINI_API_KEY);

  const superAdminEmail =
    cleanViteEnv(env.VITE_INITIAL_SUPERADMIN_EMAIL) ||
    cleanViteEnv(env.INITIAL_SUPERADMIN_EMAIL) ||
    cleanViteEnv(process.env.VITE_INITIAL_SUPERADMIN_EMAIL) ||
    cleanViteEnv(process.env.INITIAL_SUPERADMIN_EMAIL) ||
    'boardbuddy.team@gmail.com';

  const apkDownloadUrl =
    cleanViteEnv(env.VITE_APK_DOWNLOAD_URL) ||
    cleanViteEnv(env.APK_DOWNLOAD_URL) ||
    cleanViteEnv(process.env.VITE_APK_DOWNLOAD_URL) ||
    cleanViteEnv(process.env.APK_DOWNLOAD_URL) ||
    '/boardbuddy.apk';

  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      alias: {
        '@': process.cwd(),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'framer-motion',
        '@supabase/supabase-js',
      ],
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'import.meta.env.VITE_INITIAL_SUPERADMIN_EMAIL': JSON.stringify(superAdminEmail),
      'import.meta.env.VITE_APK_DOWNLOAD_URL': JSON.stringify(apkDownloadUrl),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
