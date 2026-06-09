---
title: "Capstone: A 100-Test Suite, End to End (Playwright + TypeScript, Ch.26)"
description: "Everything tied together: full end-to-end journeys, broad API and UI coverage, and a recap of the seven real bugs the suite found in the app. A complete, deterministic 100-test framework — and where to take it next."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Capstone: A 100-Test Suite, End to End

This is where everything comes together. If you started this series never having
written an automated test, look at what you can now read and build: a layered Playwright
+ TypeScript framework — fixtures, Page Objects, API + UI + integration tests, CI,
reporting — running against a real dockerized app. The capstone makes it whole.

```
── Run summary ───────────────────────────────
  result:   passed
  tests:    100  (✓ 100  ✘ 0  ⤿ flaky 0  – skipped 0)
  projects: setup 1  api 66  ui 33
```

> Code for this chapter is tagged `ch-26` in the repo:
> **https://github.com/aktibaba/playwright-qa-course**.

## End-to-end journeys

An **end-to-end (E2E)** test exercises the whole product the way a real user would,
start to finish — and a **regression** suite is the set of tests you run to make sure
nothing that used to work has broken. The capstone's headline tests are exactly that,
and each one creates a **fresh user** so it's completely isolated:

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

Sign up → write an article → view it → see it on the profile, all through the UI,
reusing every Page Object and fixture we built. Notice how a journey this rich is just a
dozen readable lines — that's the payoff of the architecture.

## What the 100 tests cover

- **API** (66 tests): articles CRUD, comments, favorites, follows, profiles, tags,
  pagination, the personalised feed, auth & sessions, validation, and authorization.
- **UI** (33 tests): locators & assertions, login/signup/logout, the article editor,
  comments, settings, profile & feed, tag filtering, network mocking, visual regression,
  accessibility, and the end-to-end journeys.
- **Cross-cutting:** seed-via-API/verify-in-UI, `storageState` login, sharded CI, a
  custom reporter, and unique-data isolation throughout.

## The bugs the suite found

Run honestly and at scale, the suite did what good tests do — it found **seven real bugs
in the application**, all fixed in `sut/`:

1. `createArticle` crashed when `tagList` was omitted.
2. A null-author race (an un-awaited `setAuthor`) crashed `GET /articles` under load.
3. `slug` wasn't unique → duplicate slugs → favorites colliding on a primary key.
4. `offset` pagination broke the RealWorld contract (`offset * limit`).
5. WCAG-AA **colour-contrast** failures across the UI.
6. `updateUser` returned a 500 on every profile update (an `||` that's always true) and
   risked overwriting passwords.
7. An invalid token returned **500** instead of **401**.

That's the real return on a framework: not just "do the tests pass," but a suite
trustworthy enough that when it goes red, you *believe* it — and it catches things the
UI alone never would.

## Where to take it next

You don't need any of these, but each is an afternoon, not a rewrite:

- **More browsers/devices** — add WebKit and Firefox projects, and a mobile viewport.
- **Visual coverage in CI** — generate Linux baselines in the Playwright Docker image.
- **Data & trends** — ship `json`/`blob` results to a dashboard; track flaky rate over
  time (Chapter 25).
- **Contract testing** — check the API against the published RealWorld OpenAPI spec.
- **Performance budgets** — fail a test when a key request gets too slow.

They're afternoons because the architecture from Part 2 was built to extend.

## Thank you

That's the course — from "why a framework?" to a production-grade, 100-test, API + UI
suite that runs in CI and even improved the app it tests. Clone the
[repo](https://github.com/aktibaba/playwright-qa-course), check out any `ch-NN` tag, and
make it your own.

> If this series helped you, star the repo and tell me what you built with it. Happy
> testing. 🎭
