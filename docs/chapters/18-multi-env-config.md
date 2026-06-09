---
title: "Multi-Environment Configuration (Playwright + TypeScript, Ch.18)"
description: "Part 5 begins. Wire the env module into Playwright's config so one suite targets local, CI, or staging — base URLs, retries, workers, and timeouts all flowing from a single switch. What CI is and what each config option does, for beginners."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Multi-Environment Configuration

Welcome to **Part 5 — Scaling, Config & CI**. In Chapter 17 we built a typed `env`
module. Now we wire it into `playwright.config.ts` so the *whole run* adapts to where
it's pointed — the same suite against local, CI, or staging, each with the right URLs
and the right resilience.

> **CI** ("Continuous Integration") is a service — like GitHub Actions — that runs your
> tests automatically every time someone pushes code. It's a different, often slower
> machine than your laptop, so it sometimes needs different settings.

> Code for this chapter is tagged `ch-18` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `playwright.config.ts`.

## The config is a function of `env` and CI

Two inputs decide everything: which **environment** (`TEST_ENV`), and whether we're
running on **CI**. We derive the rest from them:

```ts
// playwright.config.ts
import { env } from "./src/utils/env";

const isCI = !!process.env.CI;        // true when running on CI

// Remote environments are flakier (real network), so allow a retry; local stays
// at 0 so a flaky test is visible immediately.
const retries = isCI ? 2 : env.name === "staging" ? 1 : 0;

export default defineConfig({
  forbidOnly: isCI,
  retries,
  workers: isCI ? 4 : undefined,
  timeout: env.name === "local" ? 30_000 : 60_000,
  expect: { timeout: env.name === "local" ? 5_000 : 10_000 },
  metadata: { environment: env.name, webURL: env.webURL, apiURL: env.apiURL },
  // ...
});
```

A couple of syntax notes for newcomers: `!!process.env.CI` turns the value into a plain
`true`/`false`. `a ? b : c` is a *ternary* — "if `a`, use `b`, otherwise `c`."

What each option does:

- **`forbidOnly`** — fails the build if someone left a `test.only` in the code (which
  would silently skip every other test). Enforced **only on CI**, so it never blocks
  you while you focus on one test locally.
- **`retries`** — if a test fails, run it again up to N times before calling it failed.
  We allow retries on remote/CI runs (real network blips happen) but keep **0
  locally**, so a flaky test is a signal you investigate, not noise you ignore.
- **`workers`** — how many tests run in parallel. Pinned to 4 on CI (predictable shared
  machines), left to Playwright's CPU-based default locally.
- **`timeout` / `expect.timeout`** — how long a test (and an assertion) may take before
  giving up. More headroom for slower remote environments.
- **`metadata`** — extra info stamped into the report, so you can always see *which
  environment* a run was pointed at.

The per-project `baseURL` already came from `env` in earlier chapters:

```ts
projects: [
  { name: "api",   use: { baseURL: env.apiURL } },
  { name: "setup", use: { baseURL: env.webURL } },
  { name: "ui",    use: { baseURL: env.webURL, ...devices["Desktop Chrome"] } },
],
```

## One switch flips the whole run

```bash
npm test                     # local: localhost, 0 retries, fast timeouts
TEST_ENV=staging npm test    # staging URLs, 1 retry, longer timeouts
CI=1 npm test                # CI mode: forbidOnly on, 2 retries, 4 workers
```

Nothing in a test, Page Object, or fixture changes — they read `env`, and `env` reads
the environment variables. All the configuration lives in just two files (`env.ts` and
the config). That's the whole point.

## Runtime-selected vs. a project per environment

You'll sometimes see suites that define **one Playwright project per environment** and
run them together. That's right when a *single command* must hit several environments
at once (a smoke check across regions, say). For the common case — "run *this* suite
against *that* environment" — a **runtime-selected** config like ours is simpler: no
duplicated projects, and the environment is one obvious input. Reach for
project-per-env only when you truly need to target several at the same time.

## Next up

The config now scales across environments. **Chapter 19 — Parallelism & flake
control:** how Playwright runs tests in parallel, where flakiness *actually* comes
from, and the knobs that keep a big suite both fast and trustworthy. Tag: `ch-19`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how many environments your suite targets.
