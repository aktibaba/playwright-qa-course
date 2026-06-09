---
title: "POM-as-Fixture, and the beforeAll Trap (Playwright + TypeScript, Ch.8)"
description: "Stop writing new LoginPage(page) in every test. Hand each test a ready Page Object through a fixture — and learn, with the concepts spelled out, why sharing one page across tests in beforeAll quietly breaks test isolation."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# POM-as-Fixture, and the `beforeAll` Trap

In [Chapter 7](https://github.com/aktibaba/playwright-qa-course) we turned our test
data and API client into fixtures. But UI tests still open with boilerplate:

```ts
const loginPage = new LoginPage(page);
const editor = new ArticleEditorPage(page);
```

Every test that touches a screen re-builds its Page Object by hand. That repeated
wiring is exactly what fixtures exist to remove.

> Code for this chapter is tagged `ch-08` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/fixtures/index.ts`.

## Page Objects as fixtures

Remember the fixture shape from Chapter 7 (setup → `use` → teardown), and that a
fixture can depend on other fixtures. A Page Object just needs a `page`, and `page` is
itself a built-in fixture — so a Page-Object fixture is a one-liner that depends on it:

```ts
// src/fixtures/index.ts
export const test = base.extend<Fixtures>({
  // ...api, testUser from Chapter 7...

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));          // build it on THIS test's page, hand it over
  },
  articleEditorPage: async ({ page }, use) => {
    await use(new ArticleEditorPage(page));
  },
  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },
});
```

Now tests just *ask* for the page they need, and Playwright builds it:

```ts
// before — the test constructs the Page Object itself
test("a seeded user can log in", async ({ page, testUser }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginAs(testUser);
});

// after — `loginPage` arrives ready to use
test("a seeded user can log in", async ({ loginPage, testUser }) => {
  await loginPage.loginAs(testUser);
});
```

And the full author flow reads as a **list of the capabilities it asked for**:

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
never builds one.

## The `beforeAll` trap

Here's a tempting idea: "fixtures are shared setup, so why not build the Page Objects
**once** in a `beforeAll` and reuse them for the whole file?" It seems efficient. It's
a trap — because of *what* would be shared.

```ts
// ⚠️ DON'T do this
let loginPage: LoginPage;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();   // ONE browser tab for the whole file
  loginPage = new LoginPage(page);
});
```

That single `page` is now shared across every test in the file. First, two concepts:

> A **browser context** is like a private browser session — its own cookies, its own
> storage, its own logged-in state. Playwright gives **each test its own context and
> `page`**, so tests are completely isolated from each other. That isolation is what
> lets them run safely **in parallel** (at the same time).

Sharing one `page` throws that away:

- **No isolation.** Every test now uses the same tab — same cookies, same logged-in
  user. One test's actions leak into the next, and the **order** tests run in suddenly
  matters (a fragile, bug-prone setup).
- **Parallelism breaks.** Tests that share a tab can't run at the same time without
  trampling each other, so you lose the speed.
- **Cleanup is on you.** You opened the tab with `browser.newPage()`, so *you* must
  close it in an `afterAll` — even if a test crashes midway.

The fixture version avoids all of it for free: the **test-scoped `page` fixture**
already gives every test a fresh, isolated context, and our Page-Object fixture simply
wraps it. You get "build it once (per test)" ergonomics *with* full isolation.

> Rule of thumb: it's fine to share **immutable** things (config, a read-only token).
> Never share a **stateful** thing like a `page` across tests.

## Where we are

Our `@fixtures` module now hands out `api`, `testUser`, and three Page Objects — and
it's about to grow more (auth helpers, data builders, saved sessions). One file
holding everything will become a dumping ground.

## Next up

**Chapter 9 — Composition & a single import surface:** we split fixtures into focused
modules (data, pages, api) and compose them back into one `@fixtures` import with
`mergeTests`, so the framework can grow cleanly. Tag: `ch-09`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me if you've been bitten by a shared-page `beforeAll`.
