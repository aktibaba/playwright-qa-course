---
title: "Custom Fixtures: Beyond beforeEach (Playwright + TypeScript, Ch.7)"
description: "Fixtures are the heart of a Playwright framework — explained from zero. What they are, how test.extend works, and how an api and testUser fixture remove repeated setup behind a single @fixtures import."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Custom Fixtures: Beyond `beforeEach`

Welcome to **Part 2 — the heart of the course**. Everything so far works, but the
seams show: API tests repeat `${env.apiURL}` on every call and build their own HTTP
client; UI tests hard-code the same credentials. This chapter introduces the single
most important idea in a Playwright framework: **fixtures**. Take your time with it —
once it clicks, the rest of the course is easy.

## Starting point: hooks (`beforeEach`)

You may have seen test "hooks" — functions that run around your tests:

```ts
let loginPage;
test.beforeEach(async ({ page }) => {     // runs before EVERY test in the file
  loginPage = new LoginPage(page);
});
```

`beforeEach` works, but it has real limits: it runs for *every* test in the file even
if a test doesn't need it, the shared variable (`loginPage`) is loosely typed, and you
can't easily reuse it across files. Fixtures fix all three.

## What a fixture actually is

A **fixture** is a named, reusable piece of setup that Playwright hands to a test **only
when the test asks for it**. You've already used Playwright's built-in fixtures — they
arrive as the arguments in `async ({ page }) => …`:

- **`page`** — a fresh browser tab.
- **`request`** — an HTTP client for API calls.
- **`browser`**, **`context`**, and more.

This style is called **dependency injection** — a fancy term for a simple idea: *the
test declares what it needs, and the framework provides it.* You write
`async ({ page, api }) => …` and Playwright builds a `page` and an `api` for you.

A **custom** fixture is one you define yourself with `test.extend`. Every fixture has
the same three-part shape:

```ts
myFixture: async ({ /* other fixtures it needs */ }, use) => {
  const value = await makeIt();   // 1. SETUP — runs before the test
  await use(value);               // 2. hand `value` to the test; pause here
  await cleanUp(value);           // 3. TEARDOWN — runs after the test, always
},
```

Read it as: do setup, then `use(value)` *pauses this function and runs the test* with
`value` available; when the test finishes, the lines after `use` run as cleanup —
**even if the test failed**. That guaranteed teardown is a big deal (no leaked
resources).

## Two fixtures that remove real duplication

```ts
// src/fixtures/index.ts
import {
  test as base,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { env } from "@utils/env";

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

// The deterministic users that the database seed creates.
export const SEED_USERS = {
  playwright: { username: "playwright", email: "playwright@test.io", password: "Password123!" },
  alice: { username: "alice", email: "alice@test.io", password: "Password123!" },
  bob: { username: "bob", email: "bob@test.io", password: "Password123!" },
} as const satisfies Record<string, TestUser>;

export interface Fixtures {
  api: APIRequestContext;
  testUser: TestUser;
}

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const context = await request.newContext({ baseURL: `${env.apiURL}/` });
    await use(context);        // give the test an HTTP client pointed at the API
    await context.dispose();   // teardown: close it (always runs)
  },

  testUser: async ({}, use) => {
    await use(SEED_USERS.playwright);   // just hand over a known user
  },
});

export { expect };
```

What's going on:

- **`test as base`** imports Playwright's `test` under the name `base`, and
  **`base.extend<Fixtures>({ … })`** creates a *new* `test` that has our extra
  fixtures. `<Fixtures>` is the TypeScript type describing what we added, so
  `{ api, testUser }` autocompletes and type-checks.
- **`api`** builds an HTTP client once, hands it over, and disposes it after. The
  trailing slash on `${env.apiURL}/` means a plain `"test/reset"` resolves correctly —
  the Chapter 2 `/api` trap, solved once, here, so no test ever hits it again.
- **`testUser`** is a *pure-data* fixture — it just provides a known user. It looks
  trivial, but routing credentials through a fixture gives us a **single place** to
  later make them *unique per test* (Part 4) without editing any spec.
- The `{}` in `async ({}, use) => …` means "this fixture doesn't depend on other
  fixtures." (Some fixtures do — you'd write `async ({ api }, use) => …`.)
- `as const satisfies Record<string, TestUser>` is TypeScript making sure each seed
  user has the right shape while keeping the exact values — don't worry if that line
  is opaque; it's a guardrail, not something you write daily.

## Before and after

The API test drops the ceremony:

```ts
// before — every call carries the full URL, and we manage the client by hand
const res = await request.post(`${env.apiURL}/test/reset`);

// after — `api` is the client, already pointed at the API
test("reset returns known seed data", async ({ api }) => {
  const res = await api.post("test/reset");
  // ...
});
```

And UI tests stop hard-coding people:

```ts
test("a seeded user can log in", async ({ page, testUser }) => {
  await new LoginPage(page).loginAs(testUser);
  await expect(
    page.getByRole("navigation").getByText(testUser.username),
  ).toBeVisible();
});
```

Both files import from **one place** — `import { test, expect } from "@fixtures"`
(the path alias from Chapter 2). That `@fixtures` module is the **single front door**
the whole framework grows behind; Chapter 9 shows how multiple fixture files compose
into it.

## Why this beats `beforeEach`

- **Requested, not imposed.** A test that doesn't ask for `api` never builds one —
  fixtures are **lazy**. `beforeEach` runs for every test whether it's needed or not.
- **Composable and typed.** Fixtures can build on other fixtures, and the `Fixtures`
  interface gives you autocomplete and type-checking.
- **Guaranteed cleanup.** The code after `use` always runs — no leaked HTTP clients.

These two fixtures are **test-scoped**: a fresh one is built for each test. Some things
(a browser, a logged-in session) are wasteful to rebuild every single test — for those
there's **worker scope**, which we meet in Chapter 10.

## Next up

We turned data and the API client into fixtures, but UI tests still write
`new LoginPage(page)` by hand. **Chapter 8 — POM-as-fixture:** hand each test a
ready-built `loginPage`, and see why building one in a shared `beforeAll` is a trap.
Tag: `ch-08`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the first fixture you'd add to your own suite.
