import { SupabaseClient } from '@supabase/supabase-js';
import {
  supabase as primaryClient,
  isSupabaseReady,
  supabaseUrl,
  supabaseAnonKey,
} from './supabaseClient.js';

export const isSupabaseConfigured = isSupabaseReady;
export const supabase: SupabaseClient | null = isSupabaseReady ? primaryClient : null;
export { supabaseUrl, supabaseAnonKey, isSupabaseReady };

/**
 * Standard fetch helper with automatic Supabase Auth Bearer token injection.
 * Used for custom API routes in server.ts that require authentication.
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = '';
  if (isSupabaseReady && primaryClient) {
    try {
      const { data: { session } } = await primaryClient.auth.getSession();
      token = session?.access_token || '';
    } catch (_) {}
  }

  if (!token) {
    try {
      token = localStorage.getItem('boardbuddy_auth_token') || '';
    } catch (_) {}
  }

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!headers['Accept']) {
    headers['Accept'] = 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
