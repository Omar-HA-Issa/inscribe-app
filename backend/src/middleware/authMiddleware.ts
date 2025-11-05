import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { userClient } from "../lib/supabase";

// ✅ Use Buffer.from instead of TextEncoder
const JWT_SECRET = Buffer.from(process.env.SUPABASE_JWT_SECRET || '');

if (!process.env.SUPABASE_JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET is required in .env file');
}

console.log('✅ JWT Secret configured for token verification');

declare global {
  namespace Express {
    interface Request {
      supabase?: ReturnType<typeof userClient>;
      authUserId?: string;
      accessToken?: string;
    }
  }
}

/**
 * Strict: requires a valid Bearer token in Authorization header
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });

    req.accessToken = token;
    req.authUserId = String(payload.sub);
    req.supabase = userClient(token);
    next();
  } catch (err: any) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}