import { createClient } from '@supabase/supabase-js';

import { config, hasSupabaseAdmin } from '../config.js';

export const supabaseAdmin = hasSupabaseAdmin
  ? createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server writes.');
  }
  return supabaseAdmin;
}
