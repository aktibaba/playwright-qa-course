# SUT (System Under Test) Plan — Dockerized, API + UI, Playwright-friendly

Goal: pick a **ready-made, open-source** full-stack app (don't build from scratch),
run it **in Docker**, and make sure it exercises **every API and UI testing
scenario** the course needs — while staying deterministic so Playwright never
fights flakiness.

---

## 1. Decision: which ready-made app?

Two finalists, both decoupled React + Node/TypeScript (matches the chosen stack).
Neither ships Docker — we add it (and that becomes course content).

| Criterion                         | **RealWorld "Conduit"** (recommended)             | Cypress Real-World App (RWA)                     |
|-----------------------------------|---------------------------------------------------|-------------------------------------------------|
| Frontend                          | React + Vite + SWC                                 | React + TypeScript + Vite + Material-UI + XState |
| Backend                           | Express.js + Sequelize                             | Express.js + TypeScript                          |
| **Database**                      | **PostgreSQL** ✅ (matches our stack)             | lowdb (local JSON)                              |
| Decoupled (separate web/api)      | ✅ (ports 3000 / 3001)                            | ✅ (ports 3000 / 3001)                          |
| **Formal API contract**          | ✅ RealWorld OpenAPI + Postman spec               | ❌ (undocumented internal endpoints)            |
| Built for test automation         | ⚠️ normal app (semantic HTML)                     | ✅ `data-test` everywhere, auto DB-reset        |
| UI widget richness                | medium (forms, lists, tabs, tag-chips)            | high (tables, dialogs, drawers, amount fields)  |
| Weight / complexity               | light                                             | heavier (MUI + XState state machine)            |
| Repo                              | `TonyMckes/conduit-realworld-example-app`         | `cypress-io/cypress-realworld-app`              |

### Recommendation → **RealWorld "Conduit" (Postgres)** as the primary SUT

Reasons:
1. **Exact stack match** — React (Vite) + Express + Sequelize + **PostgreSQL**,
   fully decoupled. This is what was chosen.
2. **A real, published API contract** (the RealWorld spec). The API-testing module
   can test against a documented contract — exactly how the production form.io
   framework tested a documented API. This is hard to overstate for a course.
3. **Rich-enough domain**: JWT auth, full CRUD, relationships (follow / favorite),
   pagination + filtering, tags, comments. Covers the API curriculum end to end.
4. **Light & fast** → quick container startup, deterministic, easy to dockerize.

We **augment** it (see §4) to close two gaps: (a) add `data-testid` hooks where
semantic selectors aren't enough, and (b) add a few richer UI widgets / a test
**reset endpoint** so the full UI curriculum (uploads, tables, dialogs) is covered.

> **Cypress RWA stays as our reference** for test-friendliness patterns
> (`data-test` selectors, per-test DB reset). If a Postgres stack turns out not to
> matter to you, RWA is the more automation-ready app out of the box — this is the
> one open decision left (see §8).

---

## 2. Why ready-made beats from-scratch here

- Zero time spent writing/maintaining app features — all effort goes into the
  **test framework + course content**.
- A real (if small) app surfaces real automation challenges: auth tokens,
  pagination, optimistic UI, validation, race conditions — teaching value.
- The RealWorld spec is implemented in 100+ stacks, so readers can repoint the
  same tests at another implementation later — reinforces the "tests vs. SUT"
  separation.

---

## 3. Dockerizing the SUT (we own this part)

The app ships without Docker, so we add a clean `docker-compose.yml` — this also
becomes a course chapter ("containerize your SUT for reproducible test runs").

```yaml
# docker-compose.yml (sut/)  — conceptual
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB: conduit }
    healthcheck: pg_isready ...        # api waits for this
    volumes: [ pgdata:/var/lib/postgresql/data ]

  api:
    build: ./backend                   # Express + Sequelize
    environment: { DATABASE_URL, JWT_SECRET, NODE_ENV }
    depends_on: { db: { condition: service_healthy } }
    command: sh -c "npm run sqlz -- db:create db:migrate db:seed:all && npm start"
    ports: [ "3001:3001" ]
    healthcheck: curl /api/tags        # web + tests wait for this

  web:
    build: ./frontend                  # React + Vite (served via nginx or vite preview)
    environment: { VITE_API_URL: http://localhost:3001/api }
    depends_on: { api: { condition: service_healthy } }
    ports: [ "3000:3000" ]

volumes: { pgdata: {} }
```

Principles that keep Playwright happy:
- **Healthchecks + `depends_on: condition: service_healthy`** → tests start only
  when the API and UI are truly ready (no arbitrary sleeps in CI).
- **Pinned image tags** (`postgres:16-alpine`) → reproducible.
- **A one-command up:** `docker compose up -d --wait` brings the whole SUT online.
- The SUT lives in its own folder (e.g. `sut/`) or a git submodule, separate from
  the test framework repo, so the boundary stays clean.

---

## 4. Making it deterministic & test-friendly (the "won't struggle" requirement)

This is the part we deliberately engineer so Playwright never fights the app.

1. **Seed + reset on demand.** Add a test-only endpoint
   `POST /api/test/reset` (guarded by `NODE_ENV=test`) that truncates tables and
   re-seeds a known fixture set. Tests call it (via API) for isolation — mirrors
   the Cypress RWA's per-test reseed and the form.io global-teardown idea.
   - Also expose `POST /api/test/seed` to create specific entities fast (so UI
     tests can "seed via API → verify in UI").
2. **Stable selectors.** Prefer `getByRole`/labels (the app's semantic HTML is
   decent). Where markup is ambiguous, add `data-testid` to the React components
   (small, surgical PRs to the SUT) — and teach *why* in the locators chapter.
3. **Deterministic data.** Seed users with fixed credentials & known content so
   assertions are stable. No random/time-based content unless a chapter
   intentionally teaches handling it.
4. **No animation flake.** Disable/reduce CSS transitions in the test build
   (or use Playwright's `reducedMotion`), and ensure loading states are explicit
   (spinners with roles) so `await expect(...).toBeVisible()` gates cleanly.
5. **Predictable auth.** JWT in a known header; a fixed `JWT_SECRET` in the test
   env so tokens are reproducible across runs.
6. **CORS open in test env** so the API context can call cross-origin freely.

---

## 5. API surface → maps to the API-testing module

The RealWorld API gives a complete, contract-backed surface:

| Endpoint                                   | Teaches                                  | Chapter |
|--------------------------------------------|------------------------------------------|---------|
| `POST /api/users` (register)               | create, validation errors (422)          | 11, 13  |
| `POST /api/users/login`                    | auth → JWT token extraction              | 12      |
| `GET /api/user` / `PUT /api/user`          | authed GET/PUT, 401 without token        | 12, 13  |
| `GET /api/profiles/:u` + follow/unfollow   | relationships, idempotency               | 13, 14  |
| `GET /api/articles` (?tag,author,limit,offset) | pagination, filtering, query params  | 13      |
| `GET /api/articles/feed`                   | authed personalized list                 | 15      |
| `POST/PUT/DELETE /api/articles/:slug`      | full CRUD, ownership (403), 404          | 13, 14  |
| `POST/GET/DELETE …/comments`               | nested resources                         | 13      |
| `POST/DELETE …/favorite`                   | toggle state, counts                     | 13      |
| `GET /api/tags`                            | simple read, smoke                       | 11      |

Covers: auth, CRUD, negative cases (401/403/404/422), pagination, filtering,
relationships, nested resources — the whole API curriculum, against a real spec.

---

## 6. UI surface → maps to the UI-testing module

| UI screen / widget                          | Teaches                                   | Chapter |
|---------------------------------------------|-------------------------------------------|---------|
| Sign up / Sign in forms                     | fills, validation errors, getByRole       | 3, 4    |
| Header nav (auth-conditional)               | state-dependent UI, navigation            | 4       |
| Home: global/your feed, tag filter, pager   | lists, tabs, pagination, filtering        | 5       |
| Article editor (title/body + **tag chips**) | dynamic add/remove inputs, forms          | 5       |
| Article view: favorite / follow / comments  | toggles, optimistic UI, create+delete     | 5, 16   |
| Profile: My / Favorited tabs                | tabs, conditional lists                   | 5       |
| Settings: update profile, logout            | prefilled forms, PUT side-effects         | 5, 16   |
| **(added)** confirm dialog + toast helpers  | dialogs, notifications                    | 5       |
| **(added)** avatar/image upload field       | file upload                               | 5       |
| **(added)** sortable articles table (admin) | tables: sort/filter/paginate              | 5       |

Items marked **(added)** are the small augmentations from §4 so the UI module's
"forms, tables, dialogs, uploads" chapter has first-class examples. If we'd rather
not modify the SUT, those examples move to the Cypress RWA (which already has
tables/dialogs/amount fields) — see §8.

---

## 7. Repo layout with the SUT included

```
pw-course/
├─ sut/                      # the dockerized RealWorld app (submodule or vendored)
│  ├─ backend/               #   Express + Sequelize + Postgres
│  ├─ frontend/              #   React + Vite
│  ├─ docker-compose.yml     #   we author this
│  └─ README.md              #   how to bring the SUT up
├─ src/                      # the Playwright framework (per COURSE-PLAN.md)
│  ├─ fixtures/  pages/  utils/  setup/  tests/{api,ui,e2e}/  fixtures-data/
├─ docs/                     # course chapters
└─ .github/workflows/        # CI brings up SUT (compose) then runs tests
```

`npm run sut:up` (compose up --wait) → `npm test` → `npm run sut:down`.
CI does the same: spin the SUT, run the sharded suite, tear down.

---

## 8. The one open decision before we build

Everything above assumes **RealWorld Conduit (Postgres)** as primary. Confirm, or
switch:

- **A) RealWorld Conduit (Postgres)** — *recommended.* Matches your stack, real API
  contract; we add a reset endpoint + a few `data-testid`s + 3 small UI widgets.
- **B) Cypress RWA** — most automation-ready out of the box (data-test everywhere,
  per-test reset, richer widgets), TypeScript end-to-end — but lowdb instead of
  Postgres and a heavier MUI/XState frontend.
- **C) Conduit primary + RWA as a secondary "advanced widgets" SUT** — best
  coverage, slightly more setup (two SUTs in compose).

Once you pick, next steps are: fork/vendor the SUT → write `docker-compose.yml` +
healthchecks → add the test reset/seed endpoint → verify `docker compose up --wait`
brings it online → then scaffold the framework (COURSE-PLAN.md Ch 2).
