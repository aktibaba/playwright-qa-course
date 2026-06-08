---
title: "Capstone: A 100-Test Suite, End to End (Playwright + TypeScript, Ch.26)"
description: "Tie it all together: full end-to-end journeys, broad API and UI coverage, and a recap of the seven real bugs the suite found in the app. A complete, deterministic 100-test framework — and where to take it next."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Capstone: A 100-Test Suite, End to End

This is where everything comes together. Over the course we built a layered Playwright
+ TypeScript framework — fixtures, Page Objects, API + UI + integration tests, CI,
reporting — against a real dockerized app. The capstone makes it whole: end-to-end
journeys, broad coverage, and a suite that's **green, fast, and deterministic**.

```
── Run summary ───────────────────────────────
  result:   passed
  tests:    100  (✓ 100  ✘ 0  ⤿ flaky 0  – skipped 0)
  projects: setup 1  api 66  ui 33
```

> Code for this chapter is tagged `ch-26` in the repo:
> **https://github.com/aktibaba/playwright-qa-course**.

## End-to-end journeys

The headline tests exercise the **whole product** the way a user does — and each owns
a fresh identity, so it's fully isolated:

```ts
test("a new user signs up, publishes an article, and sees it on their profile", async ({
  signUpPage, articleEditorPage, articlePage, page,
}) => {
  const username = uniqueId("author").replace(/-/g, "");
  await signUpPage.signUp({ username, email: `${username}@test.io`, password: "Password123!" });

  const title = `Capstone article ${Date.now()}`;
  await articleEditorPage.publishArticle({ title, description: "…", body: "…", tags: "capstone" });

  await articlePage.expectTitle(title);
  await page.goto(`/#/profile/${username}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
```

Sign up → author → view → profile, all through the UI, reusing every Page Object and
fixture we built. The marginal cost of a journey this rich is a dozen readable lines.

## What the 100 tests cover

- **API** (66): articles CRUD, comments, favorites, follows, profiles, tags,
  pagination, the personalized feed, auth & sessions, validation, and authorization.
- **UI** (33): locators & assertions, login/signup/logout, the article editor, comments,
  settings, profile & feed, tag filtering, network mocking, visual regression,
  accessibility, and the end-to-end journeys.
- **Cross-cutting:** seed-via-API/verify-in-UI, `storageState` auth, sharded CI, a
  custom reporter, and unique-data isolation throughout.

## The bugs the suite found

Run honestly at scale, the suite did what good tests do — it found **seven real bugs
in the application**, all fixed in `sut/`:

1. `createArticle` crashed when `tagList` was omitted.
2. A null-author race (un-awaited `setAuthor`) crashed `GET /articles` under load.
3. `slug` wasn't unique → duplicate slugs → favorite primary-key collisions.
4. `offset` pagination violated the RealWorld contract (`offset * limit`).
5. WCAG-AA **color-contrast** failures across the UI.
6. `updateUser` 500'd on every profile update (`||` that's always true) and risked
   clobbering passwords.
7. An invalid token returned **500** instead of **401**.

That's the real return on a framework: not just "do the tests pass," but a suite
trustworthy enough that when it goes red, you believe it — and it catches what the UI
alone never would.

## Where to take it next

- **More browsers/devices** — add WebKit and Firefox projects, and a mobile viewport.
- **Visual coverage in CI** — generate Linux baselines in the Playwright Docker image.
- **Data & trends** — ship `json`/`blob` results to a dashboard; track flaky-rate over
  time (Chapter 25).
- **Contract testing** — assert the API against the published RealWorld OpenAPI spec.
- **Performance budgets** — fail a test when a key request blows past a threshold.

The framework is the foundation; these are afternoons, not rewrites — because the
architecture (Part 2) was built to extend.

## Thank you

That's the course: from "why a framework" to a production-grade, 100-test, API+UI suite
that runs in CI and even improved the app it tests. Clone the
[repo](https://github.com/aktibaba/playwright-qa-course), check out any `ch-NN` tag,
and make it yours.

> If this series helped, star the repo and tell me what you built with it. Happy
> testing. 🎭
