import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";

type DB = any;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[supabase] Missing required env: ${name}`);
  return v;
}

const SUPABASE_URL = requiredEnv("SUPABASE_URL");
const ANON_KEY = requiredEnv("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

function ensureValidSupabaseUrl(url: string) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error(
      `[supabase] SUPABASE_URL looks wrong: ${url} (expected https://<project-ref>.supabase.co)`
    );
  }
}
ensureValidSupabaseUrl(SUPABASE_URL);

const globalFetch = (...args: Parameters<typeof fetch>) => fetch(...args);

let _admin: SupabaseClient<DB> | undefined;
let _anon: SupabaseClient<DB> | undefined;

/**
 * Admin client (bypasses RLS). Use sparingly for trusted server jobs only.
 */
export function adminClient(): SupabaseClient<DB> {
  if (_admin) return _admin;
  _admin = createClient<DB>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: globalFetch,
      headers: { "x-app-source": "documind-backend" },
    },
  });
  return _admin;
}

/**
 * Anonymous server client (uses anon key). Good for public tables or RPCs
 * that don't require user identity. RLS applies as "anon".
 */
export function anonServerClient(): SupabaseClient<DB> {
  if (_anon) return _anon;
  _anon = createClient<DB>(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: globalFetch,
      headers: { "x-app-source": "documind-backend" },
    },
  });
  return _anon;
}

/**
 * User-scoped client. Pass an access token and RLS will evaluate as that user.
 * This is the default inside API routes after login.
 */
export function userClient(accessToken: string): SupabaseClient<DB> {
  return createClient<DB>(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: globalFetch,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-app-source": "documind-backend",
      },
    },
  });
}

/**
 * Convenience: build a user client from an Express request.
 * Looks for a Bearer token first, then common Supabase auth cookies.
 */
export function clientFromRequest(req: Request): SupabaseClient<DB> {
  const token = extractBearerToken(req) ?? extractCookieToken(req);
  return token ? userClient(token) : anonServerClient();
}

// ---- Token helpers ----
export function extractBearerToken(req: Request): string | null {
  const auth = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export function extractCookieToken(req: Request): string | null {
  const cookies: Record<string, any> =
    (req as any).cookies ?? {};

  const direct = cookies["sb-access-token"];
  if (typeof direct === "string" && direct.length > 10) return direct;

  const packed = cookies["supabase-auth-token"];
  if (typeof packed === "string") {
    try {
      const parsed = JSON.parse(packed);
      const last = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
      const token = last?.access_token;
      if (typeof token === "string" && token.length > 10) return token;
    } catch {
    }
  }
  return null;
}
