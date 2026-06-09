---
title: "Parallelism & Flake Control (Playwright + TypeScript, Ch.19)"
description: "What 'flaky' really means and where it comes from, explained simply — plus how Playwright runs tests in parallel and the knobs that keep a big suite both fast and trustworthy, illustrated with the real races we fixed in this course."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Parallelism & Flake Control

A fast suite runs tests **in parallel** (many at once). But parallelism is also where
**flaky** tests are born.

> A **flaky** test is one that sometimes passes and sometimes fails *without the code
> changing*. It's the most corrosive thing in a test suite — once people stop trusting
> a red result, the suite stops protecting anything.

The good news: we've already met (and fixed) the main causes earlier in this course.
This chapter names the model and turns those fixes into principles.

> Code for this chapter is tagged `ch-19` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `test:flake` script in
> `package.json` and the parallelism config in `playwright.config.ts`.

## How Playwright parallelizes

- **Workers** are separate processes. Playwright starts several (CPU-based locally; we
  pin `workers: 4` on CI) and spreads tests across them, so many run at the same time.
- **Isolation is automatic** — *for the browser*. Each test gets its own browser
  context and `page` (its own cookies, storage, cache), so tests can't see each other's
  browser state.
- **`fullyParallel: true`** spreads tests *within* a file across workers too, for
  maximum concurrency.

Here's the catch: Playwright isolates the **browser** for you, but it **can't** isolate
**shared external state** — one database, one backend. That's where flake lives.

## Where flake actually comes from

Every flaky test we hit in this course was one of four things:

1. **Shared mutable state.** Parallel API tests each reset the database, wiping it out
   from under a test that was mid-read (Chapter 11). *Fix:* seed once in `globalSetup`;
   no test resets. Don't share mutable state — or access it in order.
2. **Imprecise locators / assertions.** `getByRole("heading", { name: "inkwell" })`
   also matched the "Welcome to Inkwell" article heading, so it passed or failed
   depending on how fast the feed loaded (Chapter 3). *Fix:* `{ exact: true }`.
   Ambiguity plus timing equals flake.
3. **Races with the app.** Navigating right after login raced the app's *asynchronous*
   redirect (Chapter 5). *Fix:* wait for a real signal (the login form disappearing),
   never assume an async action has finished.
4. **Order / collision.** Two tests creating an article with the same title clashed.
   *Fix:* unique data per test (`Date.now()`) and clean up what you create.

Notice none of these were "Playwright being unreliable." They were shared state,
timing, and ambiguity — the universal causes of flakiness anywhere.

## The knobs (and when to reach for them)

- **`fullyParallel` + `workers`** — turn concurrency up. Leave these on by default.
- **`test.describe.configure({ mode: "serial" })`** — force a group of tests to run
  one at a time, in order. A scalpel for tests that *must* share state — not a default.
- **Project `dependencies`** — order whole phases (our `ui` waits for `api` + `setup`)
  so cross-project state can't race.
- **Per-test isolation** — the real cure: unique data + cleanup (the `makeArticle`
  factory), so tests never contend in the first place.
- **`retries`** — the *last* resort.

> Retries **hide** flake; they don't fix it. They're a safety net for genuinely
> non-deterministic *infrastructure* (a network blip on a remote run), not a substitute
> for fixing a data race in your own tests. We keep retries at **0 locally** precisely
> so flake stays visible and gets fixed.

## Hunt flake before CI does

A test that fails 1 run in 50 will eventually turn your pipeline red at the worst
moment. Surface it on purpose by running each test many times:

```bash
npm run test:flake        # playwright test --repeat-each=5
```

`--repeat-each=5` runs every test five times. Combine it with `--trace on` and the
trace viewer (Chapter 6) to see exactly what diverged on the run that failed. If a test
survives `--repeat-each=20` under load, it's stable; if it doesn't, you've found a real
bug to fix — not a retry to paper over it.

## Next up

We can run fast *and* trustworthy. **Chapter 20 — Reporters & observability:** make
results legible — the HTML report, JUnit for CI, and attaching traces so a failure
tells you what happened without a re-run. Tag: `ch-20`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the last flaky test you chased down — and what caused it.
