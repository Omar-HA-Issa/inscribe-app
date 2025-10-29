import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[supabase] Missing required env: ${name}`);
  return v;
}

let _client: SupabaseClient | undefined;


export default function supabase(): SupabaseClient {
  if (_client) return _client;

  const SUPABASE_URL = requiredEnv("SUPABASE_URL");
  const SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  _client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (...args) => fetch(...args),
      headers: { "x-app-source": "documind-backend" },
    },
  });

  return _client;
}
