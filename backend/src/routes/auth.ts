import { Router } from "express";
import { z } from "zod";
import { anonServerClient, adminClient } from "../lib/supabase";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const creds = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post("/signup", async (req, res) => {
  const p = creds.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid payload" });

  const { data, error } = await anonServerClient().auth.signUp(p.data);
  if (error) return res.status(400).json({ error: error.message });

  res.json({
    user: data.user,
    session: data.session,
    needs_email_confirm: !data.session
  });
});

router.post("/login", async (req, res) => {
  const p = creds.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid payload" });

  const { data, error } = await anonServerClient().auth.signInWithPassword(p.data);
  if (error || !data.session) return res.status(401).json({ error: "Invalid credentials" });

  // ✅ Return session in response body (not cookie!)
  res.json({
    user: data.user,
    session: data.session
  });
});

router.post("/logout", async (_req, res) => {
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const { data: { user }, error } = await anonServerClient().auth.getUser(req.accessToken!);
    if (error || !user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const emailSchema = z.object({ email: z.string().email() });
  const p = emailSchema.safeParse(req.body);

  if (!p.success) {
    return res.status(400).json({ error: "Invalid email" });
  }

  try {
    const { error } = await anonServerClient().auth.resetPasswordForEmail(p.data.email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
    }

    res.json({
      success: true,
      message: "If that email exists, we've sent a password reset link"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

router.post("/reset-password", requireAuth, async (req, res) => {
  const passwordSchema = z.object({ password: z.string().min(8) });
  const p = passwordSchema.safeParse(req.body);

  if (!p.success) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    // Get the user ID from the authenticated request
    const userId = req.authUserId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Use admin client to update user password
    const { data, error } = await adminClient().auth.admin.updateUserById(
      userId,
      { password: p.data.password }
    );

    if (error) {
      console.error("Password update error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;