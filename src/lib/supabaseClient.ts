import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanClientEnv(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let trimmed = raw.trim();
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
    lower.includes('your-anon-key')
  ) {
    return '';
  }
  return trimmed;
}

function readWindowEnv(key: string): string {
  try {
    const winEnv = typeof window !== 'undefined' ? (window as any).__ENV__ : undefined;
    return cleanClientEnv(winEnv?.[key]);
  } catch (_) {
    return '';
  }
}

// Public client configuration fallback for published/deployed bundles where build-time env vars may be absent.
// Never store or use SUPABASE_SERVICE_ROLE_KEY in frontend code.
const DEFAULT_PUBLIC_SUPABASE_URL = 'https://nrcwkebmvsqqramhgint.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_kGLWelLGwX0qgGlVYVyedQ_1egh1vAH';

// Primary configuration via literal import.meta.env reads so Vite `define` inlines them reliably in production builds
export const supabaseUrl =
  cleanClientEnv(import.meta.env.VITE_SUPABASE_URL) ||
  cleanClientEnv((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL) ||
  cleanClientEnv((import.meta as any).env?.SUPABASE_URL) ||
  readWindowEnv('VITE_SUPABASE_URL') ||
  readWindowEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  readWindowEnv('SUPABASE_URL') ||
  DEFAULT_PUBLIC_SUPABASE_URL;

export const supabaseAnonKey =
  cleanClientEnv(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  cleanClientEnv((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  cleanClientEnv((import.meta as any).env?.SUPABASE_ANON_KEY) ||
  readWindowEnv('VITE_SUPABASE_ANON_KEY') ||
  readWindowEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  readWindowEnv('SUPABASE_ANON_KEY') ||
  DEFAULT_PUBLIC_SUPABASE_ANON_KEY;

const hasValidUrl = Boolean(
  supabaseUrl &&
  /^https?:\/\/.+/i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project')
);

const hasValidKey = Boolean(
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-anon-key')
);

/**
 * Utility to check if Supabase is properly configured
 */
export const isSupabaseReady = Boolean(hasValidUrl && hasValidKey);

/**
 * Creates a non-throwing, chainable fallback Supabase stub when env vars are missing
 * (e.g. static builds or Vercel previews without env vars) to prevent blank white screens.
 */
function createSafeFallbackSupabaseClient(): SupabaseClient {
  const unconfiguredError = { message: 'Supabase environment variables are not configured.' };
  const emptyResult = { data: null, error: unconfiguredError, count: 0 };

  const createQueryBuilder = () => {
    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      or: () => builder,
      not: () => builder,
      filter: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => Promise.resolve(emptyResult),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(emptyResult).then(onFulfilled, onRejected),
    };
    return builder;
  };

  const noopChannel = {
    on: () => noopChannel,
    subscribe: () => noopChannel,
    unsubscribe: () => Promise.resolve('ok'),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: unconfiguredError }),
      signUp: async () => ({ data: { user: null, session: null }, error: unconfiguredError }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({ data: { user: null, session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => createQueryBuilder(),
    rpc: async () => emptyResult,
    channel: () => noopChannel,
    removeChannel: async () => 'ok',
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: unconfiguredError }),
        download: async () => ({ data: null, error: unconfiguredError }),
        createSignedUrl: async () => ({ data: null, error: unconfiguredError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: unconfiguredError }),
        list: async () => ({ data: [], error: unconfiguredError }),
      }),
    },
  } as unknown as SupabaseClient;
}

function initSupabaseClient(): SupabaseClient {
  if (!isSupabaseReady) {
    return createSafeFallbackSupabaseClient();
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (_) {
    return createSafeFallbackSupabaseClient();
  }
}

export const supabase: SupabaseClient = initSupabaseClient();
