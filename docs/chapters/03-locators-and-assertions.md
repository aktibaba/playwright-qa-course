---
title: "Locators & Web-First Assertions (Playwright + TypeScript, Ch.3)"
description: "The single most important Playwright skill: locating elements the way users perceive them, and letting auto-waiting assertions kill flakiness. With real examples against a live app."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Locators & Web-First Assertions

In [Chapter 2](https://github.com/aktibaba/playwright-qa-course) we wrote our first
tests and hit two bugs. Before we add more, we need the one skill everything else
rests on: **finding elements reliably**. Get this right and your tests survive
redesigns; get it wrong and they break every sprint.

> Code for this chapter is tagged `ch-03` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** —
> see `src/tests/ui/locators.spec.ts`.

## Locate the way a user perceives

The brittle instinct is to grab elements by their *structure* — CSS classes,
`nth-child`, XPath. All of that changes the moment a developer touches the markup.
Playwright's recommended locators instead target what a **user** (and a screen
reader) perceives: the role, the label, the visible text.

Use them in this order of preference:

1. **`getByRole`** — the role + accessible name (covers the vast majority of cases)
2. **`getByLabel`** — form fields by their `<label>`
3. **`getByPlaceholder`** — inputs without a label
4. **`getByText`** — non-interactive content
5. **`getByTestId`** — a deliberate `data-testid`, only when nothing semantic fits

Here's the top of the priority list, live against Inkwell's home page:

```ts
import { test, expect } from "@playwright/test";

test("prefer role-based locators over CSS", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Global Feed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "inkwell", exact: true }),
  ).toBeVisible();
});
```

That `exact: true` is not cosmetic — see the next section for the bug that
*forced* it.

`getByRole("button", { name: "Global Feed" })` asserts two things at once — that an
element with the *button* role exists and that its accessible name is "Global
Feed". If a dev swaps the `<div class="feed-btn">` for a real `<button>`, this
locator keeps working; a CSS selector wouldn't.

## Strict mode is your friend

Playwright locators are **strict**: if a locator matches more than one element, the
action throws instead of silently picking the first. That catches ambiguous tests
before they pick the wrong element in production.

Inkwell shows the brand "inkwell" as a link in **both** the navbar and the footer —
a perfect example:

```ts
test("strict mode forces you to disambiguate", async ({ page }) => {
  await page.goto("/");

  const brand = page.getByRole("link", { name: "inkwell", exact: true });
  await expect(brand).toHaveCount(2);   // two matches — a bare click would throw
  await expect(brand.first()).toBeVisible();
});
```

### The bug that exact-matching caught

By default, the `name` option does a **case-insensitive substring** match. That
bites you the moment real data shows up. Inkwell's seeded home feed contains an
article titled **"Welcome to Inkwell"** — so the loose locator
`getByRole("heading", { name: "inkwell" })` matched **two** headings: the banner
*and* the article title. The test passed when the feed was slow to load and failed
when it wasn't — a textbook flaky test.

```ts
// ❌ substring: also matches the article heading "Welcome to Inkwell"
page.getByRole("heading", { name: "inkwell" });

// ✅ exact: matches only the banner <h1>inkwell</h1>
page.getByRole("heading", { name: "inkwell", exact: true });
```

The same trap applies to the brand links above — `{ exact: true }` keeps the
article's "Welcome to Inkwell" link out of the count. When a name is a common word,
reach for `exact: true` (or a regex like `/^inkwell$/`).

`.first()` is the quick escape hatch, but the *better* fix is usually to **scope**
the search so it's unambiguous — locate within a region first:

```ts
// Only the navbar's brand link, unambiguous by construction.
const navBrand = page.getByRole("navigation").getByRole("link", { name: "inkwell" });
```

Scoping (locator chaining) is how you keep locators readable as pages grow.

## Web-first assertions: stop writing waits

The biggest source of flaky tests is timing — asserting before the app has
rendered. Playwright's `expect(locator)` matchers are **web-first**: they
**auto-wait and re-poll** until the condition is true or a timeout hits. You almost
never need `waitForTimeout`.

```ts
test("form locators: placeholder, role, and state", async ({ page }) => {
  await page.goto("/#/login");

  const email = page.getByPlaceholder("Email");
  const submit = page.getByRole("button", { name: "Login" });

  await expect(email).toBeVisible();      // waits for it to appear
  await expect(submit).toBeEnabled();     // waits for it to become enabled

  await email.fill("playwright@test.io");
  await expect(email).toHaveValue("playwright@test.io");
});
```

A few you'll reach for constantly: `toBeVisible`, `toHaveText`, `toHaveValue`,
`toHaveCount`, `toBeEnabled`, `toHaveURL`. Crucially, pass the **locator** to
`expect`, not a resolved value — `expect(locator).toHaveText("x")` re-polls, while
`expect(await locator.textContent()).toBe("x")` snapshots once and reintroduces the
flake you were trying to avoid.

## Filtering and scoping a list

Real pages have lists. After a reset, Inkwell's home feed shows the seeded
"Welcome to Inkwell" article. You locate *within* the list rather than by position:

```ts
// Each article preview is a card; find the one we want by its heading.
const card = page
  .locator(".article-preview")
  .filter({ hasText: "Welcome to Inkwell" });

await expect(card.getByRole("heading", { name: "Welcome to Inkwell" })).toBeVisible();
await expect(card.getByRole("link", { name: "alice" }).first()).toBeVisible();
```

> Note: `.article-preview` is a CSS locator — the card wrapper has no semantic
> role, so this is a legitimate use of CSS to *scope*, after which we go back to
> role locators *inside* it. CSS as a scalpel, not a crutch.

## The habits to keep

- Reach for `getByRole` first; drop down the list only when you must.
- Let strict mode push you toward **scoped**, unambiguous locators.
- Assert on **locators**, never on snapshotted values — auto-waiting is the whole
  point.
- Delete every `waitForTimeout` you're tempted to write.

## Run it

```bash
npx playwright test locators
```

```
  ✓  [ui] prefer role-based locators over CSS
  ✓  [ui] strict mode forces you to disambiguate
  ✓  [ui] form locators: placeholder, role, and state
  3 passed
```

## Next up

We now locate and assert cleanly — but the *steps* still live inside tests. In
**Chapter 4** we introduce the **Page Object Model**: wrapping these locators and
actions behind names like `loginPage.loginAs(user)`, so tests read as behavior and
a UI change has exactly one place to fix. Tag: `ch-04`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and share the worst CSS-selector test you've had to maintain.
