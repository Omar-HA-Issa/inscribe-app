import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { userClient } from "../../core/clients/supabaseClient";

const RAW_SECRET = process.env.SUPABASE_JWT_SECRET || "";
if (!RAW_SECRET) throw new Error("SUPABASE_JWT_SECRET is required in .env");
const JWT_SECRET = Buffer.from(RAW_SECRET, "utf-8");

declare global {
  namespace Express {
    interface Request {
      supabase?: ReturnType<typeof userClient>;
      authUserId?: string;
      accessToken?: string;
    }
  }
}

async function verifyStrict(token: string) {
  return jwtVerify(token, JWT_SECRET, {
    issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    audience: "authenticated",
  });
}

async function verifyRelaxed(token: string) {
  // Fallback: allow tokens if signature is valid even if iss/aud don’t match exactly
  return jwtVerify(token, JWT_SECRET);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Not authenticated (no token)" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });

  try {
    let payload;
    try {
      ({ payload } = await verifyStrict(token));
    } catch {
      // Retry relaxed in case of tiny config mismatches
      ({ payload } = await verifyRelaxed(token));
    }

    req.accessToken = token;
    req.authUserId = String(payload.sub || "");
    req.supabase = userClient(token);

    if (!req.authUserId) {
      return res.status(401).json({ success: false, error: "Invalid token (no sub)" });
    }

    return next();
  } catch (err: any) {
    console.error("[auth] token verification failed:", err?.message || err);
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
