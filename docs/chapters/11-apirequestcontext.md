---
title: "APIRequestContext Fundamentals (Playwright + TypeScript, Ch.11)"
description: "Part 3 opens: test the API as a first-class surface. Requests and responses, status and JSON assertions, query params, and a seed-once strategy that keeps read tests deterministic — all against a real RealWorld API."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# APIRequestContext Fundamentals

Welcome to **Part 3 — API Testing**. Until now the API was our *setup* helper. Now
we test it as a first-class surface. API tests need no browser, so they run in
milliseconds — and Inkwell speaks the documented [RealWorld](https://realworld-docs.netlify.app/)
API, so we're testing a real contract.

> Code for this chapter is tagged `ch-11` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/api/articles.spec.ts` and `src/setup/global-setup.ts`.

## First, make the data deterministic

Read assertions are only stable if the data is. In Part 1 individual tests reset the
database, which raced each other. The clean fix for a read-heavy API suite is to
**seed once, before everything**, and never reset mid-run:

```ts
// src/setup/global-setup.ts
import { request } from "@playwright/test";
import { env } from "../utils/env";

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: `${env.apiURL}/` });
  try {
    const res = await ctx.post("test/reset");
    if (!res.ok()) throw new Error(`reset failed: HTTP ${res.status()}`);
  } finally {
    await ctx.dispose();
  }
}
```

```ts
// playwright.config.ts
export default defineConfig({
  globalSetup: "./src/setup/global-setup.ts",
  // ...
});
```

`globalSetup` runs once before any worker starts. Now every test reads a known
baseline, and because nothing resets during the run, read tests can't wipe each
other. (Tests that *create* data make their own and clean up — Chapter 13.)

## The `api` fixture is your client

We already have a worker-scoped `api` fixture — an `APIRequestContext` pointed at
the API. Its methods mirror HTTP: `get`, `post`, `put`, `delete`. Each returns an
`APIResponse` you assert on.

```ts
test("GET /articles lists the seeded article", async ({ api }) => {
  const res = await api.get("articles");

  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");

  const body = await res.json();
  expect(typeof body.articlesCount).toBe("number");
  expect(Array.isArray(body.articles)).toBe(true);

  const slugs = body.articles.map((a: { slug: string }) => a.slug);
  expect(slugs).toContain("welcome-to-inkwell");
});
```

Three things to internalize:

- **`res.status()` vs `res.ok()`.** `ok()` is true for any 2xx — fine for a happy
  path. For anything where the *exact* code matters (especially errors), assert
  `status()`.
- **`res.json()` is awaited** and returns the parsed body. `res.text()` and
  `res.body()` are there when you need raw payloads.
- **`res.headers()`** is a plain lowercase-keyed object — handy for asserting
  content type, caching, or auth headers.

## Query parameters

Don't hand-build query strings — pass `params` and Playwright encodes them:

```ts
test("GET /articles respects the limit query param", async ({ api }) => {
  const res = await api.get("articles", { params: { limit: 1 } });
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body.articles.length).toBeLessThanOrEqual(1);
});
```

The RealWorld list endpoint also takes `offset`, `tag`, `author`, and `favorited` —
same mechanism for each.

## Assert on errors, not just happy paths

A suite that only checks 200s misses half the contract. Inkwell returns a structured
404 for a missing article, and we assert both the status and the body shape:

```ts
test("GET /articles/:slug returns 404 for an unknown slug", async ({ api }) => {
  const res = await api.get("articles/does-not-exist-xyz");

  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.errors.body[0]).toContain("not found");
});
```

Knowing the *shape* of an error (`{ errors: { body: [...] } }` here) is part of
testing an API contract — clients depend on it.

## Why this is already clean

Notice what these tests *don't* do: no `${baseURL}` plumbing (the `api` fixture owns
it), no manual context lifecycle (worker-scoped, Chapter 10), no data setup (global
seed). The fixture architecture from Part 2 pays off immediately — API specs are
almost pure assertions.

## Next up

Reads are easy because they need no identity. **Chapter 12 — Auth & sessions for the
API layer:** log in once, get a token, and build an `authedApi` fixture (a *chained*
fixture, as promised in Chapter 9) so authenticated calls are as effortless as
anonymous ones. Tag: `ch-12`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me: do your API suites assert error responses, or only happy paths?
