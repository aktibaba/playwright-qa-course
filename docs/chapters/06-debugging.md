---
title: "Debugging & Developer Experience (Playwright + TypeScript, Ch.6)"
description: "The tools that turn a cryptic failure into a five-minute fix: UI mode, the trace viewer, the inspector, and codegen. We debug the real races we hit earlier in the course."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Debugging & Developer Experience

A test fails on CI with `expect(locator).toBeVisible() failed`. Now what? Guessing
is slow and demoralizing. Playwright ships a genuinely excellent debugging
toolchain — this chapter is the one you'll come back to every time something breaks.
We added a few scripts to make it one command each.

> Code for this chapter is tagged `ch-06` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `scripts` in
> `package.json` and the `reporter`/`trace` config in `playwright.config.ts`.

```jsonc
// package.json
"scripts": {
  "test":        "playwright test",
  "test:ui":     "playwright test --ui",      // time-travel UI mode
  "test:debug":  "playwright test --debug",   // step-through inspector
  "test:report": "playwright show-report",    // open the last HTML report
  "codegen":     "playwright codegen http://localhost:3000"
}
```

## UI Mode — start here

```bash
npm run test:ui
```

UI Mode is a watch-mode cockpit: a list of every test, a live browser, and a
**time-travel timeline**. Hover any action and the browser snaps to that moment —
DOM, network, console, and the locator that was used, all at that step. Edit a test
and it re-runs on save.

This is exactly how you'd catch the strict-mode flake from Chapter 3. Stepping to
the failing assertion, the timeline shows `getByRole('heading', { name: 'inkwell'
})` highlighting **two** elements — the banner *and* the "Welcome to Inkwell"
article — making the substring-match bug obvious in seconds.

## The Trace Viewer — for failures you didn't watch

UI Mode is for local exploration. **Traces** are for failures you weren't there
for — especially on CI. Our config records one automatically:

```ts
// playwright.config.ts
use: { trace: "on-first-retry", screenshot: "only-on-failure" }
```

`on-first-retry` is the production-friendly setting: no overhead on green runs, but
the moment a test fails and retries, Playwright captures a full trace. A trace is a
zip with the complete timeline, DOM snapshots, network, console, and source. Open
the last HTML report (which embeds traces and the failure screenshot):

```bash
npm run test:report
```

To force a trace locally even without a retry:

```bash
npx playwright test article-editor --trace on
```

On CI, upload `playwright-report/` (or `test-results/`) as an artifact and you can
open any failure's trace on your own machine — the single biggest upgrade to
debugging flaky pipelines.

## The Inspector — step through live

```bash
npm run test:debug
```

`--debug` opens the **Playwright Inspector**: execution pauses before each action,
you step forward one command at a time, and a **locator picker** lets you hover the
page to get the exact recommended locator. Drop a breakpoint anywhere in code with:

```ts
await page.pause(); // halts here, hands you the Inspector
```

This is how you'd dissect the login redirect race from Chapter 5 — pause right after
the submit click and watch the app fire its `navigate("/")` out from under you.

## Codegen — record locators, don't guess them

```bash
npm run codegen
```

`codegen` opens Inkwell and **writes a test as you click**, choosing role-based
locators automatically. It's not for generating finished tests — it's the fastest
way to discover the *right locator* for a tricky element, which you then lift into a
Page Object. Treat its output as a first draft, never a final one.

## The VS Code extension

The official **Playwright** extension gives you the whole loop inside the editor:
run/debug a test from a gutter icon, set breakpoints in test code, and a "Pick
locator" / "Record at cursor" button. If you live in VS Code, install it — it
replaces most of the CLI flags above with a click.

## A debugging workflow

When something breaks, in order:

1. **`npm run test:ui`** — reproduce and time-travel to the failing step.
2. **`npm run test:report`** — if it only fails on CI, open the trace from the
   downloaded artifact.
3. **`page.pause()` + `npm run test:debug`** — when you need to poke the live page.
4. **`npm run codegen`** — when the real problem is "what locator should this be?".

Notice none of these involve sprinkling `console.log` or `waitForTimeout`. The
tools show you state directly.

## Next up

That wraps **Part 1** — you can locate, assert, model pages, handle forms and
dialogs, and debug all of it. **Part 2 is the heart of the course:** we turn these
Page Objects and our repeated setup into **fixtures**, so a test just asks for
`loginPage` (already constructed) or `user` (already seeded) and gets it.
**Chapter 7 — Custom fixtures: beyond `beforeEach`.** Tag: `ch-07`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which Playwright debugging tool you reach for first.
