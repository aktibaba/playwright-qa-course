---
title: "Setup & Your First UI + API Tests (Playwright + TypeScript, Ch.2)"
description: "Install Playwright and TypeScript, point them at a real dockerized app, and write your first UI and API tests — then hit two real bugs that teach why structure matters."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Setup & Your First UI + API Tests

In [Chapter 1](https://github.com/aktibaba/playwright-qa-course) we argued that
automation fails from a lack of *structure*, not a lack of tooling — and we met
**Inkwell**, the dockerized app we test against. Now we install Playwright +
TypeScript and write our first **UI** and **API** tests, deliberately simple.

We'll also hit **two real bugs** along the way. I'm leaving them in on purpose —
they're the exact problems the framework we build later is designed to prevent.

> Code for this chapter is tagged `ch-02` in the repo:
> **https://github.com/aktibaba/playwright-qa-course**

## Before you start

Make sure Inkwell is running (from Chapter 1):

```bash
cd sut
docker compose up -d --build --wait   # web :3000, api :3001/api
```

## Install Playwright + TypeScript

From the repo root:

```bash
npm install -D @playwright/test typescript @types/node
npx playwright install chromium
```

That's it — Playwright bundles its own test runner, assertion library, and
TypeScript support. No extra config to make `.ts` test files work.

## A minimal config — not a framework yet

Two small files keep us honest from day one. First, **never hard-code URLs in
tests** — put them in one place:

```ts
// src/utils/env.ts
export const env = {
  /** Inkwell SPA (nginx) — the UI base URL. */
  webURL: process.env.WEB_URL ?? "http://localhost:3000",
  /** Inkwell API base, including the /api prefix. */
  apiURL: process.env.API_URL ?? "http://localhost:3001/api",
} as const;
```

Then the Playwright config. We split tests into **two projects** — a fast `api`
project and a Chromium `ui` project — because API tests need no browser and should
run in milliseconds:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/utils/env";

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  reporter: "list",
  use: { trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "api", testDir: "./src/tests/api", use: { baseURL: env.apiURL } },
    {
      name: "ui",
      testDir: "./src/tests/ui",
      use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
    },
  ],
});
```

A short `tsconfig.json` lets us import helpers as `@utils/...` instead of long
relative paths — Playwright reads these path aliases automatically:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@utils/*": ["src/utils/*"] }
  },
  "include": ["src", "playwright.config.ts"]
}
```

## Your first UI test

Inkwell uses a **HashRouter**, so the pathname is always `/` and direct
navigation (`/#/login`) is stable — great for tests. We assert the brand renders
and that we can reach the login form:

```ts
// src/tests/ui/home.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inkwell home page", () => {
  test("renders the brand and auth links", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Inkwell");
    // navbar AND footer both carry an "inkwell" link, so target the unique <h1>.
    await expect(page.getByRole("heading", { name: "inkwell" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("navigates to the login page", async ({ page }) => {
    await page.goto("/#/login");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });
});
```

Notice we lean on **role-based locators** (`getByRole`) instead of CSS selectors —
they're resilient and they assert accessibility for free. More on that in Ch.3.

## Your first API test — and bug #1

Inkwell ships a test-only `POST /api/test/reset` that drops, recreates, and
reseeds the database. Our API tests prove the API is up and seeding is
deterministic:

```ts
// src/tests/api/smoke.spec.ts
import { test, expect } from "@playwright/test";
import { env } from "@utils/env";

test("reset returns known seed data", async ({ request }) => {
  const res = await request.post(`${env.apiURL}/test/reset`);
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body.article).toBe("welcome-to-inkwell");
  expect(body.users.map((u: { username: string }) => u.username)).toContain(
    "playwright",
  );
});
```

The first time I wrote this, I set the `api` project's `baseURL` to
`http://localhost:3001/api` and called `request.post("/test/reset")`. **It 404'd.**

Here's the trap: Playwright resolves a relative URL with `new URL(path, baseURL)`,
and a path that **starts with `/`** replaces the *entire* path — so
`/test/reset` against base `.../api` becomes `http://localhost:3001/test/reset`,
silently dropping the `/api` prefix. The fix used above is to build the full URL
from `env.apiURL` explicitly. (Later we wrap this in an `api` fixture so no test
has to think about it.)

## Bug #2: parallel tests sharing one database

Add two more API tests — checking `/tags` and logging a seeded user in — and run
everything. One test **fails intermittently**: login returns `false`.

Why? `fullyParallel` spreads tests across workers, and **every** test that calls
`/test/reset` is dropping and recreating *the whole schema*. While the login test
queries the users table, another test's reset has just wiped it. Classic shared-
state race.

For a suite that all hits one database, the honest fix is to **stop racing**: run
the API tests **serially** and reset **once** up front.

```ts
test.describe.configure({ mode: "serial" });

test.describe("Inkwell API smoke", () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${env.apiURL}/test/reset`);
    expect(res.ok()).toBeTruthy();
  });

  test("seeded user can log in and gets a token", async ({ request }) => {
    const res = await request.post(`${env.apiURL}/users/login`, {
      data: { user: { email: "playwright@test.io", password: "Password123!" } },
    });
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.token).toBeTruthy();
  });
});
```

## Run it

```bash
npx playwright test
```

```
Running 5 tests using 3 workers
  ✓  [api] reset returns known seed data
  ✓  [api] tags endpoint responds
  ✓  [api] seeded user can log in and gets a token
  ✓  [ui]  renders the brand and auth links
  ✓  [ui]  navigates to the login page
  5 passed (1.4s)
```

Green across the board, UI and API, against a real app.

## What still smells

Look back at those tests and you can already see the rot starting:

- The email/password `playwright@test.io` / `Password123!` is **hard-coded** and
  will be copy-pasted into every future test.
- The login *steps* live inside a test instead of behind a name like
  `loginAs(user)`.
- Serial mode is a blunt instrument — we slowed the **whole** suite to dodge a
  data race, instead of giving each test its **own** isolated data.

Those three smells are exactly what **Page Objects**, **fixtures**, and
**API-driven test data** fix — and that's where the course goes next.

## Next up

**Chapter 3 — Locators & web-first assertions:** why `getByRole` beats CSS, how
Playwright's auto-waiting assertions kill flakiness, and the locator habits the
rest of the framework is built on. Tag: `ch-03`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me in the comments which of the two bugs above bit you first.
