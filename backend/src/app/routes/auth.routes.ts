// src/app/routes/auth.routes.ts
import { Router } from "express";
import { anonServerClient, clientFromRequest, extractBearerToken } from "../../core/clients/supabaseClient";
import { validateString } from "../middleware/validation";
import { BadRequestError, UnauthorizedError, InternalServerError } from "../../shared/errors";
import { rateLimitMiddleware } from "../middleware/rateLimiter";
import { logger } from "../../shared/utils/logger";

const router = Router();

/**
 * POST /api/login
 * body: { email, password }
 * returns: { success, user, session: { access_token, refresh_token, expires_in } }
 */
router.post("/login", rateLimitMiddleware.auth, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError("Invalid email format.");
    }

    const sb = anonServerClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      throw new BadRequestError(error.message || "Login failed");
    }

    return res.json({
      success: true,
      user: data.user,
      session: {
        access_token: data.session?.access_token ?? null,
        refresh_token: data.session?.refresh_token ?? null,
        expires_in: data.session?.expires_in ?? null,
      }
    });
  } catch (e: any) {
    next(e);
  }
});

/**
 * POST /api/signup
 * body: { email, password }
 * returns: { success, user, session: { access_token, refresh_token, expires_in }, needs_email_confirm? }
 */
router.post("/signup", rateLimitMiddleware.auth, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError("Invalid email format.");
    }

    // Validate password strength
    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters long.");
    }

    const sb = anonServerClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      throw new BadRequestError(error.message || "Signup failed");
    }

    return res.json({
      success: true,
      user: data.user,
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      } : null,
      needs_email_confirm: !data.session,
    });
  } catch (e: any) {
    next(e);
  }
});

/**
 * POST /api/logout
 * (client-side: just delete your stored token; this is optional)
 */
router.post("/logout", rateLimitMiddleware.auth, async (_req, res, next) => {
  try {
    const sb = anonServerClient();
    await sb.auth.signOut();
    return res.json({ success: true });
  } catch (e: any) {
    next(e);
  }
});

/**
 * GET /api/me
 * Requires: Authorization: Bearer <access_token>
 * returns: { authenticated: boolean, user? }
 */
router.get("/me", async (req, res, next) => {
  try {
    // Ensure a token exists
    const bearer = extractBearerToken(req);
    if (!bearer) {
      throw new UnauthorizedError("Missing authentication token");
    }

    const sb = clientFromRequest(req);
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) {
      throw new UnauthorizedError("Invalid or expired token");
    }
    return res.json({ authenticated: true, user: data.user });
  } catch (e: any) {
    next(e);
  }
});

export default router;