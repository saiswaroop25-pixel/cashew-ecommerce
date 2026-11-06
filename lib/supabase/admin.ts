import "server-only";
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;

/**
 * Supabase client with the SERVICE ROLE key: it bypasses all access rules, so it must only ever be used
 * in server code that has already confirmed the caller is an admin. `server-only` makes the build fail
 * if this file is ever imported from browser code, so the key cannot leak into the client bundle.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
