/**
 * Environment configuration. The suite is multi-environment: pick a named target
 * with TEST_ENV (default "local"), and override either URL individually with
 * WEB_URL / API_URL. Tests only ever read `env` — never process.env directly.
 */
export type EnvName = "local" | "ci" | "staging";

interface EnvConfig {
  webURL: string;
  apiURL: string;
}

const ENVIRONMENTS: Record<EnvName, EnvConfig> = {
  local: { webURL: "http://localhost:3000", apiURL: "http://localhost:3001/api" },
  ci: { webURL: "http://localhost:3000", apiURL: "http://localhost:3001/api" },
  // Illustrative — point at a real deployment when you have one.
  staging: {
    webURL: "https://inkwell-staging.example.com",
    apiURL: "https://inkwell-staging.example.com/api",
  },
};

const name = (process.env.TEST_ENV as EnvName) || "local";
const base = ENVIRONMENTS[name] ?? ENVIRONMENTS.local;

export const env = {
  /** The active environment name. */
  name,
  /** Inkwell SPA (nginx) — the UI base URL. */
  webURL: process.env.WEB_URL ?? base.webURL,
  /** Inkwell API base, including the /api prefix. */
  apiURL: process.env.API_URL ?? base.apiURL,
} as const;
