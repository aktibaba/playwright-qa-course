---
title: "Scenario Helpers: Reusable Provisioning (Playwright + TypeScript, Ch.14)"
description: "Turn repeated 'create data, then clean it up' setup into a reusable helper and a factory fixture that auto-deletes everything it made — so a test starts from the state it needs in one line. Closes Part 3, explained for beginners."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Scenario Helpers: Reusable Provisioning

The CRUD tests in [Chapter 13](https://github.com/aktibaba/playwright-qa-course) all
shared a rhythm: create an article, do something, **delete it at the end**. That setup
and cleanup, copied into every test, adds up. This chapter extracts it into reusable
**provisioning** — and closes Part 3.

> "Provisioning" just means *setting up the data a test needs before it runs* — like
> creating an article so a test about viewing articles has one to view.

> Code for this chapter is tagged `ch-14` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/utils/scenarios.ts`
> and `src/fixtures/scenarios.fixture.ts`.

## Two layers: a plain helper and a fixture

We split provisioning into two pieces because they have different jobs.

**1. A plain helper function** — it knows *how* to create an article and nothing about
test lifecycle. Because it's just a function, anything can call it (a fixture,
`globalSetup`, a script):

```ts
// src/utils/scenarios.ts
export async function createArticle(
  api: APIRequestContext,
  overrides: ArticleInput = {},
): Promise<Article> {
  const res = await api.post("articles", {
    data: {
      article: {
        title: overrides.title ?? uniqueTitle(),              // use override, else a default
        description: overrides.description ?? "Seeded by a scenario helper",
        body: overrides.body ?? "Body text.",
        tagList: overrides.tagList ?? [],                     // always send it (Ch.13)
      },
    },
  });
  if (!res.ok()) throw new Error(`createArticle failed: HTTP ${res.status()}`);
  return (await res.json()).article as Article;
}
```

This is a **factory** — a function that builds something. The `overrides.title ??
uniqueTitle()` reads as "use the title the caller gave, otherwise make a unique one"
(`??` means "fall back to the right side if the left is missing"). So a test can say
`createArticle(api)` and get sensible defaults, or override just the fields it cares
about.

**2. A factory fixture** — it wraps the helper with *lifecycle*. It hands the test a
**function**, remembers everything that function creates, and deletes all of it when
the test ends:

```ts
// src/fixtures/scenarios.fixture.ts
export const test = authTest.extend<ScenarioFixtures>({
  makeArticle: async ({ authedApi }, use) => {
    const created: string[] = [];                  // remember what we make

    const make = async (overrides: ArticleInput = {}) => {
      const article = await createArticle(authedApi, overrides);
      created.push(article.slug);                  // track its slug
      return article;
    };

    await use(make);                               // hand the FUNCTION to the test

    for (const slug of created) {                  // teardown: delete them all
      await authedApi.delete(`articles/${slug}`).catch(() => {});
    }
  },
});
```

The key move: the fixture provides a **function** (`make`) instead of a single value.
The test can call it as many times as it wants, and cleanup scales automatically — the
`created` list grows, and the teardown loop deletes every one. (`.catch(() => {})`
means "if a delete fails — e.g. the test already deleted it — ignore the error.")

## Tests start from the state they need

Now a test that needs an existing article gets one in a single line, and never cleans
up by hand:

```ts
test("a provisioned article is retrievable by slug", async ({ makeArticle, api }) => {
  const article = await makeArticle({ title: "Findable Article", tagList: ["scenario"] });

  const res = await api.get(`articles/${article.slug}`);
  const found = (await res.json()).article;
  expect(found.title).toBe(article.title);
  expect(found.tagList).toEqual(["scenario"]);
});
```

No `try/finally`, no tracked slugs, no `afterEach`. The fixture owns it all — exactly
the boilerplate we wrote at the end of every CRUD test, now gone.

## Why the split matters

Keeping the **helper** separate from the **fixture** pays off again and again:

- The helper is callable **outside** a test — `globalSetup`, a seed script, or another
  fixture can all reuse `createArticle`.
- The fixture is the *only* place that knows about per-test cleanup, so that policy
  lives in one spot.
- It composes: a future `makeArticleWithComments` can build on `createArticle` plus a
  comments helper, and still tear everything down at the end.

This is the shape real-world frameworks use for test-data provisioning.

## Part 3, done

You can now test the API on its own terms: read assertions, authenticated sessions,
full CRUD, and reusable provisioning with automatic cleanup. With Part 2's
architecture under it, the **API milestone** is complete.

## Next up — Part 4: Integration

This is the part that makes a suite special. **Chapter 15 — Auth once with
`storageState`:** log in a single time, save the browser session to a file, and start
UI tests *already* logged in — no logging in through the form on every test. Tag:
`ch-15`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me what your most-used test-data factory provisions.
