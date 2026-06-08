---
title: "Why a Test Automation Framework? (Playwright + TypeScript, Ch.1)"
description: Before writing a single test, understand why raw scripts rot and what a real framework buys you. Chapter 1 of a hands-on Playwright + TypeScript course.
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Why a Test Automation Framework?

Most automation efforts don't fail because Playwright is hard. They fail because
the **second hundred tests** look nothing like the first ten. Selectors are
copy-pasted, logins are repeated in every file, and one UI change breaks forty
specs at once. The tool was never the problem — the **absence of structure** was.

This course builds a production-grade Playwright + TypeScript framework the way a
real team would: layered, parallel-safe, and covering **both API and UI**, tested
against a real, dockerized app you can run with one command.

## The naive way

A first test usually looks like this — everything inline:

```ts
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("http://localhost:3000/#/login");
  await page.getByPlaceholder("Email").fill("playwright@test.io");
  await page.getByPlaceholder("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("playwright")).toBeVisible();
});
```

It works. Then you write the next twenty tests and the cracks show:

- The base URL and credentials are hard-coded in every file.
- The login steps are duplicated everywhere — change the form, edit forty specs.
- There's no clean way to start a test **already logged in**, so every test pays
  the UI-login tax.
- Test data is whatever happens to be in the database today.

## What a framework actually buys you

A framework is just the set of layers that keep those problems from ever
appearing. Across this course we build them in order:

- **Utils** — low-level helpers (API request wrappers, auth/token helpers, logging).
- **Fixtures** — Playwright's dependency injection: env, authenticated contexts,
  test data, and Page Objects handed to tests ready to use.
- **Pages** — Page Objects that name *what* a screen does, not *how* to click it.
- **Tests** — short, readable, and focused on behavior, importing everything from
  a single `@fixtures` entry point.

The same login test, once the framework exists, reads like intent:

```ts
import { test, expect } from "@fixtures";

test("logged-in user sees their name", async ({ loginPage, user }) => {
  await loginPage.loginAs(user);
  await expect(loginPage.header.username).toHaveText(user.username);
});
```

No URLs, no selectors, no repeated steps — and `user` came from a fixture that
seeded it **through the API**, so the test starts from known data every run.

## The system under test

We don't test toy pages. The course runs against **Inkwell**, a small but real
React + Express + PostgreSQL blogging app (articles, comments, tags,
follow/favorite, JWT auth). It ships as a one-command Docker stack with
deterministic `reset`/`seed` endpoints, so tests never race startup or fight
flaky data:

```bash
docker compose up -d --build --wait
# web → http://localhost:3000   api → http://localhost:3001/api
```

## What you'll have by the end

A framework that runs API, UI, and integration suites in parallel, authenticates
once via stored session state, seeds data through the API and verifies it in the
UI, and runs sharded in CI — the same shape a real QA team ships.

In the next chapter we install Playwright and TypeScript and write our first UI
and API test against Inkwell — the naive way — so we can feel the exact pain the
rest of the course removes.
