# Framework Reference

A quick map of the framework for anyone joining the project — what lives where, and
how to add the next test, Page Object, or fixture.

## Layout

```
src/
├─ fixtures/            # custom fixtures, composed into one `@fixtures` import
│  ├─ data.fixture.ts   #   testUser, SEED_USERS
│  ├─ api.fixture.ts    #   api (worker-scoped APIRequestContext)
│  ├─ auth.fixture.ts   #   authedApi (chained on api + data)
│  ├─ scenarios.fixture #   makeArticle (factory fixture, auto-cleanup)
│  ├─ pages.fixture.ts  #   loginPage, articleEditorPage, articlePage, settingsPage
│  └─ index.ts          #   mergeTests(...) → the single import surface
├─ pages/               # Page Objects (pure; take a `page`, expose actions)
├─ utils/               # env, unique, scenarios (pure helpers)
├─ fixtures-data/       # data factories (articleData) → @data
├─ setup/               # global-setup (seed once), auth.setup (storageState)
└─ tests/{api,ui}/      # specs
```

## The layer rule

Dependencies point **down** only: `tests → fixtures → pages/utils`. Tests import
**only** from `@fixtures`; Page Objects never import fixtures; only fixtures wire
layers together (construct POMs, read `env`, create contexts).

## How to…

**Add a test** — import the composed `test`:

```ts
import { test, expect } from "@fixtures";
test("...", async ({ api, authedApi, makeArticle, loginPage }) => { /* ... */ });
```

**Add a Page Object** — a class taking `page`; expose locators + intent methods.
Then add a one-line fixture in `pages.fixture.ts` so tests get it ready-built.

**Add a fixture** — new `*.fixture.ts` with `base.extend` (or chain with
`mergeTests(a, b).extend` when it depends on others), then add it to `mergeTests`
in `index.ts`. Specs never change their import.

**Add test data** — a factory in `fixtures-data/` returning valid, unique input
(use `uniqueId()` so it's collision-proof across workers).

## Determinism rules

- The DB is seeded **once** by `global-setup`; **no test resets it**.
- Read tests rely on the seed; mutating tests create **unique** data and clean up.
- Don't assert on a specific item's position in an unfiltered, page-limited list —
  filter by a unique tag/author, or assert membership with a high `limit`.

## Commands

```bash
npm test            # run everything
npm run test:ui     # UI mode (time-travel)
npm run test:debug  # inspector
npm run test:report # open the HTML report
npm run test:flake  # --repeat-each=5, hunt non-determinism
npm run codegen     # record locators
```
