---
title: "Auth & Sessions for the API Layer (Playwright + TypeScript, Ch.12)"
description: "What a token is and how to use it — then build a chained authedApi fixture so authenticated API calls are as easy as anonymous ones, and assert the API rejects requests without a token."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Auth & Sessions for the API Layer

[Chapter 11](https://github.com/aktibaba/playwright-qa-course) tested reads, which
don't need to know *who you are*. But most of an API is gated behind **authentication**
— creating articles, reading your profile, following people. This chapter makes
authenticated calls effortless.

## How login works (the short version)

When you log in, the server gives you a **token** — a long string that proves "I am
this user". You then attach that token to later requests, and the server trusts them.
Inkwell uses a **JWT** (JSON Web Token); you don't need to understand its internals,
just that it's a string you get on login and send back on every protected call.

```
POST /api/users/login   { "user": { "email": "...", "password": "..." } }
→ { "user": { "token": "eyJ…", "username": "playwright", ... } }
```

You send the token in a request **header** called `Authorization`. Headers are extra
metadata attached to an HTTP request. Inkwell follows the RealWorld scheme — the value
is **`Token <jwt>`** (note: `Token`, not the more common `Bearer`):

```
GET /api/user
Authorization: Token eyJ…
```

> Code for this chapter is tagged `ch-12` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/fixtures/auth.fixture.ts` and `src/tests/api/user.spec.ts`.

## A chained `authedApi` fixture

We don't want every test to log in and attach the header by hand. Instead, one fixture
does it once and hands back a client that's **already authenticated**.

Recall Chapter 9's rule: *merge across modules, chain within a dependency line.* This
fixture **depends on** `api` (to send the login request) and `testUser` (whose
credentials to use), so we **chain** it on top of them with `.extend`:

```ts
// src/fixtures/auth.fixture.ts
import { mergeTests, request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";
import { test as apiTest } from "./api.fixture";
import { test as dataTest } from "./data.fixture";

export interface AuthFixtures {
  authedApi: APIRequestContext;
}

// mergeTests(api, data) gives us a `test` that already has `api` + `testUser`;
// .extend adds `authedApi` on top of them.
export const test = mergeTests(apiTest, dataTest).extend<AuthFixtures>({
  authedApi: async ({ api, testUser }, use) => {
    // 1. log in with the test user's credentials
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: testUser.password } },
    });
    const { user } = await res.json();

    // 2. build a new client that sends the token on EVERY request
    const context = await request.newContext({
      baseURL: `${env.apiURL}/`,
      extraHTTPHeaders: { Authorization: `Token ${user.token}` },
    });
    await use(context);          // hand the authenticated client to the test
    await context.dispose();
  },
});
```

Two design points:

- **`extraHTTPHeaders`** attaches the `Authorization` header to *every* request this
  client makes — so no test ever writes the header itself.
- **It's test-scoped on purpose.** It depends on `testUser` (test-scoped), and in
  Part 4 that user becomes *unique per test*, so each test logs in its own user. (A
  worker-scoped fixture couldn't depend on a test-scoped one anyway — Chapter 10.)

The composition root swaps the leaf modules for the auth module that now carries them,
and — as always — **tests don't change their import**:

```ts
// src/fixtures/index.ts
export const test = mergeTests(authTest, pagesTest);
```

## Authenticated — and rejected

Now an authenticated call is one line. And we test the **negative** case too, because
"does the API reject requests without a token?" is part of the contract:

```ts
test("GET /user returns the current user", async ({ authedApi, testUser }) => {
  const res = await authedApi.get("user");      // token attached automatically
  expect(res.ok()).toBeTruthy();

  const { user } = await res.json();
  expect(user.username).toBe(testUser.username);
  expect(user.email).toBe(testUser.email);
});

test("GET /user without a token is rejected", async ({ api }) => {
  const res = await api.get("user");            // the ANONYMOUS client (no token)
  expect(res.status()).toBe(401);               // 401 = unauthorized
  const body = await res.json();
  expect(body.errors.body[0]).toContain("login");
});
```

We keep **both** clients available: `api` for anonymous calls, `authedApi` for
authenticated ones. The boundary between them — what's allowed without a token — is
exactly where real auth bugs hide.

## Next up

We can read and authenticate. **Chapter 13 — Building CRUD API suites:** create, read,
update, and delete articles through `authedApi`, with each test making and cleaning up
its own data. Tag: `ch-13`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you manage auth tokens in your API tests.
