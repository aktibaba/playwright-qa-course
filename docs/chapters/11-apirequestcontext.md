---
title: "APIRequestContext Fundamentals (Playwright + TypeScript, Ch.11)"
description: "Part 3 opens: test the API directly, no browser. A beginner-friendly intro to HTTP requests, responses, status codes and JSON — plus a seed-once strategy that keeps read tests deterministic."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# APIRequestContext Fundamentals

Welcome to **Part 3 — API Testing**. So far the API was just a helper for setting up
UI tests. Now we test it directly, as a thing worth checking on its own.

## What is "API testing"?

Your app's frontend (the pages) talks to its backend over **HTTP** — the same protocol
your browser uses. The backend exposes **endpoints** like `GET /api/articles` or
`POST /api/users/login`. An **API test** sends those HTTP requests from code and checks
the responses — **without opening a browser at all**.

A quick HTTP vocabulary, because we'll use it constantly:

- **Method** — what you want to do: `GET` (read), `POST` (create), `PUT` (update),
  `DELETE` (remove).
- **Status code** — a number the server returns: `200` OK, `201` created, `401`
  unauthorized, `404` not found, `422` validation error, `500` server error.
- **Body** — the data sent or returned, almost always **JSON** (JavaScript-object-like
  text: `{ "articlesCount": 1 }`).

Why bother when you have UI tests? Because API tests are **fast** (milliseconds, no
browser) and **precise** (they check the contract the frontend — and any other client
— relies on). Inkwell follows the documented
[RealWorld](https://realworld-docs.netlify.app/) API, so we're testing a real spec.

> Code for this chapter is tagged `ch-11` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/tests/api/articles.spec.ts` and `src/setup/global-setup.ts`.

## First, make the data deterministic

A read test can only be stable if the data is stable. Back in Part 1, individual tests
reset the database and raced each other. The clean fix for a read-heavy API suite is
to **seed the data once, before anything runs**, and never reset during the run:

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
    await ctx.dispose();   // always clean up, even if the reset throws
  }
}
```

```ts
// playwright.config.ts
export default defineConfig({
  globalSetup: "./src/setup/global-setup.ts",   // runs ONCE before all tests
  // ...
});
```

`globalSetup` is a special file Playwright runs **one time** before any worker starts.
Now every test reads from a known baseline, and since nothing resets mid-run, read
tests can't wipe each other. (Tests that *create* data make their own and clean up —
Chapter 13.)

## The `api` fixture is your HTTP client

From Part 2 we have an `api` fixture — an HTTP client already pointed at the API. Its
methods mirror the HTTP methods: `get`, `post`, `put`, `delete`. Each returns a
**response** object you assert on:

```ts
test("GET /articles lists the seeded article", async ({ api }) => {
  const res = await api.get("articles");        // send GET /api/articles

  expect(res.status()).toBe(200);               // the status code
  expect(res.headers()["content-type"]).toContain("application/json");

  const body = await res.json();                // parse the JSON body
  expect(typeof body.articlesCount).toBe("number");
  expect(Array.isArray(body.articles)).toBe(true);

  const slugs = body.articles.map((a: { slug: string }) => a.slug);
  expect(slugs).toContain("welcome-to-inkwell");
});
```

Three things worth memorising:

- **`res.status()` vs `res.ok()`.** `ok()` is `true` for any 2xx status — fine for a
  happy path. When the *exact* code matters (especially for errors), assert
  `res.status()`.
- **`res.json()` is awaited** and gives you the parsed body as a normal object.
  (`res.text()` gives the raw text if you need it.)
- **`res.headers()`** is a plain object with lowercase keys — handy for checking the
  content type or an auth header.

## Query parameters

A **query parameter** is the `?limit=1` part of a URL. Don't build those strings by
hand — pass a `params` object and Playwright encodes them for you:

```ts
test("GET /articles respects the limit query param", async ({ api }) => {
  const res = await api.get("articles", { params: { limit: 1 } }); // → ?limit=1
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body.articles.length).toBeLessThanOrEqual(1);
});
```

The list endpoint also accepts `offset`, `tag`, `author`, and `favorited` — same
mechanism for each.

## Assert on errors, not just happy paths

A suite that only checks `200`s misses half the contract. Inkwell returns a structured
`404` for a missing article, and we check **both** the status and the shape of the
error body:

```ts
test("GET /articles/:slug returns 404 for an unknown slug", async ({ api }) => {
  const res = await api.get("articles/does-not-exist-xyz");

  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.errors.body[0]).toContain("not found");
});
```

Knowing the error *shape* (`{ errors: { body: [...] } }` here) matters because real
clients depend on it — testing it is part of testing the contract.

## Why this is already clean

Notice what these tests *don't* do: no URL plumbing (the `api` fixture owns the base
URL), no creating/closing the client (worker-scoped, Chapter 10), no data setup (the
global seed). The Part 2 architecture pays off immediately — API tests are almost pure
assertions.

## Next up

Reads are easy because they need no identity. **Chapter 12 — Auth & sessions for the
API layer:** log in once, get a token, and build an `authedApi` fixture (the *chained*
fixture we promised in Chapter 9) so authenticated calls are as effortless as
anonymous ones. Tag: `ch-12`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me: do your API suites assert error responses, or only happy paths?
