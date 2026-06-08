/**
 * Single source of truth for environment-specific values. Everything reads URLs
 * from here (never hard-coded in tests), so pointing the suite at another
 * environment is a one-line change / env-var override.
 */
export const env = {
  /** Inkwell SPA (nginx) — the UI base URL. */
  webURL: process.env.WEB_URL ?? "http://localhost:3000",
  /** Inkwell API base, including the /api prefix. */
  apiURL: process.env.API_URL ?? "http://localhost:3001/api",
} as const;
