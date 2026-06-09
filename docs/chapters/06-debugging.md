---
title: "Debugging & Developer Experience (Playwright + TypeScript, Ch.6)"
description: "When a test fails, what do you actually do? A beginner-friendly tour of Playwright's debugging tools — UI mode, the trace viewer, the inspector, and codegen — with a clear when-to-use-which workflow."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Debugging & Developer Experience

Sooner or later a test fails with something like `expect(locator).toBeVisible()
failed`. What now? Guessing and re-running is slow and miserable. The good news:
Playwright ships an excellent set of tools that *show you exactly what happened*. This
is the chapter you'll come back to every time something breaks.

We add a handful of npm **scripts** so each tool is one short command. (A "script" in
`package.json` is just a saved command you run with `npm run <name>`.)

> Code for this chapter is tagged `ch-06` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `scripts` in
> `package.json` and the `reporter`/`trace` config in `playwright.config.ts`.

```jsonc
// package.json — "scripts" are shortcuts you run with `npm run <name>`
"scripts": {
  "test":        "playwright test",
  "test:ui":     "playwright test --ui",      // time-travel UI mode
  "test:debug":  "playwright test --debug",   // step through, line by line
  "test:report": "playwright show-report",    // open the last HTML report
  "codegen":     "playwright codegen http://localhost:3000"
}
```

## UI Mode — start here

```bash
npm run test:ui
```

UI Mode opens a little control panel: a list of every test, a live browser pane, and
a **time-travel timeline**. Run a test and you get one row per action (goto, fill,
click, assertion). **Hover any action and the browser pane jumps to that exact
moment** — you see the page as it was, plus the network requests, the console, and the
locator that was used. Change a test file and it re-runs automatically on save.

This is exactly how you'd catch the strict-mode flake from Chapter 3: step to the
failing assertion and the timeline highlights `getByRole('heading', { name: 'inkwell'
})` matching **two** elements — the banner *and* the "Welcome to Inkwell" article. The
bug becomes obvious in seconds instead of minutes.

## The Trace Viewer — for failures you didn't watch

UI Mode is great when you're sitting there. But what about a failure on **CI** (the
server that runs your tests automatically) that you didn't see? That's what a
**trace** is for.

> A **trace** is a complete recording of a test run — every action, DOM snapshots
> before and after, network calls, console logs, and the source line. You open it in
> a viewer and scrub through it like a video.

Our config records one automatically when a test fails and retries:

```ts
// playwright.config.ts
use: { trace: "on-first-retry", screenshot: "only-on-failure" }
```

`on-first-retry` is the production-friendly choice: no slowdown on passing runs, but
the moment a test fails and Playwright retries it, a full trace is captured. Open the
HTML report (which embeds the trace and a failure screenshot) with:

```bash
npm run test:report
```

To force a trace locally even without a retry, add `--trace on`:

```bash
npx playwright test article-editor --trace on
```

On CI you upload the `playwright-report/` folder as an "artifact" (a file the CI run
saves), download it, and open any failure's trace on your own machine. This is the
single biggest upgrade to debugging a flaky pipeline.

## The Inspector — step through live

```bash
npm run test:debug
```

`--debug` opens the **Playwright Inspector**, a debugger for your test. Execution
**pauses before each action**; you click "step" to run one command at a time and watch
the browser react. It also has a **locator picker** — hover the page and it tells you
the recommended locator for whatever you point at.

You can also pause at an exact spot in your own code:

```ts
await page.pause(); // execution stops here and hands you the Inspector
```

This is how you'd dissect the login redirect race from Chapter 5: pause right after
the submit click and watch the app fire its `navigate("/")` out from under you.

## Codegen — record locators, don't guess them

```bash
npm run codegen
```

`codegen` opens Inkwell and **writes test code as you click around**, automatically
choosing good role-based locators. It's not meant to produce finished tests — it's the
fastest way to discover *the right locator* for a fiddly element, which you then lift
into a Page Object. Treat its output as a first draft, never the final test.

## The VS Code extension

If you use VS Code, install the official **Playwright** extension. It puts the whole
loop in your editor: a ▶ icon next to each test to run or debug it, breakpoints in test
code, and "Pick locator" / "Record at cursor" buttons. It replaces most of the
command-line flags above with a click.

## A debugging workflow

When something breaks, in this order:

1. **`npm run test:ui`** — reproduce it and time-travel to the failing step.
2. **`npm run test:report`** — if it only fails on CI, open the trace from the
   downloaded artifact.
3. **`page.pause()` + `npm run test:debug`** — when you need to poke at the live page.
4. **`npm run codegen`** — when the real question is "what locator should this be?".

Notice none of these involve sprinkling `console.log` everywhere or adding
`waitForTimeout`. The tools show you the state directly — that's the whole point.

## Next up

That wraps **Part 1** — you can find elements, assert, model pages with Page Objects,
handle forms and dialogs, and debug all of it. **Part 2 is the heart of the course:**
we turn these Page Objects and our repeated setup into **fixtures**, so a test just
asks for `loginPage` (already built) or `user` (already created) and receives it.
**Chapter 7 — Custom fixtures: beyond `beforeEach`.** Tag: `ch-07`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which Playwright debugging tool you reach for first.
