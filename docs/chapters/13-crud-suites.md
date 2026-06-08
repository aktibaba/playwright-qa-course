---
title: "Building CRUD API Suites (Playwright + TypeScript, Ch.13)"
description: "Create, read, update, and delete articles through authedApi — each test making and cleaning up its own data — and let the suite surface a real API quirk along the way."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Building CRUD API Suites

With [`authedApi`](https://github.com/aktibaba/playwright-qa-course) from Chapter 12,
authenticated calls are effortless. Now we test the full lifecycle of a resource —
**create, read, update, delete** — the bulk of any real API suite. The golden rule:
**each test makes its own data and cleans up after itself**, so tests stay
independent and parallel-safe.

> Code for this chapter is tagged `ch-13` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/api/articles-crud.spec.ts`.

## Unique data per test

Two tests creating an article titled "Test" collide on the slug. So we generate a
unique title — and therefore a unique slug — per test:

```ts
function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
```

This is the lightweight version of the per-test isolation we formalize in Part 4.

## Create

```ts
test("create returns the new article with a generated slug", async ({ authedApi }) => {
  const title = uniqueTitle("CRUD create");
  const res = await authedApi.post("articles", {
    data: {
      article: { title, description: "made by a test", body: "body", tagList: ["api", "crud"] },
    },
  });
  expect(res.ok()).toBeTruthy();

  const { article } = await res.json();
  expect(article.title).toBe(title);
  expect(article.slug).toContain("crud-create-");   // server slugified the title
  expect(article.tagList).toEqual(["api", "crud"]);
  expect(article.author.username).toBe("playwright");

  await authedApi.delete(`articles/${article.slug}`); // clean up
});
```

### The quirk this caught

My first draft of the *update* and *delete* tests created an article **without** a
`tagList`. They failed — not in my test, in the API:

```json
{ "errors": { "body": ["tagList is not iterable"] } }
```

Inkwell's create endpoint assumes `tagList` is always an array and never guards
against `undefined`. A client that omits it gets a 500-style error instead of a
clean validation message. **This is exactly the kind of contract gap an API suite
exists to find** — invisible from the UI, which always sends the field. The fix in
our tests is to always send `tagList` (even `[]`); the *real* fix would be a guard
in the API.

## Update and delete

Update keeps the slug; delete makes the resource 404 afterward — both worth
asserting explicitly:

```ts
test("update changes fields without changing the slug", async ({ authedApi }) => {
  const create = await authedApi.post("articles", {
    data: { article: { title: uniqueTitle("CRUD update"), description: "old", body: "b", tagList: [] } },
  });
  const { article } = await create.json();

  const res = await authedApi.put(`articles/${article.slug}`, {
    data: { article: { description: "new description" } },
  });
  expect(res.ok()).toBeTruthy();

  const updated = (await res.json()).article;
  expect(updated.slug).toBe(article.slug);             // slug is stable
  expect(updated.description).toBe("new description");

  await authedApi.delete(`articles/${article.slug}`);
});

test("delete removes the article (404 afterward)", async ({ authedApi }) => {
  const create = await authedApi.post("articles", {
    data: { article: { title: uniqueTitle("CRUD delete"), description: "d", body: "b", tagList: [] } },
  });
  const { article } = await create.json();

  const del = await authedApi.delete(`articles/${article.slug}`);
  expect(del.status()).toBe(200);

  const after = await authedApi.get(`articles/${article.slug}`);
  expect(after.status()).toBe(404);                    // really gone
});
```

## Don't forget the negative path

Mutations are gated by auth. Prove the gate works — with the **anonymous** `api`
client, not `authedApi`:

```ts
test("create without a token is rejected", async ({ api }) => {
  const res = await api.post("articles", {
    data: { article: { title: "no auth", description: "d", body: "b" } },
  });
  expect(res.status()).toBe(401);
});
```

## The pattern

Every test here: **arrange** (create unique data), **act** (the operation under
test), **assert**, **clean up** (delete). No shared state, no order dependence,
fully parallel. But notice the repetition — "log in, create an article, hand it to
the test, delete it after" shows up again and again. That boilerplate is begging to
become a fixture.

## Next up

**Chapter 14 — Scenario helpers: reusable provisioning.** We extract "create an
article (and tear it down)" into a fixture/helper so tests start from the state they
need in one line — closing Part 3. Tag: `ch-14`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the weirdest API quirk your tests have ever caught.
