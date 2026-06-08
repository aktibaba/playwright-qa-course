import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/utils/env";

// One project per layer for now: a fast API project and a Chromium UI project.
// Both target the dockerized Inkwell SUT (run `docker compose up -d --build --wait`
// in ./sut first). As the course progresses this grows into multi-env projects,
// storageState auth, and sharding.
export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",

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
      use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
    },
  ],
});
