---
title: "Auth & Sessions for the API Layer (Playwright + TypeScript, Ch.12)"
description: "Build a chained authedApi fixture: log in once, attach the token, and make authenticated API calls as effortless as anonymous ones — plus assert that the API rejects unauthenticated requests."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Auth & Sessions for the API Layer

[Chapter 11](https://github.com/aktibaba/playwright-qa-course) tested reads, which
need no identity. Most of an API is gated behind auth — creating articles, reading
the current user, following people. Doing that by hand means logging in and
threading a token through every request. We'll hide all of it behind one fixture.

> Code for this chapter is tagged `ch-12` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/fixtures/auth.fixture.ts` and `src/tests/api/user.spec.ts`.

## How Inkwell auth works

Log in, get a JWT:

```
POST /api/users/login  { "user": { "email": "...", "password": "..." } }
→ { "user": { "token": "eyJ…", "username": "playwright", ... } }
```

Then send it on protected requests using the RealWorld scheme — **`Token <jwt>`**,
not `Bearer`:

```
GET /api/user
Authorization: Token eyJ…
```

## A chained `authedApi` fixture

Back in Chapter 9 we drew the line: **merge across modules, chain within a
dependency line.** `authedApi` is the chain — it depends on `api` (to log in) and
`testUser` (who to log in as), so it's built *on top of* them with `.extend`:

```ts
// src/fixtures/auth.fixture.ts
import { mergeTests, request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";
import { test as apiTest } from "./api.fixture";
import { test as dataTest } from "./data.fixture";

export interface AuthFixtures {
  authedApi: APIRequestContext;
}

export const test = mergeTests(apiTest, dataTest).extend<AuthFixtures>({
  authedApi: async ({ api, testUser }, use) => {
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: testUser.password } },
    });
    const { user } = await res.json();

    const context = await request.newContext({
      baseURL: `${env.apiURL}/`,
      extraHTTPHeaders: { Authorization: `Token ${user.token}` },
    });
    await use(context);
    await context.dispose();
  },
});
```

Two design points:

- **`extraHTTPHeaders`** attaches the token to *every* request the context makes —
  so the test never repeats the header.
- **It's test-scoped, on purpose.** It depends on the test-scoped `testUser`, and in
  Part 4 that user becomes unique per test — so each test logs in *its own* user.
  (A worker-scoped fixture couldn't depend on `testUser` anyway — Chapter 10's rule.)

The composition root just swaps the leaf modules for the auth module that now
carries them:

```ts
// src/fixtures/index.ts
export const test = mergeTests(authTest, pagesTest);
```

Specs still `import { test, expect } from "@fixtures"` — unchanged.

## Authenticated, and rejected

With the fixture in place, an authenticated call is a one-liner — and we assert the
negative case too, because "does it reject anonymous access?" is part of the
contract:

```ts
test("GET /user returns the current user", async ({ authedApi, testUser }) => {
  const res = await authedApi.get("user");
  expect(res.ok()).toBeTruthy();

  const { user } = await res.json();
  expect(user.username).toBe(testUser.username);
  expect(user.email).toBe(testUser.email);
});

test("GET /user without a token is rejected", async ({ api }) => {
  const res = await api.get("user");        // the anonymous context
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.errors.body[0]).toContain("login");
});
```

Note we keep **both** clients available: `api` for anonymous calls, `authedApi` for
authenticated ones. Testing the boundary between them is where real auth bugs hide.

## Next up

We can now read and authenticate. **Chapter 13 — Building CRUD API suites:** create,
read, update, and delete articles through `authedApi`, each test making and cleaning
up its own data. Tag: `ch-13`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you manage auth tokens in your API tests.
