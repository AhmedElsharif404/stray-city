import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function publicMediaUrl(bucket: string, path: string): string {
  if (/^https?:\/\//.test(path) || !supabase) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function authorizedMediaUrl(path: string): Promise<string> {
  if (/^(https?:|blob:|data:)/.test(path) || !supabase) return path;
  const { data, error } = await supabase.storage.from('user-media').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
