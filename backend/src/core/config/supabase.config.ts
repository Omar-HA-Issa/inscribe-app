import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, userClient } from "../clients/supabaseClient";

/** Backward-compatible: returns the service-role client (bypasses RLS). */
let serviceClient: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!serviceClient) serviceClient = adminClient();
  return serviceClient;
}

/** Backward-compatible: returns a user-scoped client (RLS applies). */
export function supabaseForUser(jwt: string): SupabaseClient {
  return userClient(jwt); // anon key + Authorization Bearer
}

/** Backward-compatible: proxy to the admin client for direct call styles. */
export const supabaseConfig = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
