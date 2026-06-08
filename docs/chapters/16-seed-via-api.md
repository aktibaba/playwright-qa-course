---
title: "Seed via API, Verify in UI (Playwright + TypeScript, Ch.16)"
description: "The integration pattern that makes UI suites fast and reliable: create test data through the API in milliseconds, then assert the browser renders it. Plus the reverse — act in the UI, verify through the API."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Seed via API, Verify in UI

This is the payoff of everything so far. A UI test usually cares about **one**
behavior — does this article render? — but reaching that state through the UI means
logging in, opening the editor, filling four fields, and publishing, every single
time. That's slow and, worse, it makes the test fail for reasons unrelated to what
it's checking.

The integration pattern fixes it: **do setup through the API, verify through the
UI.** We already have the pieces — `makeArticle` (Chapter 14) creates data in
milliseconds; now we just point the browser at it.

> Code for this chapter is tagged `ch-16` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/ui/seed-via-api.spec.ts`.

## Create through the API, assert in the browser

```ts
import { test, expect } from "@fixtures";

test("an article created through the API renders on its page", async ({
  makeArticle,
  page,
}) => {
  const article = await makeArticle({
    title: `Seeded via API ${Date.now()}`,
    body: "This article was created through the API and rendered by the UI.",
    tagList: ["integration"],
  });

  await page.goto(`/#/article/${article.slug}`);

  await expect(page.getByRole("heading", { name: article.title })).toBeVisible();
  await expect(page.getByText(article.body)).toBeVisible();
  await expect(page.getByRole("link", { name: "playwright" }).first()).toBeVisible();
});
```

`makeArticle` does an authenticated `POST` and hands back the created article
(including its server-generated `slug`); we navigate straight to its page and check
what the UI actually renders. Setup is one fast request instead of a multi-step form
journey — and it's automatically cleaned up by the fixture's teardown.

Note the **division of labor**: viewing an article is public, so this test needs no
logged-in browser. Only the *creation* is authenticated, and that's hidden inside
`makeArticle`. When a test needs to view *as a logged-in user* (to see authoring
controls, say), combine this with the `storageState` from Chapter 15 — seed via API,
load the saved session, verify in UI.

## Why this is faster *and* more reliable

- **Faster.** An API `POST` is milliseconds; driving the editor form is seconds.
  Across a suite, that's the difference between a 2-minute and a 10-minute run.
- **More reliable.** The setup path no longer goes through the UI, so a flaky editor
  or a redesigned form can't break a test about *viewing*. Each test fails for one
  reason — the thing it actually asserts.
- **Focused.** The UI test verifies exactly one UI behavior; the API's correctness is
  covered by the Part 3 suites.

## …and the reverse

The pattern runs both ways. When the *action* belongs in the UI (a user clicks
something) but the *outcome* is data, **act in the UI and verify through the API** —
it's a far stronger assertion than scraping the DOM:

```ts
// act in the UI…
await articleEditorPage.publishArticle(draft);
// …then verify the source of truth via the API
const res = await api.get(`articles/${slug}`);
expect((await res.json()).article.title).toBe(draft.title);
```

Rule of thumb: **set up and verify through whichever layer is cheaper and more
authoritative; reserve the UI for the behavior you specifically need to prove.**

## Next up

We've been hard-coding test data inline. **Chapter 17 — Test data & environment
config** closes Part 4: factories and fixtures-data for inputs, and a clean
multi-environment config so the same suite runs against local, staging, or CI. Tag:
`ch-17`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how much of your UI setup you've moved to the API.
