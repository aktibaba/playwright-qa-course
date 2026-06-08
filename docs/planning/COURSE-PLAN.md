# Building a Production-Grade Playwright + TypeScript Test Framework
### API & UI Automation — From Zero to Advanced

A written course / blog series that teaches readers to build a real, scalable
Playwright + TypeScript automation framework — covering **both API and UI
testing** — by progressively constructing one cohesive codebase.

The architecture is inspired by a real-world production framework (a form.io
automation suite). Every "best practice" chapter maps back to a concrete
pattern that survives in production.

---

## Decisions

| Aspect            | Choice                                                                 |
|-------------------|-----------------------------------------------------------------------|
| Language          | English                                                                |
| Audience          | Zero → Advanced (assumes JS basics, no Playwright/TS required)         |
| System under test | **Public** demo apps (no local stack required to follow along)         |
| Format            | Markdown chapters + a companion GitHub repo (one git tag per chapter)  |

### System(s) Under Test

- **Primary SUT — `restful-booker-platform`** ( https://automationintesting.online )
  A B&B booking app with a **public REST API _and_ a UI for the same system**:
  - API: auth token, room / booking / message / report CRUD.
  - UI: public booking form + an admin panel (requires login).
  - Why: mirrors the production framework's superpower — testing one system
    through both API and UI, `storageState` auth, "seed via API → verify in UI".
- **Supporting demos** (used only in the early fundamentals chapters for clarity):
  - **SauceDemo** ( https://www.saucedemo.com ) — classic login/cart flow for the
    first POM.
  - **TodoMVC** ( https://demo.playwright.dev/todomvc ) — Playwright's own demo
    for first locators/assertions.

> The SUT is swappable: every chapter isolates SUT-specific selectors/URLs behind
> page objects + env config, so a reader can repoint the framework at their own app.

---

## What the reader builds (final repo shape)

The companion repo grows chapter by chapter and ends in this shape — a direct
echo of the production framework's layering:

```
pw-course/
├─ playwright.config.ts          # one project per environment, metadata-driven
├─ tsconfig.json                 # path aliases: @fixtures @pages @utils
├─ package.json
├─ src/
│  ├─ fixtures/                  # test.extend "shells" only
│  │  ├─ env.ts                  #   URL/host derivation per environment
│  │  ├─ auth.ts                 #   worker-scoped API contexts + loggedInPage
│  │  ├─ users.ts                #   freshUser / per-test user contexts
│  │  ├─ poms.ts                 #   bind every POM to the test-scoped page
│  │  └─ index.ts                #   single import surface: `import {test} from "@fixtures"`
│  ├─ pages/                     # Page Objects (pure classes, no fixture coupling)
│  │  ├─ auth/LoginPage.ts
│  │  ├─ booking/BookingPage.ts
│  │  └─ admin/AdminPanelPage.ts
│  ├─ utils/                     # functional core — pure, importable anywhere
│  │  ├─ api-request.ts          #   createAuthedRequest, assertOk, assertStatusOneOf
│  │  ├─ auth-session.ts         #   login() → token, adminLogin()
│  │  ├─ scenarios.ts            #   setupScope / teardownScope provisioning helpers
│  │  └─ logger.ts               #   attachLog, structured step logging
│  ├─ setup/
│  │  ├─ auth.setup.ts           #   log in once → storageState
│  │  └─ global-teardown.ts      #   clean up orphan test data
│  ├─ tests/
│  │  ├─ api/                    #   pure API suites
│  │  ├─ ui/                     #   pure UI suites
│  │  └─ e2e/                    #   integrated API+UI journeys
│  └─ fixtures-data/             #   JSON test data, generated payloads
├─ docs/                         # the course chapters (Markdown / VitePress)
└─ .github/workflows/            # CI: shard + merge, artifacts
```

**Reader workflow:** each chapter is published as a Markdown post; the repo carries
a matching git tag (`ch-03`, `ch-04`, …) so a reader can `git checkout ch-07` and
see exactly the state after that chapter.

---

## Curriculum (7 modules, 25 chapters / posts)

Each chapter lists: **Learn** (concepts), **Build** (what's added to the repo),
**Prod-pattern** (the production framework idea it mirrors).

### Part 0 — Foundations & Setup

**Ch 1 — Why a framework? The 30,000-ft tour**
- Learn: test pyramid, API vs UI vs E2E, when each pays off; tour of the final
  architecture so readers know the destination; meet the SUTs.
- Build: nothing yet (conceptual); repo skeleton + README.
- Prod-pattern: the layered `utils → fixtures → pages → tests` mental model.

**Ch 2 — Setup & your first tests**
- Learn: Node/TS/Playwright install, `npm init playwright`, project anatomy,
  `npx playwright test`, HTML report, trace viewer; tsconfig, ESLint + Prettier.
- Build: working project; first UI test (SauceDemo login) + first API test
  (restful-booker `/auth` token).
- Prod-pattern: strict `.spec.ts` convention, sensible `use` defaults
  (viewport, timeouts, trace on-first-retry, screenshot/video on failure).

### Part 1 — UI Testing Core

**Ch 3 — Locators & web-first assertions**
- Learn: `getByRole`/user-facing locators, auto-waiting, `expect().toBeVisible()`,
  why `waitForTimeout` is a smell; locator chaining/filtering.
- Build: TodoMVC + booking-form locator exercises.
- Prod-pattern: replacing `cy.wait(2000)` with deterministic `waitFor` gates.

**Ch 4 — The Page Object Model, done right**
- Learn: POM as a class of `readonly Locator`s + high-level actions; `goto()` that
  clears prior auth state; keep assertions out of (most) POMs.
- Build: `LoginPage`, `BookingPage` page objects.
- Prod-pattern: the real `LoginPage` (state-clearing goto, `login()` waits for
  post-login URL — no trailing sleep).

**Ch 5 — Forms, tables, dialogs, uploads**
- Learn: fills, selects, checkboxes, date pickers, file upload, asserting on
  lists/grids, confirm dialogs.
- Build: admin-panel room CRUD via UI; shared UI helpers (`confirmDanger`,
  `expectToast`).
- Prod-pattern: cross-spec UI helpers module (`support/helpers.ts`).

**Ch 6 — Debugging & developer experience**
- Learn: trace viewer deep-dive, UI mode, `codegen`, `--debug`, retries,
  screenshots/video, VS Code extension.
- Build: debugging recipes; flaky-test triage workflow.
- Prod-pattern: `trace: "on-first-retry"`, retries surface flakiness in CI.

### Part 2 — Fixtures & Architecture (the heart)

**Ch 7 — Custom fixtures: beyond `beforeEach`**
- Learn: `test.extend<>()`, fixture setup/teardown via `use`, dependency
  injection between fixtures, override semantics.
- Build: first custom fixture (e.g. a seeded room).
- Prod-pattern: fixtures as the unit of reuse instead of hook soup.

**Ch 8 — POM-as-fixture (and why shared-page `beforeAll` is a trap)**
- Learn: bind POMs to the per-test `page` via a generic `pom()` helper; fresh
  page+POM per test; why one-page-per-file forces serial execution.
- Build: `fixtures/poms.ts` with a typed `PomTestFixtures` interface.
- Prod-pattern: the exact production lesson — 173/174 specs shared one page in
  `beforeAll` and couldn't parallelize; POM-as-fixture unblocks `fullyParallel`.

**Ch 9 — Composition chain & a single import surface**
- Learn: chaining `base → auth → users → poms`; re-exporting `test/expect` +
  helpers from one `@fixtures` entry; path aliases in tsconfig.
- Build: `fixtures/index.ts` so every spec does `import { test, expect } from "@fixtures"`.
- Prod-pattern: the production `index.ts` import surface + `@pages/@utils` aliases.

**Ch 10 — Worker-scoped vs test-scoped & the layer rules**
- Learn: when to use `{ scope: "worker" }` (expensive, shareable — e.g. API
  login) vs test scope (isolated state); the "utils = pure core, fixtures =
  shells, pages = POM" boundary.
- Build: refactor for clean layering; document the rules.
- Prod-pattern: worker-scoped admin/user API contexts; functional-core utils.

### Part 3 — API Testing

**Ch 11 — `APIRequestContext` fundamentals**
- Learn: `request` fixture, GET/POST/PUT/DELETE, status/json/headers, building a
  full URL when baseURL has a path component (resolver gotcha).
- Build: `utils/api-request.ts` — `assertOk`, `assertStatusOneOf`.
- Prod-pattern: consistent status assertions; the leading-slash baseURL pitfall.

**Ch 12 — Auth & sessions for the API layer**
- Learn: login util returning a token; an authed context that auto-sends the
  token header; worker-scoped admin vs per-user contexts.
- Build: `utils/auth-session.ts` (`login`, `adminLogin`) + `createAuthedRequest`.
- Prod-pattern: token-returning `login()`, env-overridable admin creds, dispose
  discipline.

**Ch 13 — Building CRUD API suites**
- Learn: `describe.configure({ mode: "serial" })`, `beforeAll` provisioning,
  negative tests (401/403), data-driven cases, tagging (`@deployed`).
- Build: full room/booking API suite.
- Prod-pattern: the real form-API spec — provision in `beforeAll`, assert
  ownership/permission boundaries, minimal request bodies.

**Ch 14 — Scenario helpers: reusable provisioning**
- Learn: factoring repeated setup into `setupScope`/`teardownScope`; returning a
  typed scope object (creds, ids, contexts); guaranteed teardown.
- Build: `utils/scenarios.ts`.
- Prod-pattern: `setupProjectScope` / `teardownProjectScope`.

### Part 4 — Integrating API + UI

**Ch 15 — Auth once with `storageState`**
- Learn: a `setup` project that logs in via UI/API once, persists `storageState`;
  main projects mount it via `use.storageState` + `dependencies: ["setup"]`;
  faker users; gitignored auth artifacts.
- Build: `setup/auth.setup.ts`, `loggedInPage` fixture.
- Prod-pattern: the production setup project (~5s/test saved by skipping UI login).

**Ch 16 — Seed via API, verify in UI (and vice-versa)**
- Learn: hybrid tests — create state fast through the API, assert it in the UI;
  perform a UI action, confirm the side effect through the API.
- Build: `tests/e2e/` integrated booking journeys.
- Prod-pattern: API-seed + UI-verify; `seed-submissions` style helpers.

**Ch 17 — Test data & environment config**
- Learn: JSON fixtures on disk, generated payloads, cross-spec state files, env
  URL/host derivation.
- Build: `fixtures/env.ts`, `fixtures-data/` layout.
- Prod-pattern: `getApiBaseURL`/`getProjectApiHost`; fixtures-data directory.

### Part 5 — Scaling, Config & CI

**Ch 18 — Multi-environment configuration**
- Learn: one Playwright `project` per environment, metadata-driven version slug,
  `--project=<env>` selection, per-env baseURL/keys.
- Build: the env list + metadata typing (`types/metadata.d.ts`).
- Prod-pattern: the production `envs[]` → projects mapping + typed metadata.

**Ch 19 — Parallelism & flake control**
- Learn: `fullyParallel`, `workers`, opt-in `serial` for narrative journeys,
  `retries`, isolating per-test state to stay parallel-safe.
- Build: parallelization pass; the serial-vs-parallel decision tree.
- Prod-pattern: the migration-recipe decision tree (when serial is correct).

**Ch 20 — Reporters & observability**
- Learn: list/HTML/JUnit/blob/GitHub reporters; custom structured logging;
  attaching logs/artifacts to the report; tags & annotations.
- Build: `utils/logger.ts` (`attachLog`), reporter config.
- Prod-pattern: CI-vs-local reporter split; blob report for shard merge.

**Ch 21 — CI/CD with GitHub Actions**
- Learn: workflow setup, sharding + blob-report merge, artifact upload, caching
  browsers, headless/Docker, environment matrix.
- Build: `.github/workflows/ci.yml` + optional Dockerfile.
- Prod-pattern: the production deployed/hosted CI workflows.

### Part 6 — Advanced & Capstone

**Ch 22 — Advanced techniques**
- Learn: network interception & mocking (`page.route`), API mocking to stabilize
  UI, visual snapshots, accessibility checks, a peek at component testing.
- Build: a mocked-network test + a visual snapshot test.
- Prod-pattern: deterministic gating, isolating third-party flakiness.

**Ch 23 — Stability & maintainability at scale**
- Learn: `safe-click`/retry helpers, resilient selector strategy, handling flaky
  third-party UI, when to delete vs quarantine a test.
- Build: `utils/safe-click.ts` + selector guidelines.
- Prod-pattern: the real `safe-click`/`ui-helpers` utilities.

**Ch 24 — Framework maturation & docs**
- Learn: linting tests, reviewing test PRs, documenting the framework
  (VitePress site), onboarding contributors, a maturation roadmap.
- Build: a `docs/` VitePress site (optional) mirroring the chapters.
- Prod-pattern: the production `doc/` + VitePress `playwright/docs/`.

**Ch 25 — Capstone & where to go next**
- Learn: tie everything together; one feature tested end-to-end across API + UI
  with the complete framework; performance, contract testing, next steps.
- Build: capstone spec + final repo tag.
- Prod-pattern: the whole stack working as one.

---

## Per-chapter writing template

Each post follows the same shape for consistency:

1. **Where we are** — recap + the gap this chapter closes.
2. **The problem** — show the naive/painful way first.
3. **The pattern** — introduce the concept.
4. **Build it** — step-by-step code, real diffs against the repo.
5. **Run it** — command + expected output/report screenshot.
6. **Why this scales** — the production rationale (the "Prod-pattern" note).
7. **Exercises** — 2–3 tasks for the reader.
8. **Repo tag** — `git checkout ch-NN` to get this state.

---

## Suggested delivery order / milestones

- **MVP (Parts 0–2, Ch 1–10):** a reader can build a clean, parallel-safe UI
  framework with fixtures + POM. This alone is a strong standalone mini-series.
- **API milestone (Part 3):** add the API testing layer.
- **Integration milestone (Part 4):** the differentiator — API+UI in one suite.
- **Production milestone (Parts 5–6):** CI, scaling, advanced, capstone.

---

## Open questions to settle before writing Ch 1

1. Confirm primary SUT = `restful-booker-platform`, or prefer an alternative
   (e.g. an e-commerce demo with a documented API)?
2. One mono-repo that grows with tags, vs a separate "starter" + "final" repo?
3. Publishing target for the Markdown (personal blog / dev.to / Medium / the
   VitePress site itself)?
4. Cadence (e.g. one post/week) — affects how chapters are batched.
