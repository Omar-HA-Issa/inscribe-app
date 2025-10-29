import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Missing Supabase environment variables");

  serviceClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return serviceClient;
}

export function supabaseForUser(jwt: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");

  return createClient(url, "user-scope", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
