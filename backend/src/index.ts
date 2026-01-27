console.log("[startup] Node.js starting...");
console.log("[startup] PORT:", process.env.PORT);

import "dotenv/config";

console.log("[startup] dotenv loaded");
console.log("[startup] Env check - SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("[startup] Env check - SUPABASE_ANON_KEY:", !!process.env.SUPABASE_ANON_KEY);
console.log("[startup] Env check - SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("[startup] Env check - OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);

import app from "./server";
import { logger } from "./shared/utils/logger";

console.log("[startup] Server module loaded successfully");

const PORT = process.env.PORT || 3001;

// Bind to 0.0.0.0 for container environments (Railway, Docker)
app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});
