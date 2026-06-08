# Playwright + TypeScript QA Automation Course — Master Plan

A written course / blog series that teaches readers to build a **production-grade
Playwright + TypeScript** automation framework covering **both API and UI testing**,
against a real, dockerized app. Architecture inspired by a real-world form.io
automation suite.

> Status: **M0 done — building M1.** The SUT (rebranded to **Inkwell**) is
> dockerized and verified online under `sut/` (`docker compose up -d --build --wait`),
> with `reset`/`seed` test endpoints working. The publishing pipeline is in place:
> chapters are authored in **VitePress** under `docs/chapters/` and pushed to
> dev.to as drafts via `npm run blog:devto`. Next: the Playwright framework (M1).

Detailed companion docs:
- [`COURSE-PLAN.md`](./COURSE-PLAN.md) — full 25-chapter curriculum.
- [`APP-PLAN.md`](./APP-PLAN.md) — SUT selection, dockerization, test-friendliness.

---

## 1. Locked decisions

| Decision            | Choice                                                                         |
|---------------------|--------------------------------------------------------------------------------|
| Language            | English                                                                         |
| Audience            | Zero → Advanced (JS basics assumed; no Playwright/TS required)                  |
| Output format       | Markdown chapters + a companion GitHub repo (one git tag per chapter)           |
| **SUT**             | **RealWorld "Conduit"** — `TonyMckes/conduit-realworld-example-app` (Option A)  |
| SUT stack           | React (Vite) + Express + Sequelize + **PostgreSQL**, fully decoupled            |
| Runtime             | **Docker Compose** (db + api + web), one-command up with healthchecks           |
| Test framework      | Playwright + TypeScript, layered (`utils → fixtures → pages → tests`)           |

---

## 2. Why this SUT

- **Exact stack match** (decoupled React + Express + Postgres).
- **A real, published API contract** (the RealWorld spec) → the API module tests a
  documented API, just like the form.io reference framework.
- **Rich enough**: JWT auth, full CRUD, relationships (follow/favorite), pagination
  + filtering, tags, comments.
- **Playwright-friendly by design**: uses **HashRouter** (pathname always `/`,
  deterministic client-side routing, direct URL navigation like `/#/login`); CORS
  already open; tables auto-created via Sequelize `sync`.

What we add to guarantee determinism (the "won't struggle" requirement):
- A **test-only** `POST /api/test/reset` (drop+recreate+reseed known data) and
  `POST /api/test/seed`, guarded by `ENABLE_TEST_ENDPOINTS=1`.
- Deterministic seed users with **hashed** passwords (the upstream seeder inserts
  plaintext and bypasses bcrypt — a real bug we fix in the seed endpoint).
- Surgical `data-testid`s only where semantic locators aren't enough.
- A few extra UI widgets (upload / sortable table / dialog) **or** borrow those
  examples from the Cypress RWA reference app — decided per UI chapter.

---

## 3. Target repo structure (end state)

```
pw-course/
├─ sut/                         # dockerized RealWorld Conduit (vendored)
│  ├─ backend/                  #   Express + Sequelize + Postgres
│  │  ├─ Dockerfile             #   (planned)
│  │  └─ routes/test.js         #   (drafted) reset/seed endpoints
│  ├─ frontend/                 #   React + Vite  → built, served by nginx
│  │  ├─ Dockerfile             #   (planned)
│  │  └─ nginx.conf             #   (planned) serves SPA + proxies /api → api:3001
│  └─ docker-compose.yml        #   (planned) db + api + web, healthchecks, --wait
├─ src/                         # the Playwright framework
│  ├─ fixtures/  (env, auth, users, poms, index)   # test.extend shells
│  ├─ pages/     (auth/, article/, profile/, …)    # Page Objects
│  ├─ utils/     (api-request, auth-session, scenarios, logger)
│  ├─ setup/     (auth.setup.ts, global-teardown.ts)
│  ├─ tests/     (api/, ui/, e2e/)
│  └─ fixtures-data/
├─ docs/                        # course chapters (Markdown / VitePress)
├─ playwright.config.ts         # one project per environment, metadata-driven
├─ tsconfig.json                # path aliases: @fixtures @pages @utils
└─ .github/workflows/ci.yml     # compose up SUT → sharded tests → tear down
```

