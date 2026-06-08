---
title: "Fixture Composition & a Single Import Surface (Playwright + TypeScript, Ch.9)"
description: "Split fixtures into focused modules and compose them with mergeTests into one @fixtures import — so the framework scales without one file becoming a dumping ground, and specs never change their import line."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Fixture Composition & a Single Import Surface

By [Chapter 8](https://github.com/aktibaba/playwright-qa-course) our single
`src/fixtures/index.ts` held data, an API context, and three Page Objects — and the
API auth helpers, scenario builders, and storage-state sessions of later chapters
all want in too. One growing file mixing every concern is a smell. Let's fix the
architecture before it hurts.

> Code for this chapter is tagged `ch-09` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/`.

## One module per concern

Split the fixtures by responsibility, each a small `base.extend` of its own:

```
src/fixtures/
├─ data.fixture.ts     # testUser, SEED_USERS
├─ api.fixture.ts      # api (APIRequestContext)
├─ pages.fixture.ts    # loginPage, articleEditorPage, articlePage
└─ index.ts            # composes them into one `test`
```

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

Each module owns its types and its fixtures, and nothing else. `data.fixture.ts`
and `pages.fixture.ts` follow the same shape.

## Compose with `mergeTests`

`mergeTests` takes several extended `test`s and returns one with **all** their
fixtures combined — fully typed, no manual interface stitching:

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

That's the **single import surface**. Every spec still writes exactly one line:

```ts
import { test, expect } from "@fixtures";
```

…and gets `api`, `testUser`, `loginPage`, `articleEditorPage`, `articlePage` with
full autocomplete. Add a capability next chapter? Write a new `*.fixture.ts`, add it
to `mergeTests`, and **not a single spec changes its import**.

## `mergeTests` vs. chained `extend`

Two ways to combine fixtures — they're not interchangeable:

- **`mergeTests(a, b, c)`** — for **independent** concerns that don't reference each
  other (our data / api / pages). Each module is built in isolation, then merged.
- **Chained `base.extend(...).extend(...)`** — for fixtures that **depend on** one
  another in a line. We'll use this in Part 3, where an `authedApi` fixture is built
  *on top of* `api` and `testUser` (it logs the user in and attaches the token).

Rule of thumb: merge across **modules**, chain within a **dependency line**.

## Why this is the architecture, not bureaucracy

- **Specs are stable.** The import never changes as the framework grows — only the
  composition root (`index.ts`) does.
- **Concerns are isolated.** API changes touch `api.fixture.ts`; new pages touch
  `pages.fixture.ts`. Smaller blast radius, easier review.
- **Onboarding is obvious.** "Where do fixtures live?" has one answer, and each file
  does one job.

## Next up

We've got a clean composition surface, but every fixture so far is **test-scoped** —
rebuilt for each test. Some things (a browser-wide auth token, a shared read-only
client) are wasteful to rebuild every time. **Chapter 10 — Worker-scoped vs.
test-scoped & the layer rules** closes Part 2: when to use each scope, and the
dependency rules that keep `utils → fixtures → pages → tests` from tangling. Tag:
`ch-10`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you organize your own fixtures.
