---
title: "Advanced: Network Mocking, Visual & Accessibility (Playwright + TypeScript, Ch.22)"
description: "Three new kinds of test, explained from scratch: fake the network to test the UI in isolation, catch visual changes with screenshot baselines, and scan for accessibility problems — fixing the real ones we find in the app."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Advanced: Network Mocking, Visual & Accessibility

Welcome to **Part 6**. The framework is solid; now we add three powerful kinds of test
that go beyond "click and check the text."

> Code for this chapter is tagged `ch-22` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/tests/ui/`:
> `network-mock.spec.ts`, `visual.spec.ts`, `a11y.spec.ts`.

## Network mocking — test the UI in isolation

**Mocking** the network means *intercepting* the app's requests and replying with a
fake response **you** write. `page.route(pattern, handler)` catches matching requests;
`route.fulfill(...)` answers them. That makes states which are awkward to set up for
real — an empty list, a server error, weird data — trivial and 100% predictable:

```ts
test("shows the empty state when the feed is empty", async ({ page }) => {
  // Intercept the articles request and pretend the list is empty.
  await page.route("**/api/articles?*", (route) =>
    route.fulfill({ json: { articles: [], articlesCount: 0 } }),
  );
  await page.goto("/");
  await expect(page.getByText("Articles not available.")).toBeVisible();
});

test("survives an API error without crashing", async ({ page }) => {
  // Pretend the server returned a 500 error.
  await page.route("**/api/articles?*", (route) =>
    route.fulfill({ status: 500, json: { errors: { body: ["boom"] } } }),
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible(); // app still works
});
```

(The `**/api/articles?*` is a glob pattern — `**` matches anything, so this catches the
articles request whatever its full URL.) These tests need no database and no login — the
test owns the data. Use mocking for **UI behaviour on hard-to-produce responses**; keep
the real-backend integration tests from Part 4 for the contract itself. You want both.

## Visual regression — catch the unintended

A **visual regression** test takes a screenshot and compares it pixel-by-pixel against a
saved reference image (the **baseline**). It catches things no text assertion would — a
broken layout, a wrong colour, a button clipped off the edge:

```ts
test("login page matches its baseline", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready); // wait for web fonts to load
  await expect(page).toHaveScreenshot("login.png", { maxDiffPixelRatio: 0.02 });
});
```

The first run *creates* the baseline; later runs compare against it. Two things keep
visual tests trustworthy instead of flaky:

- **Let the page settle first.** Waiting on `document.fonts.ready` avoids the most
  common cause of false differences — a screenshot taken while a web font is still
  swapping in. `maxDiffPixelRatio: 0.02` tolerates tiny (2%) rendering differences.
- **Baselines are platform-specific.** Text renders slightly differently on macOS vs
  Linux, so a macOS baseline won't match a Linux CI machine. We `test.skip` visual tests
  on CI and generate Linux baselines separately. **Never** diff a baseline made on one OS
  against another.

## Accessibility — and real bugs we fixed

**Accessibility (a11y)** is whether people using assistive tech — screen readers,
keyboard-only navigation — can use the app. The **WCAG** standard defines rules (e.g.
text must have enough colour contrast). The `@axe-core/playwright` library scans a page
and reports violations; we fail the test on serious ones:

```ts
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa"])        // which rule sets to check
  .exclude(".pagination")                 // skip a third-party widget (see below)
  .analyze();

const serious = results.violations.filter(
  (v) => v.impact === "serious" || v.impact === "critical",
);
expect(serious).toEqual([]);              // expect NO serious violations
```

The first run **failed** — and the violations were real:

- **Colour contrast.** The navbar links (contrast 2.1:1), the banner subtitle, muted
  dates, and the green feed toggle (3.0:1) all fell short of WCAG AA's required 4.5:1.
  We **fixed the app** (`sut/`): darkened the brand green and the muted greys to pass.
- **Orphaned list items** came from the third-party `react-paginate` widget rendering its
  `<ul>` with `role="navigation"`. We can't fix that from our app code, so we
  `.exclude(".pagination")` with a comment and would report it upstream.

That's the realistic a11y workflow: **scan, fix what's yours, triage what isn't.** And
fixing contrast is a genuine improvement for real users, not just a green test.

## Next up

We've widened *what* we can check. **Chapter 23 — Stability & maintainability at
scale:** the small utilities and habits that keep a large suite trustworthy as it grows.
Tag: `ch-23`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which of the three — mocking, visual, or a11y — your suite is missing.
