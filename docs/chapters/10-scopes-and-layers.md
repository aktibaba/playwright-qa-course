---
title: "Worker vs Test Scope & the Layer Rules (Playwright + TypeScript, Ch.10)"
description: "When to build a fixture once per worker instead of once per test (and why a Page Object never can), plus the simple layering rules that keep utils → fixtures → pages → tests from tangling. Closing Part 2, explained for beginners."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Worker vs Test Scope & the Layer Rules

Every fixture we've written is **test-scoped** — rebuilt fresh for each test. That's
the safe default. But for things that are expensive to create and hold no per-test
state, rebuilding them every test is wasteful. This chapter is about choosing the
right *scope*, plus the simple layering rules that keep the codebase tidy. It closes
Part 2.

> Code for this chapter is tagged `ch-10` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/api.fixture.ts`.

## First: what's a "worker"?

To run faster, Playwright doesn't run all tests in one process — it starts several
**worker processes** and spreads the tests across them, so many run at the same time.
Think of a worker as one "lane" running a stream of tests one after another.

That gives us two possible **scopes** (lifecycles) for a fixture:

- **Test scope** (default): built before each test, torn down after. Every test gets
  its own fresh copy. Use it for anything that has per-test state.
- **Worker scope**: built **once per worker process** and reused by every test that
  worker runs. Far fewer builds.

## Promoting `api` to worker scope

Our `api` fixture is just an HTTP client pointed at a base URL — **no cookies, no
login, no per-test state**. Building a new one for every test is pure waste. So we make
it worker-scoped: build one per worker and share it.

The syntax changes slightly — the fixture becomes a `[function, { scope: "worker" }]`
pair, and it moves to the **second** type slot of `extend` (which is for worker
fixtures):

```ts
// src/fixtures/api.fixture.ts
export interface ApiWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<object, ApiWorkerFixtures>({
  api: [
    async ({}, use) => {
      const context = await request.newContext({ baseURL: `${env.apiURL}/` });
      await use(context);
      await context.dispose();   // disposed once per worker, at the very end
    },
    { scope: "worker" },         // <-- this is what makes it worker-scoped
  ],
});
```

Tests don't change at all — `async ({ api }) => …` still works. We just build far
fewer clients. `mergeTests` happily combines this worker fixture with the test-scoped
`data` and `pages` modules.

## The one rule that decides scope for you

> **A worker-scoped fixture cannot depend on a test-scoped fixture.**

It makes sense: a worker fixture lives across *many* tests, so it can't depend on
something that only exists *within one* test. This single rule answers most "which
scope?" questions:

- **`loginPage` must stay test-scoped.** It's built on `page`, which is test-scoped
  (each test has its own browser tab). A worker-scoped Page Object is impossible — and
  it would be the shared-`page` trap from Chapter 8 all over again.
- **`testUser` stays test-scoped.** It's cheap, and in Part 4 it becomes a *unique*
  user per test — the opposite of "share one across the worker".
- **`api` is a perfect worker fixture.** A bit costly to create, zero per-test state,
  safe to share.

The litmus test: **expensive + stateless → worker; per-test or stateful → test.**

## The layer rules

Scopes keep fixtures efficient; **layering** keeps the whole codebase easy to
navigate. The framework has four layers, and dependencies only ever point **down**:

```
tests      ← import only from @fixtures. Never `new` a page, never read env.
  │  (use)
fixtures   ← the wiring layer: build pages, read env, make clients.
  │  (use)
pages / utils  ← Page Objects (take a `page`) and pure helpers (env). 
                 They know nothing about fixtures.
```

In plain words:

- **Tests** import from `@fixtures` and nothing else — no `new LoginPage()`, no `env`,
  no raw `request`.
- **Page Objects** are pure: a `page` in, locators and actions out. They never import
  fixtures, which is exactly why they're easy to reuse and test.
- **Fixtures** are the *only* place that wires layers together (build Page Objects,
  read `env`, create clients).
- **Utils** sit at the bottom and depend on nothing above them.

Follow the arrows and you can never get a circular import. A Page Object importing a
fixture, or a test reaching into `env` directly, is the warning sign that the layering
broke.

## Part 2, done

You now have the architecture the course is named for: typed custom fixtures, Page
Objects delivered as fixtures, a single composed `@fixtures` import, the right scope
for each fixture, and clear layer boundaries. This is a framework a real team could
adopt as-is.

## Next up — Part 3: API Testing

We've used the API for setup; now we test it as a first-class thing.
**Chapter 11 — `APIRequestContext` fundamentals:** requests, responses, status and
JSON assertions, and the shape of a real API test suite. Tag: `ch-11`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which fixtures you'd make worker-scoped in your suite.
