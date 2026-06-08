import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/utils/env";

// One project per layer for now: a fast API project and a Chromium UI project.
// Both target the dockerized Inkwell SUT (run `docker compose up -d --build --wait`
// in ./sut first). As the course progresses this grows into multi-env projects,
// storageState auth, and sharding.
export default defineConfig({
  testDir: "./src/tests",
  // Seed the database once, before everything. No test resets it itself, so read
  // tests never race a mid-run wipe.
  globalSetup: "./src/setup/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Console "list" output plus an HTML report (with traces/screenshots) on every
  // run — open it with `npm run test:report`. See Chapter 6 on debugging.
  reporter: [["list"], ["html", { open: "never" }]],

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
      name: "ui",
      testDir: "./src/tests/ui",
      // Run AFTER the api project so the API's database resets never race a UI
      // read mid-test (e.g. logging a seeded user in). This is a stopgap — real
      // per-test data isolation arrives later in the course.
      dependencies: ["api"],
      use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
    },
  ],
});
