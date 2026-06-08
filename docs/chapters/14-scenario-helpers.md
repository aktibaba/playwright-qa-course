---
title: "Scenario Helpers: Reusable Provisioning (Playwright + TypeScript, Ch.14)"
description: "Turn repeated 'create data, then clean it up' setup into a provisioning util and a factory fixture that auto-tears-down everything it made — so tests start from the state they need in one line. Closes Part 3."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Scenario Helpers: Reusable Provisioning

The CRUD tests in [Chapter 13](https://github.com/aktibaba/playwright-qa-course) all
shared a rhythm: create an article, do something, **delete it at the end**. That
arrange-and-clean-up boilerplate multiplies across a suite. This chapter extracts it
into reusable **provisioning** — and closes Part 3.

> Code for this chapter is tagged `ch-14` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/utils/scenarios.ts`
> and `src/fixtures/scenarios.fixture.ts`.

## Two layers: a pure helper and a fixture

Split provisioning into two pieces, because they have different jobs:

**1. A pure util** — knows *how* to create the resource, nothing about test
lifecycle. Reusable from anywhere (a fixture, `globalSetup`, another helper):

```ts
// src/utils/scenarios.ts
export async function createArticle(
  api: APIRequestContext,
  overrides: ArticleInput = {},
): Promise<Article> {
  const res = await api.post("articles", {
    data: {
      article: {
        title: overrides.title ?? uniqueTitle(),
        description: overrides.description ?? "Seeded by a scenario helper",
        body: overrides.body ?? "Body text.",
        tagList: overrides.tagList ?? [],   // always send it (Ch.13 quirk)
      },
    },
  });
  if (!res.ok()) throw new Error(`createArticle failed: HTTP ${res.status()}`);
  return (await res.json()).article as Article;
}
```

**2. A factory fixture** — wraps the util with **lifecycle**. It hands the test a
function, remembers everything that function creates, and deletes all of it on
teardown:

```ts
// src/fixtures/scenarios.fixture.ts
export const test = authTest.extend<ScenarioFixtures>({
  makeArticle: async ({ authedApi }, use) => {
    const created: string[] = [];

    const make = async (overrides: ArticleInput = {}) => {
      const article = await createArticle(authedApi, overrides);
      created.push(article.slug);
      return article;
    };

    await use(make);

    for (const slug of created) {
      await authedApi.delete(`articles/${slug}`).catch(() => {}); // teardown
    }
  },
});
```

A fixture that provides a **function** instead of a value is the key move: the test
can call it as many times as it likes, and cleanup scales automatically.

## Tests start from the state they need

Now a test that needs an existing article gets one in a line — and never cleans up:

```ts
test("a provisioned article is retrievable by slug", async ({ makeArticle, api }) => {
  const article = await makeArticle({ title: "Findable Article", tagList: ["scenario"] });

  const res = await api.get(`articles/${article.slug}`);
  const found = (await res.json()).article;
  expect(found.title).toBe(article.title);
  expect(found.tagList).toEqual(["scenario"]);
});

test("a provisioned article appears in the global feed", async ({ makeArticle, api }) => {
  const article = await makeArticle();

  const res = await api.get("articles");
  const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
  expect(slugs).toContain(article.slug);
});
```

No `try/finally`, no tracked slugs, no `afterEach`. The fixture owns it. Compare with
the manual `await authedApi.delete(...)` we wrote at the end of every CRUD test —
that's exactly the boilerplate that's now gone.

## Why the split matters

Keeping the **util** separate from the **fixture** pays off repeatedly:

- The util is callable **outside** a test — `globalSetup`, a CLI seed script, or
  another fixture can all reuse `createArticle`.
- The fixture is the only thing that knows about **per-test lifecycle**, so cleanup
  policy lives in exactly one place.
- It composes: a future `makeArticleWithComments` fixture builds on `createArticle`
  plus a comments helper, and still tears everything down at the end.

This is the shape real frameworks use for test-data provisioning.

## Part 3, done

You can now test the API as a first-class surface: read assertions, authenticated
sessions, full CRUD, and reusable provisioning with automatic teardown. Together
with Part 2's architecture, that's the **API milestone** complete.

## Next up — Part 4: Integration

This is the differentiator. **Chapter 15 — Auth once with `storageState`:** log in a
single time, save the browser session to disk, and start UI tests already
authenticated — no logging in through the form on every test. Tag: `ch-15`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me what your most-used test-data factory provisions.
