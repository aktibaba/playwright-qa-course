---
title: "Building CRUD API Suites (Playwright + TypeScript, Ch.13)"
description: "Create, read, update, delete — the bulk of any API suite — explained step by step, with each test making and cleaning up its own data, and a real API bug the tests caught."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Building CRUD API Suites

With [`authedApi`](https://github.com/aktibaba/playwright-qa-course) from Chapter 12,
authenticated calls are effortless. Now we test the full life of a piece of data.

**CRUD** stands for the four basic operations on a *resource* (a thing the API stores —
here, an article):

- **C**reate — `POST /api/articles`
- **R**ead — `GET /api/articles/:slug`
- **U**pdate — `PUT /api/articles/:slug`
- **D**elete — `DELETE /api/articles/:slug`

These four make up most of any real API suite. The golden rule we follow: **each test
creates its own data and cleans it up**, so tests never interfere and can run in
parallel.

> Code for this chapter is tagged `ch-13` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/api/articles-crud.spec.ts`.

## Unique data per test

A **slug** is the URL-friendly version of a title (`"My Post"` → `my-post`). If two
tests both create an article titled "Test", they'd produce the same slug and clash. So
we generate a unique title — and therefore a unique slug — for each test:

```ts
function uniqueTitle(prefix: string): string {
  // a timestamp + a random number makes it unique even across parallel workers
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
```

This is the lightweight version of the per-test isolation we formalise in Part 4.

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
  expect(article.slug).toContain("crud-create-");   // the server slugified the title
  expect(article.tagList).toEqual(["api", "crud"]);
  expect(article.author.username).toBe("playwright");

  await authedApi.delete(`articles/${article.slug}`); // clean up what we made
});
```

### A real bug the tests caught

My first draft of the *update* and *delete* tests created an article **without** a
`tagList`. They failed — not in my test, in the **API itself**:

```json
{ "errors": { "body": ["tagList is not iterable"] } }
```

Inkwell's create endpoint assumed `tagList` is always an array and crashed when it was
missing — a client that omits the field gets a server error instead of a clean
message. **This is exactly the kind of gap an API suite exists to find** — it's
invisible from the UI, which always sends the field. (We work around it in these tests
by always sending `tagList`, and later in the course we *fix the app itself*.)

## Update and delete

Updating should change fields but keep the slug; deleting should make the article
`404` afterwards. Both are worth asserting explicitly:

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
  expect(updated.slug).toBe(article.slug);             // slug stayed the same
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
  expect(after.status()).toBe(404);                    // it's really gone
});
```

## Don't forget the negative path

Creating, updating, and deleting are all gated by auth. Prove the gate works — using
the **anonymous** `api` client (no token), not `authedApi`:

```ts
test("create without a token is rejected", async ({ api }) => {
  const res = await api.post("articles", {
    data: { article: { title: "no auth", description: "d", body: "b" } },
  });
  expect(res.status()).toBe(401);                      // unauthorized
});
```

## The pattern

Every test here follows the same four steps — a pattern worth internalising:

1. **Arrange** — create the unique data the test needs.
2. **Act** — perform the operation under test.
3. **Assert** — check the result.
4. **Clean up** — delete what you created.

No shared state, no dependence on order, fully parallel. But notice the repetition:
"create an article, hand it to the test, delete it after" appears again and again.
That boilerplate is begging to become a fixture.

## Next up

**Chapter 14 — Scenario helpers: reusable provisioning.** We extract "create an
article (and tear it down)" into a helper/fixture, so a test starts from the state it
needs in one line — closing Part 3. Tag: `ch-14`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the weirdest API quirk your tests have ever caught.
