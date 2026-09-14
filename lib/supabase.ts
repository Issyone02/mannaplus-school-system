import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fail loudly instead of silently downgrading to the anon key. Server-side
  // code that calls this expects elevated privileges (e.g. bypassing RLS for
  // admin operations); running with the anon key instead would either fail
  // in a confusing way or, worse, mask a real misconfiguration.
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to fall back to the anon key for server-side operations.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
};