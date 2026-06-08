---
title: "Parallelism & Flake Control (Playwright + TypeScript, Ch.19)"
description: "How Playwright parallelizes, where flakiness actually comes from, and the knobs that keep a big suite fast and trustworthy — illustrated with the real races we hit and fixed earlier in this course."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Parallelism & Flake Control

A fast suite is a parallel suite — and parallelism is where flakiness is born. The
good news: we've already met (and fixed) the main culprits in this course. This
chapter names the model and turns those fixes into principles.

> Code for this chapter is tagged `ch-19` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `test:flake` script
> in `package.json` and the parallelism config in `playwright.config.ts`.

## How Playwright parallelizes

- **Workers** are separate processes. Playwright spins up several (CPU-based
  locally; we pin `workers: 4` on CI) and distributes tests across them.
- **Isolation** is automatic: each test gets its own `BrowserContext` and `page` —
  separate cookies, storage, and cache. Tests can't see each other's browser state.
- **`fullyParallel: true`** spreads tests *within* a file across workers too, not
  just files. Maximum concurrency.

That isolation is real — for the **browser**. What Playwright *can't* isolate for
you is **shared external state**: one database, one backend. That's where flake lives.

## Where flake actually comes from

Every flaky test we hit in this course fell into one of four buckets:

1. **Shared mutable state.** Parallel API tests each called `/test/reset`, dropping
   the schema while another test was mid-read (Ch.11). *Fix:* seed once in
   `globalSetup`; no test resets. Don't share mutable state — or serialize access to
   it.
2. **Imprecise locators / assertions.** `getByRole("heading", { name: "inkwell" })`
   substring-matched the seeded "Welcome to Inkwell" heading, so it passed or failed
   depending on feed timing (Ch.3). *Fix:* `{ exact: true }`. Ambiguity + timing =
   flake.
3. **Races with the app.** Navigating right after login raced the app's async
   `navigate("/")` redirect (Ch.5). *Fix:* wait for a real signal (the login form
   unmounting) instead of assuming. Never assume an async action has finished.
4. **Order / collision.** Two tests creating an article with the same title
   collided. *Fix:* unique data per test (`Date.now()`) and clean up what you create.

Notice none of these were "Playwright being flaky." They were shared state, timing,
and ambiguity — the universal sources.

## The knobs (and when to reach for them)

- **`fullyParallel` + `workers`** — turn concurrency up. Default to on.
- **`test.describe.configure({ mode: "serial" })`** — serialize tests that *must*
  share state in order. A scalpel, not a default (we used it only for the API health
  spec).
- **Project `dependencies`** — order whole phases (our `ui` waits for `api` + `setup`)
  so cross-project state doesn't race.
- **Per-test isolation** — the real cure: unique data + cleanup (the `makeArticle`
  factory), so tests never contend in the first place.
- **`retries`** — the *last* resort. They hide flake; they don't fix it.

> Retries are a safety net for genuinely non-deterministic infrastructure (network
> blips on a remote env), not a substitute for fixing a data race. We keep retries
> at **0 locally** precisely so flake stays visible.

## Hunt flake before CI does

A test that fails 1 run in 50 will eventually redden your pipeline. Surface it on
purpose by running each test many times:

```bash
npm run test:flake        # playwright test --repeat-each=5
```

Combine with `--trace on` and the trace viewer (Chapter 6) to see exactly what
diverged on the failing iteration. If a test passes `--repeat-each=20` under load,
it's stable; if it doesn't, you have a real bug to fix, not a retry to add.

## Next up

We can run fast and trustworthy. **Chapter 20 — Reporters & observability:** make
results *legible* — the HTML report, JUnit for CI, and attaching traces and context
so a failure tells you what happened without a re-run. Tag: `ch-20`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the last flaky test you chased down — and what caused it.
