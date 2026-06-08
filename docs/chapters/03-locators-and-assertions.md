---
title: "Locators & Web-First Assertions (Playwright + TypeScript, Ch.3)"
description: "The single most important Playwright skill, explained from scratch: how to find elements the way users perceive them, and how auto-waiting assertions remove flaky tests. With real examples and the bug they caught."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Locators & Web-First Assertions

In [Chapter 2](https://github.com/aktibaba/playwright-qa-course) we wrote our first
tests. Before we add more, we need the one skill everything else rests on: **finding
elements on the page reliably**. Get this right and your tests survive redesigns; get
it wrong and they break every week.

## First, two words: *element* and *locator*

A web page is made of **elements** — a button, a text input, a heading, a link. In
your tests you constantly need to point at one and say "click this" or "check this".

A **locator** is Playwright's object that describes *how to find* an element. The key
thing: a locator is **lazy**. Creating one (`page.getByRole(...)`) doesn't search the
page yet — Playwright finds the element only when you act on it (click, fill, assert).
That laziness is what makes the auto-waiting later possible.

The classic way to find elements is a **CSS selector** (like `.login-btn` or
`#email`) or **XPath**. The problem: those describe the page's *internal structure* —
class names, nesting — which developers change all the time. The moment someone
renames `.login-btn`, your test breaks, even though the button still works fine.

## Locate the way a user perceives

Playwright's recommended locators target what a **person** (and a screen reader)
perceives, not the markup: the element's **role** and its **visible text**.

> A **role** is what an element *is* for accessibility — `button`, `link`, `heading`,
> `textbox`, `checkbox`. Browsers assign roles automatically (a `<button>` has role
> `button`), and assistive tech relies on them. Targeting the role means your test
> finds the element the same way a screen-reader user would.

Use these locators in order of preference:

1. **`getByRole`** — role + visible name. Covers the large majority of cases.
2. **`getByLabel`** — form fields by their `<label>` text.
3. **`getByPlaceholder`** — inputs that only have placeholder text.
4. **`getByText`** — non-interactive content (a paragraph, a message).
5. **`getByTestId`** — a deliberate `data-testid` attribute, used **only** when
   nothing semantic fits.

Here's the top of that list, live against Inkwell's home page:

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

`getByRole("button", { name: "Global Feed" })` checks **two** things at once: that an
element with the *button* role exists, and that its name is "Global Feed". If a
developer later swaps a `<div>` for a real `<button>`, this locator keeps working —
a CSS selector tied to the old class wouldn't. (That `exact: true` matters — the next
section explains the bug that forced it.)

## Strict mode is your friend

Playwright locators are **strict**: if your locator matches **more than one** element,
the action throws an error instead of silently using the first match. That feels
annoying at first, but it's a gift — it catches "wait, *which* button?" bugs before
they pick the wrong element.

Inkwell shows the brand "inkwell" as a link in **both** the navbar and the footer — so
a locator for it matches two elements:

```ts
test("strict mode forces you to disambiguate", async ({ page }) => {
  await page.goto("/");

  const brand = page.getByRole("link", { name: "inkwell", exact: true });
  await expect(brand).toHaveCount(2);   // two matches — a plain click would throw
  await expect(brand.first()).toBeVisible();
});
```

### The bug that exact-matching caught

By default, the `name` option does a **case-insensitive, partial** match — it matches
if the name *contains* your text. That bites you the moment real data appears.
Inkwell's seeded home feed has an article titled **"Welcome to Inkwell"** — so the
loose locator `getByRole("heading", { name: "inkwell" })` matched **two** headings:
the page banner *and* the article title. The test passed when the feed loaded slowly
and failed when it loaded quickly — a textbook **flaky** test (one that passes and
fails without the code changing).

```ts
// ❌ partial match: also matches the article heading "Welcome to Inkwell"
page.getByRole("heading", { name: "inkwell" });

// ✅ exact match: only the banner <h1>inkwell</h1>
page.getByRole("heading", { name: "inkwell", exact: true });
```

When a name is a short, common word, reach for `exact: true` (or a regular expression
like `/^inkwell$/`, which means "exactly inkwell, start to end").

`.first()` is a quick escape hatch when you genuinely have several matches, but the
*better* fix is usually to **scope** — search inside a region first:

```ts
// Only the navbar's brand link — unambiguous by construction.
const navBrand = page.getByRole("navigation").getByRole("link", { name: "inkwell" });
```

Chaining locators (find a region, then find inside it) keeps things clear as pages
grow.

## Web-first assertions: stop writing waits

The #1 cause of flaky UI tests is **timing** — checking something before the app has
finished rendering it. Web apps update *over time* (data loads, animations run), so a
naive "check now" often checks too early.

Playwright's `expect(locator)` assertions are **web-first**: they **automatically
wait and re-check** until the condition becomes true or a timeout (default 5s) runs
out. You almost never write a manual wait.

```ts
test("form locators: placeholder, role, and state", async ({ page }) => {
  await page.goto("/#/login");

  const email = page.getByPlaceholder("Email");
  const submit = page.getByRole("button", { name: "Login" });

  await expect(email).toBeVisible();      // waits until it appears
  await expect(submit).toBeEnabled();     // waits until it's clickable

  await email.fill("playwright@test.io");
  await expect(email).toHaveValue("playwright@test.io");
});
```

You'll use these constantly: `toBeVisible`, `toHaveText`, `toHaveValue`,
`toHaveCount`, `toBeEnabled`, `toHaveURL`.

**One rule that prevents a whole class of flakiness:** pass the **locator** to
`expect`, not an already-read value.

```ts
await expect(locator).toHaveText("Hello");          // ✅ re-checks until it matches
expect(await locator.textContent()).toBe("Hello");  // ❌ reads ONCE, can be too early
```

The first keeps polling; the second takes a single snapshot and brings the flake
right back.

## Filtering and scoping a list

Real pages have lists. After a reset, Inkwell's home feed shows the seeded "Welcome to
Inkwell" article. Locate the item you want *by its content*, not its position:

```ts
// Each article preview is a card; find the one we want by its heading text.
const card = page
  .locator(".article-preview")
  .filter({ hasText: "Welcome to Inkwell" });

await expect(card.getByRole("heading", { name: "Welcome to Inkwell" })).toBeVisible();
await expect(card.getByRole("link", { name: "alice" }).first()).toBeVisible();
```

> `.article-preview` is a CSS locator — the card wrapper has no semantic role, so
> using CSS just to *scope* to the card is fine. Then we go back to role locators
> *inside* it. Think of CSS as a scalpel, not a crutch.

## The habits to keep

- Reach for `getByRole` first; only drop down the list when you must.
- Let strict mode push you toward **scoped**, unambiguous locators.
- Assert on **locators**, never on values you already read — auto-waiting is the
  whole point.
- Delete every `waitForTimeout` you're tempted to write; there's almost always a
  web-first assertion that does it properly.

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

We can now find elements and assert on them cleanly — but the *steps* still live
inside the tests. In **Chapter 4** we introduce the **Page Object Model**: wrapping
these locators and actions behind names like `loginPage.loginAs(user)`, so tests read
as behaviour and a UI change has exactly one place to fix. Tag: `ch-04`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and share the worst CSS-selector test you've ever had to maintain.
