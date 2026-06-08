---
title: "Advanced: Network Mocking, Visual & Accessibility (Playwright + TypeScript, Ch.22)"
description: "Three new kinds of assertion on top of the framework: mock the network to test the UI in isolation, catch unintended visual changes with screenshot baselines, and scan for accessibility violations — fixing the real ones we find in the app."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Advanced: Network Mocking, Visual & Accessibility

Welcome to **Part 6**. The framework is solid; now we add three powerful kinds of
test that go beyond "click and assert text."

> Code for this chapter is tagged `ch-22` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/tests/ui/`:
> `network-mock.spec.ts`, `visual.spec.ts`, `a11y.spec.ts`.

## Network mocking — test the UI in isolation

`page.route` intercepts requests so the UI runs against a response **you** control.
That makes states that are awkward to set up in a real backend — empty, error,
exotic data — trivial and deterministic:

```ts
test("shows the empty state when the feed is empty", async ({ page }) => {
  await page.route("**/api/articles?*", (route) =>
    route.fulfill({ json: { articles: [], articlesCount: 0 } }),
  );
  await page.goto("/");
  await expect(page.getByText("Articles not available.")).toBeVisible();
});

test("survives an API error without crashing", async ({ page }) => {
  await page.route("**/api/articles?*", (route) =>
    route.fulfill({ status: 500, json: { errors: { body: ["boom"] } } }),
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
});
```

These need no database and no auth — the test owns the data. Use mocking for **UI
behavior on hard-to-produce responses**; keep real-backend integration tests
(Part 4) for the contract itself. Both, not either.

## Visual regression — catch the unintended

`toHaveScreenshot` pixel-compares a page against a committed baseline, catching
changes no text assertion would — a broken layout, a wrong color, a clipped button:

```ts
test("login page matches its baseline", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready); // avoid web-font swap flicker
  await expect(page).toHaveScreenshot("login.png", { maxDiffPixelRatio: 0.02 });
});
```

Two things make visual tests trustworthy instead of flaky:

- **Settle the page first.** Waiting on `document.fonts.ready` removes the most
  common cause of jitter — a screenshot taken mid web-font swap. A small
  `maxDiffPixelRatio` absorbs sub-pixel anti-aliasing.
- **Baselines are platform-specific.** A macOS baseline won't match Linux CI, so we
  `test.skip` visual specs on CI and document generating Linux baselines in the
  Playwright Docker image. Never commit a baseline from one OS and diff it on another.

## Accessibility — and real bugs we fixed

We scan with `@axe-core/playwright` and fail on serious/critical violations:

```ts
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa"])
  .exclude(".pagination") // third-party widget, see below
  .analyze();

const serious = results.violations.filter(
  (v) => v.impact === "serious" || v.impact === "critical",
);
expect(serious).toEqual([]);
```

The first run **failed** — and the violations were real:

- **Color contrast.** The navbar links (2.1:1), the banner subtitle, muted dates,
  and the green feed toggle (3.0:1) all fell short of WCAG AA's 4.5:1. We **fixed the
  app** (`sut/`): darkened the brand green and the muted greys to meet AA.
- **Orphaned list items** came from the `react-paginate` widget rendering its `<ul>`
  with `role="navigation"`. That's a **third-party** limitation we can't fix from app
  code, so we `.exclude(".pagination")` with a comment and would report it upstream —
  triaging what you don't own instead of letting it mask your own regressions.

This is the realistic a11y workflow: **scan, fix what's yours, triage the rest.** And
fixing contrast is a genuine product improvement, not just a green test.

## Next up

We've widened *what* we can assert. **Chapter 23 — Stability & maintainability at
scale:** the utilities and habits that keep a large suite trustworthy — taming
animations and async, safe waiting, and helpers that stop flakiness before it
starts. Tag: `ch-23`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which of the three — mocking, visual, or a11y — your suite is missing.
