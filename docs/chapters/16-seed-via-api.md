---
title: "Seed via API, Verify in UI (Playwright + TypeScript, Ch.16)"
description: "The pattern that makes UI suites fast and reliable, explained simply: create test data through the API in milliseconds, then check the browser renders it — and the reverse, act in the UI and verify through the API."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Seed via API, Verify in UI

This is the payoff of everything so far. Think about a UI test that checks "does an
article render on its page?" To get there *through the UI* you'd log in, open the
editor, fill four fields, and publish — **every single time**. That's slow, and worse:
if the editor form is flaky or gets redesigned, your *viewing* test breaks for a reason
that has nothing to do with viewing.

The integration pattern fixes it: **set up through the API, verify through the UI.**
The API is fast and stable; use it to get to the starting state, then let the browser
check only the one thing the test is actually about.

We already have the pieces — `makeArticle` from Chapter 14 creates an article in
milliseconds. Now we just point the browser at it.

> Code for this chapter is tagged `ch-16` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/ui/seed-via-api.spec.ts`.

## Create through the API, check in the browser

```ts
import { test, expect } from "@fixtures";

test("an article created through the API renders on its page", async ({
  makeArticle,
  page,
}) => {
  // 1. Set up the data through the API — one fast request.
  const article = await makeArticle({
    title: `Seeded via API ${Date.now()}`,
    body: "This article was created through the API and rendered by the UI.",
    tagList: ["integration"],
  });

  // 2. Point the browser straight at it.
  await page.goto(`/#/article/${article.slug}`);

  // 3. Verify what the UI actually renders.
  await expect(page.getByRole("heading", { name: article.title })).toBeVisible();
  await expect(page.getByText(article.body)).toBeVisible();
  await expect(page.getByRole("link", { name: "playwright" }).first()).toBeVisible();
});
```

`makeArticle` does an authenticated `POST` behind the scenes and returns the created
article (including its server-generated `slug`). We navigate straight to its page —
no form journey — and check what renders. And it's cleaned up automatically by the
fixture's teardown (Chapter 14).

Notice the **division of labour**: *viewing* an article is public, so this test needs
no logged-in browser. Only the *creation* is authenticated, and that's hidden inside
`makeArticle`. When a test does need to view *as a logged-in user* (to see authoring
buttons, say), combine this with the `storageState` from Chapter 15: seed via API,
load the saved session, verify in the UI.

## Why this is faster *and* more reliable

- **Faster.** An API `POST` is milliseconds; driving the editor form is seconds. Across
  a whole suite that's the difference between a 2-minute and a 10-minute run.
- **More reliable.** The setup no longer goes through the UI, so a flaky editor can't
  break a test about viewing. Each test fails for exactly **one** reason — the thing
  it asserts.
- **Focused.** The UI test checks one UI behaviour; the API's own correctness is
  covered by the Part 3 tests. No duplication.

## …and the reverse

The pattern runs both ways. When the *action* genuinely belongs in the UI (a user
clicks "Publish") but the *result* is data, **act in the UI and verify through the
API** — checking the real source of truth is stronger than reading the page's HTML:

```ts
// act in the UI…
await articleEditorPage.publishArticle(draft);
// …then verify through the API
const res = await api.get(`articles/${slug}`);
expect((await res.json()).article.title).toBe(draft.title);
```

Rule of thumb: **set up and verify through whichever layer is cheaper and more
authoritative; reserve the UI for the behaviour you specifically need to prove.**

## Next up

We've been writing test data inline. **Chapter 17 — Test data & environment config**
closes Part 4: data **factories** for inputs, and a clean multi-environment config so
the same suite runs against local, staging, or CI. Tag: `ch-17`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how much of your UI setup you've moved to the API.
