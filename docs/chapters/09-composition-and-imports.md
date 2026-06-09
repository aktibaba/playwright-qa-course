---
title: "Fixture Composition & a Single Import Surface (Playwright + TypeScript, Ch.9)"
description: "Split fixtures into focused files and combine them with mergeTests into one @fixtures import — explained simply — so the framework scales without one file becoming a junk drawer, and tests never change their import line."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Fixture Composition & a Single Import Surface

By [Chapter 8](https://github.com/aktibaba/playwright-qa-course) our single
`src/fixtures/index.ts` held test data, an API client, **and** three Page Objects —
and later chapters want to add more (auth helpers, data builders, saved sessions). One
file that mixes everything becomes a junk drawer fast. Let's fix the structure before
it hurts — this chapter is short but it's the architecture that keeps the rest tidy.

> Code for this chapter is tagged `ch-09` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/`.

## One file per concern

A **module** is just a file that exports some code. A **concern** is one responsibility
(test data, the API client, Page Objects). The idea: give each concern its own small
module, so you always know where to look.

```
src/fixtures/
├─ data.fixture.ts     # testUser, SEED_USERS
├─ api.fixture.ts      # api (the HTTP client)
├─ pages.fixture.ts    # loginPage, articleEditorPage, articlePage
└─ index.ts            # combines them into one `test`
```

Each module is its own small `base.extend`, exactly like Chapter 7 — just split out:

```ts
// src/fixtures/api.fixture.ts
import { test as base, request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";

export interface ApiFixtures {
  api: APIRequestContext;
}

export const test = base.extend<ApiFixtures>({
  api: async ({}, use) => {
    const context = await request.newContext({ baseURL: `${env.apiURL}/` });
    await use(context);
    await context.dispose();
  },
});
```

`data.fixture.ts` and `pages.fixture.ts` follow the same shape. Each owns its own
fixtures and types, and nothing else.

## Combine them with `mergeTests`

Now we need *one* `test` that has all the fixtures from all the modules. Playwright's
**`mergeTests`** does exactly that — it takes several extended `test`s and returns one
with **all** of their fixtures, fully typed:

```ts
// src/fixtures/index.ts
import { mergeTests, expect } from "@playwright/test";
import { test as dataTest } from "./data.fixture";
import { test as apiTest } from "./api.fixture";
import { test as pagesTest } from "./pages.fixture";

export const test = mergeTests(dataTest, apiTest, pagesTest);

export { expect };
export { SEED_USERS, type TestUser } from "./data.fixture";
```

This `index.ts` is the **single front door** to the framework. Every test still writes
exactly one import line:

```ts
import { test, expect } from "@fixtures";
```

…and gets `api`, `testUser`, `loginPage`, `articleEditorPage`, `articlePage` with full
autocomplete. Add a new capability in a later chapter? Write a new `*.fixture.ts`, add
it to `mergeTests`, and **not a single test changes its import**. That stability is the
whole win.

## `mergeTests` vs. chained `extend`

There are two ways to combine fixtures, and they're for different situations:

- **`mergeTests(a, b, c)`** — for **independent** concerns that don't reference each
  other (our data / api / pages). Each is built on its own, then merged side by side.
- **Chained `base.extend(...).extend(...)`** — for fixtures that **build on** one
  another in a line. In Part 3 we'll make an `authedApi` fixture *on top of* `api` and
  `testUser` (it logs the user in and attaches their token) — that's a dependency
  chain, so we chain rather than merge.

Rule of thumb: **merge across modules; chain within a dependency line.**

## Why this is architecture, not bureaucracy

- **Tests are stable.** Their import never changes as the framework grows — only the
  composition root (`index.ts`) does.
- **Changes are contained.** API tweaks touch `api.fixture.ts`; new pages touch
  `pages.fixture.ts`. Small, reviewable changes.
- **Onboarding is obvious.** "Where do fixtures live?" has one answer, and each file
  does one job.

## Next up

We have a clean front door, but every fixture so far is **test-scoped** — rebuilt for
each test. Some things (a browser-wide auth token, a shared read-only client) are
wasteful to rebuild every time. **Chapter 10 — Worker-scoped vs. test-scoped & the
layer rules** closes Part 2: when to use each scope, and the dependency rules that keep
`utils → fixtures → pages → tests` from tangling. Tag: `ch-10`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you organize your own fixtures.
