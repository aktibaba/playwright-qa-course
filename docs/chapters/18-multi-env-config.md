---
title: "Multi-Environment Configuration (Playwright + TypeScript, Ch.18)"
description: "Part 5 begins. Wire the env module into Playwright's config so one suite targets local, CI, or staging — baseURLs, retries, workers, and timeouts all flowing from TEST_ENV and CI, with the active environment stamped into the report."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Multi-Environment Configuration

Welcome to **Part 5 — Scaling, Config & CI**. In Chapter 17 we built a typed `env`
module. Now we wire it into `playwright.config.ts` so the *entire* run adapts to its
target: the same suite, pointed at local, CI, or staging, with the right URLs and the
right resilience for each.

> Code for this chapter is tagged `ch-18` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `playwright.config.ts`.

## The config is a function of `env` and CI

Two inputs decide everything: which **environment** (`TEST_ENV`) and whether we're on
**CI**. Derive the rest from them:

```ts
// playwright.config.ts
import { env } from "./src/utils/env";

const isCI = !!process.env.CI;

// Remote environments are flakier (real network), so allow a retry; local stays
// at 0 to surface real failures immediately.
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

What each choice buys you:

- **`forbidOnly`** fails the build if someone left a `test.only` in — only enforced
  on CI, so it never gets in your way locally.
- **`retries`** absorbs genuine network flakiness on remote targets, while keeping
  **zero** locally so a flaky test is a signal, not noise.
- **`workers`** is pinned on CI (predictable, shared runners) and left to Playwright's
  CPU-based default locally.
- **`timeout` / `expect.timeout`** get more headroom for slower remote environments.
- **`metadata`** stamps the active environment into the HTML report — so you can
  always tell *what* a run was pointed at.

The per-project `baseURL` was already env-driven from earlier chapters:

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
CI=1 npm test                # CI mode: forbidOnly, 2 retries, 4 workers
```

Nothing in a test, Page Object, or fixture changes — they read `env`, and `env`
reads the environment. Configuration lives in exactly two files (`env.ts` and the
config), which is the whole point.

## Runtime-selected vs. a project per environment

You'll see suites that define **one Playwright project per environment** and run them
together. That's right when a single command must hit several environments at once
(e.g. a smoke check across regions). For the common case — "run *this* suite against
*that* environment" — a **runtime-selected** config like ours is simpler: no
duplicated projects, and the environment is a single, obvious input. Reach for
project-per-env only when you genuinely need concurrent targets.

## Next up

The config now scales across environments. **Chapter 19 — Parallelism & flake
control:** how Playwright parallelizes, where flakiness actually comes from (shared
state, timing, order), and the knobs — workers, `fullyParallel`, retries, isolation
— that keep a big suite fast *and* trustworthy. Tag: `ch-19`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how many environments your suite targets.
