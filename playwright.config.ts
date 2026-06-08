import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/utils/env";

// The whole config is driven by `env` (Ch.17) and CI. Pick a target with
// TEST_ENV; baseURLs, retries, workers, and timeouts all follow from it. Run the
// dockerized Inkwell SUT first (`docker compose up -d --build --wait` in ./sut).
const isCI = !!process.env.CI;

// Remote environments are flakier (network), so allow a retry; local stays at 0
// to surface real failures immediately.
const retries = isCI ? 2 : env.name === "staging" ? 1 : 0;

export default defineConfig({
  testDir: "./src/tests",
  // Seed the database once, before everything. No test resets it itself, so read
  // tests never race a mid-run wipe.
  globalSetup: "./src/setup/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries,
  workers: isCI ? 4 : undefined,
  // A bit more headroom for slower remote targets.
  timeout: env.name === "local" ? 30_000 : 60_000,
  expect: { timeout: env.name === "local" ? 5_000 : 10_000 },
  // Stamped into the HTML report so you always know which environment ran.
  metadata: { environment: env.name, webURL: env.webURL, apiURL: env.apiURL },
  // Console "list" for humans, an HTML report (traces/screenshots) you open with
  // `npm run test:report`, and JUnit XML for CI to ingest. See Ch.6 and Ch.20.
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "api",
      testDir: "./src/tests/api",
      use: { baseURL: env.apiURL },
    },
    {
      // Logs in once and saves a storage state to disk (.auth/playwright.json).
      name: "setup",
      testDir: "./src/setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: env.webURL },
    },
    {
      name: "ui",
      testDir: "./src/tests/ui",
      // After `api` (so DB reads don't race) and `setup` (so the auth storage
      // state exists for the tests that reuse it).
      dependencies: ["api", "setup"],
      use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
    },
  ],
});