---

## 4. SUT dockerization plan (to execute later)

1. **`backend/Dockerfile`** — `node:20-bookworm` (bcrypt native build works), install
   backend deps, `node index.js`.
2. **`frontend/Dockerfile`** — multi-stage: `vite build` → serve `dist/` with
   `nginx`, proxying `/api` to the api service (keeps API same-origin for the
   relative axios URLs).
3. **`docker-compose.yml`** —
   - `db`: `postgres:16-alpine`, `pg_isready` healthcheck.
   - `api`: build `./backend`, Postgres env (`DEV_DB_DIALECT=postgres`, host `db`),
     `ENABLE_TEST_ENDPOINTS=1`, healthcheck on `/api/tags`, depends_on db healthy.
   - `web`: build `./frontend`, nginx on `:3000`, depends_on api healthy.
   - `docker compose up -d --build --wait` → whole SUT online deterministically.
4. **`backend/routes/test.js`** + mount in `index.js` behind the env guard.
5. Verify: `up --wait` green → `curl /api/test/reset` returns seeded users →
   `/#/login` renders.

---

## 5. Curriculum at a glance (7 modules, 25 chapters)

Each chapter = one post; repo carries a matching git tag (`ch-07`). Full detail in
[`COURSE-PLAN.md`](./COURSE-PLAN.md).

- **Part 0 — Foundations** (Ch 1–2): why a framework, setup, first UI + API test.
- **Part 1 — UI Core** (Ch 3–6): locators & web-first assertions, POM, forms/
  tables/dialogs/uploads, debugging (trace, UI mode, codegen).
- **Part 2 — Fixtures & Architecture** (Ch 7–10) *(the heart)*: custom fixtures,
  POM-as-fixture, composition chain + single `@fixtures` import, worker vs test
  scope + layer rules.
- **Part 3 — API Testing** (Ch 11–14): `APIRequestContext`, auth/token helpers,
  CRUD suites, scenario setup/teardown helpers.
- **Part 4 — Integration** (Ch 15–17) *(the differentiator)*: `storageState` auth,
  seed-via-API → verify-in-UI, test data & env config.
- **Part 5 — Scaling & CI** (Ch 18–21): multi-env config, parallelism & flake,
  reporters/logging, GitHub Actions + sharding.
- **Part 6 — Advanced & Capstone** (Ch 22–25): network mocking/visual/a11y,
  stability utilities, framework maturation + docs, capstone.

Per-chapter template: recap → the naive way → the pattern → build it → run it →
why it scales (prod rationale) → exercises → repo tag.

---

## 6. Execution roadmap (milestones, in order)

1. **M0 — SUT online**: dockerize Conduit, add reset/seed, verify `up --wait`.
2. **M1 — Framework MVP** (Parts 0–2): clean, parallel-safe UI framework with
   fixtures + POM. Strong standalone mini-series on its own.
3. **M2 — API module** (Part 3).
4. **M3 — Integration** (Part 4): the API+UI superpower.
5. **M4 — Production** (Parts 5–6): CI, scaling, advanced, capstone.

We write the corresponding chapters as each milestone's code lands, tagging the
repo per chapter.

---

## 7. Still-open / to confirm before execution

- UI-widget gaps (upload / sortable table / dialog): **augment Inkwell** vs
  **borrow from Cypress RWA** — decide per Ch 5.
- Mono-repo (SUT vendored in-tree, as now) vs SUT as a git submodule.
- ~~Publishing target~~ **Decided:** authored in **VitePress** (`docs/`), our own
  source of truth, then pushed to **dev.to** as drafts via `npm run blog:devto`
  (Forem API, idempotent per chapter). Upload elsewhere (Medium/blog) as desired.
- Cadence (e.g. one post/week) → how chapters are batched.
