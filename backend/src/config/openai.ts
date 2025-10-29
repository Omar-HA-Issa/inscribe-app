import OpenAI from "openai";

/**
 * Centralized, validated OpenAI singleton.
 * Ensures the key is read after dotenv and trims stray whitespace.
 */
const raw = process.env.OPENAI_API_KEY ?? "";
const OPENAI_API_KEY = raw.trim();

if (!OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing. Ensure `.env` is in the backend root and that `import 'dotenv/config'` is the FIRST import in your entry file."
  );
}

if (!/^sk-(proj|live)-/.test(OPENAI_API_KEY)) {
  console.warn(
    "⚠️ OPENAI_API_KEY doesn't look like a current project/live key (sk-proj- / sk-live-). Double-check the dashboard."
  );
}

export const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
