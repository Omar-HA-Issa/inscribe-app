import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[supabase] Missing required env: ${name}`);
  return v;
}

const SUPABASE_URL = requiredEnv("SUPABASE_URL");
const ANON_KEY = requiredEnv("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

// Helper: avoids DOM types like RequestInfo/RequestInit
const globalFetch = (...args: Parameters<typeof fetch>) => fetch(...args);

let _admin: SupabaseClient | undefined;
export function adminClient(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: globalFetch,
      headers: { "x-app-source": "documind-backend" },
    },
  });
  return _admin;
}

let _anon: SupabaseClient | undefined;
export function anonServerClient(): SupabaseClient {
  if (_anon) return _anon;
  _anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: globalFetch,
      headers: { "x-app-source": "documind-backend" },
    },
  });
  return _anon;
}

export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: globalFetch,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-app-source": "documind-backend",
      },
    },
  });
}