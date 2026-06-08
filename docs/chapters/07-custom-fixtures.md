---
title: "Custom Fixtures: Beyond beforeEach (Playwright + TypeScript, Ch.7)"
description: "Playwright fixtures are dependency injection for tests. We build an api and a testUser fixture, kill the repeated setup, and start a single @fixtures import that the rest of the framework grows from."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Custom Fixtures: Beyond `beforeEach`

Welcome to **Part 2 — the heart of the course**. Everything so far worked, but the
seams show: API tests repeat `${env.apiURL}` on every call and manage their own
request context; UI tests hard-code the same credentials. `beforeEach` can share
setup within *one* file, but it can't be composed, typed, or requested à la carte.

Playwright's answer is **fixtures**: dependency injection for tests. A test
declares what it needs in its arguments, and Playwright builds exactly those,
lazily, with proper setup and teardown.

> Code for this chapter is tagged `ch-07` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/index.ts`.

## What a fixture actually is

You've already used built-in fixtures: `page`, `request`, `browser`. A **custom**
fixture is a named setup/teardown unit you define with `test.extend`. Its shape is
always the same:

```ts
myFixture: async ({ /* other fixtures */ }, use) => {
  const value = await makeIt();   // setup
  await use(value);               // hand it to the test; pauses here
  await cleanUp(value);           // teardown, after the test finishes
},
```

The code before `use` runs before the test, `use(value)` injects it, and the code
after `use` is guaranteed teardown — even if the test throws.

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
    // Trailing slash + relative paths sidestep the baseURL trap from Ch.2.
    const context = await request.newContext({ baseURL: `${env.apiURL}/` });
    await use(context);
    await context.dispose();   // teardown: always runs
  },

  testUser: async ({}, use) => {
    await use(SEED_USERS.playwright);
  },
});

export { expect };
```

- **`api`** owns the request context *and* its disposal. Tests never create or tear
  one down again — and the trailing-slash baseURL means a plain `"test/reset"` just
  works, with the Chapter 2 `/api` trap solved once, here.
- **`testUser`** is a pure-data fixture. It looks trivial, but routing credentials
  through a fixture means there's now a single place to later make them *unique per
  test* (Part 4) without touching a single spec.

## Before and after

The API smoke test drops all the ceremony:

```ts
// before — every call carries the URL, and we manage the context by hand
const res = await request.post(`${env.apiURL}/test/reset`);

// after — the fixture is the context, pre-pointed at the API
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

Both import from one place — `import { test, expect } from "@fixtures"` — using the
path alias from Chapter 2. That `@fixtures` module is the **single import surface**
the whole framework will grow behind; we formalize how multiple fixture files
compose into it in Chapter 9.

## Why this beats `beforeEach`

- **Requested, not imposed.** A test that doesn't ask for `api` never builds one —
  fixtures are *lazy*. A file-level `beforeEach` runs for every test whether it
  needs the setup or not.
- **Composable & typed.** Fixtures can depend on other fixtures, and the `Fixtures`
  interface makes `{ api, testUser }` autocomplete and type-check.
- **Guaranteed teardown.** The code after `use` always runs — no leaked contexts.

These fixtures are **test-scoped**: a fresh one per test. Some things (a browser, a
logged-in session) are wasteful to rebuild every test — that's **worker scope**,
which we cover in Chapter 10.

## Next up

We turned data and the API context into fixtures, but UI tests still write
`new LoginPage(page)` by hand. **Chapter 8 — POM-as-fixture:** hand tests a ready
`loginPage`, and see why a shared-`page` `beforeAll` is a trap. Tag: `ch-08`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the first fixture you'd add to your own suite.
