// src/app/routes/auth.routes.ts
import { Router } from "express";
import { anonServerClient, clientFromRequest, extractBearerToken } from "../../core/clients/supabaseClient";

const router = Router();

/**
 * POST /api/login
 * body: { email, password }
 * returns: { success, user, session: { access_token, refresh_token, expires_in } }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const sb = anonServerClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ success: false, error: error.message });

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
    console.error("[auth] login error:", e);
    return res.status(500).json({ success: false, error: e.message ?? "Internal error" });
  }
});

/**
 * POST /api/signup
 * body: { email, password }
 * returns: { success, user, session: { access_token, refresh_token, expires_in }, needs_email_confirm? }
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const sb = anonServerClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return res.status(400).json({ success: false, error: error.message });

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
    console.error("[auth] signup error:", e);
    return res.status(500).json({ success: false, error: e.message ?? "Internal error" });
  }
});

/**
 * POST /api/logout
 * (client-side: just delete your stored token; this is optional)
 */
router.post("/logout", async (_req, res) => {
  try {
    const sb = anonServerClient();
    await sb.auth.signOut();
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[auth] logout error:", e);
    return res.status(500).json({ success: false, error: e.message ?? "Internal error" });
  }
});

/**
 * GET /api/me
 * Requires: Authorization: Bearer <access_token>
 * returns: { authenticated: boolean, user? }
 */
router.get("/me", async (req, res) => {
  try {
    // Ensure a token exists
    const bearer = extractBearerToken(req);
    if (!bearer) return res.status(401).json({ authenticated: false });

    const sb = clientFromRequest(req);
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) {
      return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: data.user });
  } catch (e: any) {
    console.error("[auth] me error:", e);
    return res.status(500).json({ authenticated: false, error: e.message ?? "Internal error" });
  }
});

export default router;