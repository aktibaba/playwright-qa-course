---
title: "Worker vs Test Scope & the Layer Rules (Playwright + TypeScript, Ch.10)"
description: "When to build a fixture once per worker instead of once per test, why a Page Object can never be worker-scoped, and the dependency rules that keep utils → fixtures → pages → tests from tangling. Closing Part 2."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Worker vs Test Scope & the Layer Rules

Every fixture we've written so far is **test-scoped** — rebuilt for each test. That's
the safe default, but it's wasteful for things that are expensive to create and hold
no per-test state. This chapter is about choosing the right scope, and the
dependency rules that keep the whole framework from turning into spaghetti. It
closes Part 2.

> Code for this chapter is tagged `ch-10` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/api.fixture.ts`.

## Two scopes, two lifecycles

- **Test scope** (the default): created before each test, torn down after. Every
  test gets its own fresh instance. Use it for anything with per-test state.
- **Worker scope**: created once per **worker process** and reused across every test
  that worker runs. Playwright runs tests in parallel across several worker
  processes; a worker-scoped fixture is built once per process, not once per test.

## Promoting `api` to worker scope

Our `api` fixture is an `APIRequestContext` with **no per-test state** — no cookies,
no login, just a base URL. Building one per test is pure waste. So we make it
worker-scoped: the fixture body becomes a `[fn, { scope: "worker" }]` tuple, and it
moves to the **second** type parameter of `extend` (worker fixtures), not the first
(test fixtures):

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
      await context.dispose();   // once per worker, at the end
    },
    { scope: "worker" },
  ],
});
```

Specs don't change at all — `async ({ api }) => …` works exactly as before. We just
build far fewer contexts. `mergeTests` happily combines this worker fixture with the
test-scoped `data` and `pages` modules.

## The rule that decides scope for you

> **A worker-scoped fixture cannot depend on a test-scoped fixture.**

That single constraint resolves most "which scope?" questions:

- **`loginPage` must stay test-scoped.** It's built on `page`, and `page` is
  test-scoped (each test gets its own browser context). A worker-scoped Page Object
  is impossible *and* undesirable — it'd be the shared-`page` trap from Chapter 8,
  reborn.
- **`testUser` stays test-scoped.** It's cheap, and in Part 4 it becomes a *unique*
  user per test — which is the opposite of "share one across the worker".
- **`api` is a great worker fixture.** Expensive-ish to create, zero per-test state,
  safe to share.

The litmus test: **expensive + stateless/immutable → worker; anything per-test or
mutable → test.**

## The layer rules

Scopes keep fixtures efficient; **layering** keeps the codebase navigable. The
framework has four layers, and dependencies only ever point **downward**:

```
utils      → env, pure helpers. Depend on nothing in the framework.
  ↑
fixtures   → compose utils (and construct pages). The wiring layer.
  ↑
pages      → Page Objects. Use `page` + utils. Never import fixtures.
  ↑
tests      → import only from @fixtures. Never `new` a page, never read env.
```

Concretely, the rules we follow:

- **Tests** import from `@fixtures` and nothing else from the framework — no
  `new LoginPage()`, no `env`, no raw `request`.
- **Page Objects** are pure: they take a `page`, expose locators and actions, and
  know nothing about fixtures or test data. That's why they're trivially reusable.
- **Fixtures** are the only place allowed to wire layers together — construct Page
  Objects, read `env`, create contexts.
- **Utils** sit at the bottom and depend on nothing above them.

Follow the arrows and you never get a cycle: a Page Object importing a fixture, or a
test reaching past the surface into `env`, is the smell that the layering broke.

## Part 2, done

You now have the architecture the course is named for: typed custom fixtures, Page
Objects delivered as fixtures, a single composed `@fixtures` import, the right scope
for each fixture, and clear layer boundaries. This is a framework a real team could
adopt.

## Next up — Part 3: API Testing

We've leaned on the API for setup; now we test it as a first-class surface.
**Chapter 11 — `APIRequestContext` fundamentals:** requests, responses, status and
JSON assertions, and the shape of a real API suite against Inkwell's RealWorld API.
Tag: `ch-11`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which fixtures you'd make worker-scoped in your suite.
