---
title: "Setup & Your First UI + API Tests (Playwright + TypeScript, Ch.2)"
description: "Install Playwright and TypeScript from scratch, understand each config option, and write your first UI and API tests — then hit two real bugs that teach why structure matters. Beginner-friendly, step by step."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Setup & Your First UI + API Tests

In [Chapter 1](https://github.com/aktibaba/playwright-qa-course) we argued that
automation fails from a lack of *structure*, not a lack of tooling — and we met
**Inkwell**, the app we test against. Now we install everything from scratch and
write our first **UI** and **API** tests, kept deliberately simple.

We'll also hit **two real bugs** along the way. I'm leaving them in on purpose —
they're the exact problems the framework we build later is designed to prevent. If a
step doesn't work for you, don't worry: the finished code is in the repo at tag
`ch-02`.

## Before you start

Make sure Inkwell is running (from Chapter 1). From the repo's `sut/` folder:

```bash
cd sut
docker compose up -d --build --wait   # web on :3000, api on :3001/api
```

If `http://localhost:3000` shows the app in your browser, you're ready.

## Install Playwright + TypeScript

From the **repo root** (not `sut/`):

```bash
npm install -D @playwright/test typescript @types/node
npx playwright install chromium
```

What each piece does:

- `npm install -D …` — `npm` is Node's package manager; `-D` saves these as
  *dev dependencies* (tools you need to develop/test, not to run the app).
- `@playwright/test` — Playwright itself, including its **test runner** and
  `expect` assertions.
- `typescript` + `@types/node` — the TypeScript compiler and the type definitions for
  Node, so your editor can autocomplete and catch mistakes.
- `npx playwright install chromium` — downloads a copy of the Chromium browser for
  Playwright to drive. (`npx` runs a tool without installing it globally.)

That's genuinely it — Playwright runs `.ts` test files out of the box, no extra build
step.

## A minimal config — not a framework yet

Two small files keep us honest from day one.

**First rule of test automation: never hard-code values like URLs in tests.** Put
them in one place so you change them once:

```ts
// src/utils/env.ts
export const env = {
  /** The web UI base URL. */
  webURL: process.env.WEB_URL ?? "http://localhost:3000",
  /** The API base URL, including the /api prefix. */
  apiURL: process.env.API_URL ?? "http://localhost:3001/api",
} as const;
```

`process.env.WEB_URL ?? "…"` reads an environment variable if you set one, otherwise
falls back to localhost. (`??` means "use the left side unless it's null/undefined.")
So the default just works locally, and CI can override it.

Next, Playwright's config file. This is where you tell Playwright how to run:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/utils/env";

export default defineConfig({
  testDir: "./src/tests",          // where your test files live
  fullyParallel: true,             // run tests at the same time (faster)
  reporter: "list",                // print a readable list of results
  use: { trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    // A "project" is a named way to run tests. We split by layer:
    { name: "api", testDir: "./src/tests/api", use: { baseURL: env.apiURL } },
    {
      name: "ui",
      testDir: "./src/tests/ui",
      use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
    },
  ],
});
```

The new words here:

- **project** — a named test group with its own settings. We make two: `api` (no
  browser, fast) and `ui` (runs in Chromium). The same suite, split by what it tests.
- **`baseURL`** — a prefix Playwright adds to relative paths, so a test can say
  `page.goto("/")` instead of the full URL.
- **`devices["Desktop Chrome"]`** — a preset (screen size, user agent) that makes the
  `ui` project behave like desktop Chrome.
- **`trace` / `screenshot`** — debugging aids we'll use in Chapter 6: a trace is a
  full recording of a failed test; a screenshot is captured on failure.

Finally a small `tsconfig.json`. The important bit is **path aliases** — they let us
import helpers as `@utils/...` instead of fragile `../../../utils` chains:

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

Playwright reads these aliases automatically — no extra tooling.

## Your first UI test

A small thing about Inkwell: it uses a **HashRouter**, which means pages live after a
`#` in the URL (e.g. `/#/login`). The browser's real path stays `/`, so you can
navigate straight to any screen and it's reliable — handy for tests.

```ts
// src/tests/ui/home.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inkwell home page", () => {
  test("renders the brand and auth links", async ({ page }) => {
    await page.goto("/");                                   // baseURL + "/"

    await expect(page).toHaveTitle("Inkwell");              // the tab title
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

Reading it:

- **`test.describe("…", () => { … })`** groups related tests under a heading — purely
  for organization and readable output.
- **`{ page }`** is a *fixture*: Playwright opens a fresh, isolated browser tab and
  hands it to each test. Fresh means tests can't pollute each other.
- **`getByRole("heading", { name: "inkwell" })`** finds an element by its *role*
  (heading, button, link) and its visible text. This is the locator style we'll lean
  on — more on why in Chapter 3.
- **`expect(...).toBeVisible()`** is an **assertion** that waits for the element to be
  on screen. (Playwright assertions wait automatically — you rarely add manual waits.)

## Your first API test — and bug #1

API tests skip the browser and talk to the backend over HTTP. Inkwell ships a
test-only endpoint, `POST /api/test/reset`, that wipes and reseeds the database. Our
first API test calls it and checks the seed data:

```ts
// src/tests/api/smoke.spec.ts
import { test, expect } from "@playwright/test";
import { env } from "@utils/env";

test("reset returns known seed data", async ({ request }) => {
  const res = await request.post(`${env.apiURL}/test/reset`);
  expect(res.ok()).toBeTruthy();                 // a 2xx status

  const body = await res.json();                 // parse the JSON response
  expect(body.article).toBe("welcome-to-inkwell");
  expect(body.users.map((u: { username: string }) => u.username)).toContain(
    "playwright",
  );
});
```

`request` is another built-in fixture — an HTTP client. `res.ok()` is true for a
success status; `res.json()` reads the response body.

Now the trap. My first version set the `api` project's `baseURL` to
`http://localhost:3001/api` and called `request.post("/test/reset")`. **It returned
404 (not found).** Why?

Playwright joins a relative URL to the base with the standard `new URL(path, base)`
rule, and a path that **starts with `/`** replaces the *entire* path. So
`/test/reset` against base `.../api` becomes `http://localhost:3001/test/reset` —
the `/api` silently vanished. The fix above is to build the full URL from
`env.apiURL`. (Later we hide this entirely behind an `api` fixture, so no test has to
remember it.) **Lesson: a 404 in an API test is often a URL-joining mistake, not a
missing endpoint.**

## Bug #2: parallel tests sharing one database

Add two more API tests — one hitting `/tags`, one logging a seeded user in — and run
everything. One test **fails sometimes and passes other times** (we call that
*flaky*): login returns a failure.

Here's why. `fullyParallel: true` runs tests at the same time across several **worker
processes**. But *every* test that calls `/test/reset` drops and recreates the whole
database. So while the login test is reading the users table, another test's reset has
just **wiped it out from under it**. That's a classic *shared-state race* — two things
fighting over the same data at the same time.

For a suite that all hits one database, the honest fix is to **stop racing**: run
these API tests **one at a time** (serial) and reset **once** before them.

```ts
test.describe.configure({ mode: "serial" }); // run tests in this file in order

test.describe("Inkwell API smoke", () => {
  test.beforeAll(async ({ request }) => {      // runs once, before the tests
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

- **`mode: "serial"`** — run the tests in this group in order, never in parallel.
- **`beforeAll`** — a hook that runs once before the group (here, to seed the data).
- **`data: { … }`** — the JSON body Playwright sends with the POST.

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

Green across the board — UI and API, against a real app, in well under two seconds.

## What still smells

Look again and you can see the rot starting — and naming it now is half the course:

- `playwright@test.io` / `Password123!` is **hard-coded**, ready to be copy-pasted
  into every future test.
- The login *steps* live inside the test instead of behind a name like `loginAs(user)`.
- Serial mode is a blunt instrument — we slowed the **whole** group to dodge a data
  race, instead of giving each test its **own** isolated data.

Those three smells are exactly what **Page Objects**, **fixtures**, and **API-driven
test data** fix — which is where the course goes next.

## Next up

**Chapter 3 — Locators & web-first assertions:** why `getByRole` beats CSS selectors,
how Playwright's auto-waiting assertions remove flakiness, and the locator habits the
whole framework is built on. Tag: `ch-03`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me in the comments which of the two bugs above bit you first.
