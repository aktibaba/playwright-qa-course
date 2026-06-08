---
title: "POM-as-Fixture, and the beforeAll Trap (Playwright + TypeScript, Ch.8)"
description: "Stop writing new LoginPage(page) in every test. Hand each test a ready Page Object through a fixture — and see why sharing one page across tests in beforeAll quietly breaks isolation."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# POM-as-Fixture, and the `beforeAll` Trap

In [Chapter 7](https://github.com/aktibaba/playwright-qa-course) we turned data and
the API context into fixtures. But our UI tests still open with boilerplate:

```ts
const loginPage = new LoginPage(page);
const editor = new ArticleEditorPage(page);
```

Every test that touches a screen re-constructs its Page Object. That's exactly the
kind of repeated wiring fixtures exist to remove.

> Code for this chapter is tagged `ch-08` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/index.ts`.

## Page Objects as fixtures

A Page Object needs a `page`, and `page` is itself a fixture — so a POM fixture is
just a one-liner that depends on it:

```ts
// src/fixtures/index.ts
export const test = base.extend<Fixtures>({
  // ...api, testUser...

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  articleEditorPage: async ({ page }, use) => {
    await use(new ArticleEditorPage(page));
  },
  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },
});
```

Now tests just *ask* for the page they need:

```ts
// before
test("a seeded user can log in", async ({ page, testUser }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginAs(testUser);
});

// after
test("a seeded user can log in", async ({ loginPage, testUser }) => {
  await loginPage.loginAs(testUser);
});
```

And the full author flow reads as a list of capabilities it requested:

```ts
test("author can publish an article and delete it", async ({
  loginPage,
  articleEditorPage,
  articlePage,
  testUser,
}) => {
  await loginPage.loginAs(testUser);
  await articleEditorPage.publishArticle(draft);
  await articlePage.expectTitle(draft.title);
  await articlePage.deleteAndConfirm();
});
```

No constructors, no `page` plumbing. Each Page Object is built on **this test's own
`page`**, and fixtures are **lazy** — a test that never mentions `articleEditorPage`
never constructs one.

## The `beforeAll` trap

If fixtures are "shared setup," why not just build the Page Objects once in a
`beforeAll` and reuse them? Because of *what* they'd share:

```ts
// ⚠️ the trap
let loginPage: LoginPage;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();   // ONE page for the whole file
  loginPage = new LoginPage(page);
});
```

That single `page` is now shared across every test in the file. The problems:

- **No isolation.** Tests run against the same tab, same cookies, same logged-in
  state. One test's actions leak into the next, and order suddenly matters.
- **Parallelism breaks.** Playwright isolates tests by giving each its own `page`
  (its own browser context). A hand-rolled shared page throws that away — tests
  can't safely run in parallel anymore.
- **Cleanup is on you.** You opened the page, so you must close it, in an
  `afterAll`, even when a test fails midway.

The fixture version sidesteps all of it: the **test-scoped `page` fixture** already
gives every test a fresh, isolated context, and our POM fixture simply wraps it.
You get the "construct once" ergonomics *with* per-test isolation — not instead of
it.

> Rule of thumb: share **immutable** things (config, a worker-scoped API token)
> across tests; never share a **stateful** thing like a `page`.

## Where we are

Our `@fixtures` module now hands out `api`, `testUser`, and three Page Objects.
That's a lot living in one file. It's also about to get bigger — API auth helpers,
scenario builders, storage-state sessions.

## Next up

**Chapter 9 — Composition & a single import surface:** we split fixtures into
focused modules (data, pages, api) and compose them back into one `@fixtures`
import with `mergeTests`, so the framework can grow without that file becoming a
dumping ground. Tag: `ch-09`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me if you've been bitten by a shared-page `beforeAll`.
