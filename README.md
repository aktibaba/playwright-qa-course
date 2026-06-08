# Playwright + TypeScript QA Automation Course

Build a **production-grade Playwright + TypeScript** test automation framework —
covering **both API and UI** — against a real, dockerized app. Each chapter is one
post in a [dev.to series](https://dev.to/aktibaba/why-a-test-automation-framework-playwright-typescript-ch-1-3ion)
and carries a matching git tag (`ch-01`, `ch-02`, …) so you can check out the exact
state of the code at any point.

- **Written chapters** live in [`docs/`](docs/) (a VitePress site) and are published
  to dev.to.
- **The framework** lives in [`src/`](src/) and is tested against **Inkwell**, the
  dockerized system under test in [`sut/`](sut/).

## Quick start

You need [Node.js](https://nodejs.org/) 18+ and [Docker](https://www.docker.com/).

```bash
# 1. Clone
git clone https://github.com/aktibaba/playwright-qa-course.git
cd playwright-qa-course

# 2. Start the app under test (db + API + web), wait until healthy
cd sut && docker compose up -d --build --wait && cd ..
#   web → http://localhost:3000   api → http://localhost:3001/api

# 3. Install and run the tests
npm install
npx playwright install chromium
npm test
```

Handy scripts: `npm run test:ui` (time-travel UI mode), `npm run test:debug`
(inspector), `npm run test:report` (HTML report), `npm run codegen` (record
locators). Docs site: `npm run docs:dev`.

## Repo layout

```
playwright-qa-course/
├─ src/                     # the Playwright framework
│  ├─ fixtures/             #   custom fixtures (api, testUser, …) → @fixtures
│  ├─ pages/                #   Page Objects (LoginPage, ArticleEditorPage, …)
│  ├─ utils/                #   env and helpers
│  └─ tests/{api,ui}/       #   specs
├─ sut/                     # Inkwell — dockerized React + Express + Postgres app
├─ docs/                    # course chapters (VitePress) + planning
├─ scripts/devto-sync.mjs   # publish chapters to dev.to as drafts
├─ playwright.config.ts     # api + ui projects
└─ tsconfig.json            # @fixtures @pages @utils path aliases
```

## Chapters

Each chapter pairs prose with code at a git tag. Browse the code at any tag with
`git checkout ch-NN`, or open the tree on GitHub.

### Part 0 — Foundations

| Tag | Chapter | Read | Code |
|-----|---------|------|------|
| `ch-01` | Why a test automation framework? | [dev.to](https://dev.to/aktibaba/why-a-test-automation-framework-playwright-typescript-ch-1-3ion) · [source](docs/chapters/01-why-a-framework.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-01) |
| `ch-02` | Setup & your first UI + API tests | [dev.to](https://dev.to/aktibaba/setup-your-first-ui-api-tests-playwright-typescript-ch2-397l) · [source](docs/chapters/02-setup-and-first-tests.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-02) |

### Part 1 — UI Core

| Tag | Chapter | Read | Code |
|-----|---------|------|------|
| `ch-03` | Locators & web-first assertions | [dev.to](https://dev.to/aktibaba/locators-web-first-assertions-playwright-typescript-ch3-50oe) · [source](docs/chapters/03-locators-and-assertions.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-03) |
| `ch-04` | The Page Object Model | [dev.to](https://dev.to/aktibaba/the-page-object-model-playwright-typescript-ch4-2nbe) · [source](docs/chapters/04-page-object-model.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-04) |
| `ch-05` | Forms & native dialogs | [dev.to](https://dev.to/aktibaba/forms-native-dialogs-playwright-typescript-ch5-3nnk) · [source](docs/chapters/05-forms-and-dialogs.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-05) |
| `ch-06` | Debugging & developer experience | [dev.to](https://dev.to/aktibaba/debugging-developer-experience-playwright-typescript-ch6-404j) · [source](docs/chapters/06-debugging.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-06) |

### Part 2 — Fixtures & Architecture

| Tag | Chapter | Read | Code |
|-----|---------|------|------|
| `ch-07` | Custom fixtures: beyond `beforeEach` | [source](docs/chapters/07-custom-fixtures.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-07) |
| `ch-08` | POM-as-fixture & the `beforeAll` trap | [source](docs/chapters/08-pom-as-fixture.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-08) |
| `ch-09` | Fixture composition & a single import | [source](docs/chapters/09-composition-and-imports.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-09) |
| `ch-10` | Worker vs test scope & layer rules | [source](docs/chapters/10-scopes-and-layers.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-10) |

### Part 3 — API Testing

| Tag | Chapter | Read | Code |
|-----|---------|------|------|
| `ch-11` | `APIRequestContext` fundamentals | [source](docs/chapters/11-apirequestcontext.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-11) |
| `ch-12` | Auth & sessions for the API | [source](docs/chapters/12-api-auth.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-12) |
| `ch-13` | Building CRUD API suites | [source](docs/chapters/13-crud-suites.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-13) |
| `ch-14` | Scenario helpers: reusable provisioning | [source](docs/chapters/14-scenario-helpers.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-14) |

### Part 4 — Integrating API + UI

| Tag | Chapter | Read | Code |
|-----|---------|------|------|
| `ch-15` | Auth once with `storageState` | [source](docs/chapters/15-storage-state-auth.md) | [tree](https://github.com/aktibaba/playwright-qa-course/tree/ch-15) |

> Parts 3–6 (API testing, API+UI integration, scaling & CI, advanced & capstone)
> are on the way — see [`docs/planning/`](docs/planning/) for the full 25-chapter
> roadmap.

## How the content is published

Chapters are authored once in `docs/chapters/` and pushed to dev.to as drafts with
`npm run blog:devto` (Forem API, idempotent per chapter). See
[`scripts/devto-sync.mjs`](scripts/devto-sync.mjs).

## License

MIT — see [LICENSE](sut/LICENSE) for the SUT. Course content © its author.
