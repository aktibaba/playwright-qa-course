---
title: "Why a Test Automation Framework? (Playwright + TypeScript, Ch.1)"
description: "A hands-on course where you build a production-grade Playwright + TypeScript framework — API and UI — against a real, dockerized app. Chapter 1: the welcome, the plan, the code, and why raw scripts rot."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Why a Test Automation Framework?

Welcome to the first chapter of a hands-on course where we build a **production-grade
Playwright + TypeScript automation framework** — covering **both API and UI testing**
— against a real, dockerized web app you run on your own machine.

This isn't a "here are 5 Playwright tips" post. By the end of the series you'll have
a framework with the same shape a real QA team ships: layered, parallel-safe,
authenticating once and reusing the session, seeding data through the API and
verifying it in the UI, and running sharded in CI. We build it one chapter at a
time, and every line of code is in a public repo you can clone and run.

## Who this is for

- You can read basic **JavaScript** (variables, functions, `async/await`). That's it.
- **No Playwright or TypeScript experience required** — we introduce both from zero.
- You've maybe written a few UI tests before and felt them turn into a tangle. This
  course is about the structure that prevents that.

## How the course works

- Each **chapter is one post** in this series, in order. Read them top to bottom.
- There's a **companion GitHub repo** — the single source of truth for all code:

  👉 **https://github.com/aktibaba/playwright-qa-course**

- The repo carries **one git tag per chapter** (`ch-01`, `ch-02`, …) so you can check
  out the exact state of the code at any point and compare it to what you have.
- Every chapter ends with what changed, so you can either build along or just read
  the diff.

## Get the code and run the app

We don't test toy pages. The course runs against **Inkwell** — a small but real
**React + Express + PostgreSQL** blogging app (articles, comments, tags,
follow/favorite, JWT auth). It lives in the same repo under `sut/` ("system under
test") and ships as a one-command Docker stack with deterministic `reset`/`seed`
endpoints, so your tests never race startup or fight flaky data.

You'll need [Node.js](https://nodejs.org/) 18+ and [Docker](https://www.docker.com/).

```bash
# 1. Clone the course repo
git clone https://github.com/aktibaba/playwright-qa-course.git
cd playwright-qa-course

# 2. Start the app (db + API + web), wait until every healthcheck is green
cd sut
docker compose up -d --build --wait

# 3. Open it
#    Web (UI):  http://localhost:3000
#    API:       http://localhost:3001/api
```

Reset to known seed data any time (three users, password `Password123!`, plus one
article):

```bash
curl -X POST http://localhost:3001/api/test/reset
```

That's the app under test. Now — why bother with a *framework* at all?

## The naive way

Your first Playwright test usually looks like this — everything inline:

```ts
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("http://localhost:3000/#/login");
  await page.getByPlaceholder("Email").fill("playwright@test.io");
  await page.getByPlaceholder("Password").fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "playwright" })).toBeVisible();
});
```

It works! Then you write the next twenty tests and the cracks show:

- The base URL and credentials are **hard-coded in every file**.
- The login steps are **duplicated everywhere** — change the form, edit forty specs.
- There's no clean way to start a test **already logged in**, so every test pays the
  slow UI-login tax.
- Test data is **whatever happens to be in the database today**.

Most automation efforts don't fail because Playwright is hard. They fail because the
**second hundred tests** look nothing like the first ten. The tool was never the
problem — the **absence of structure** was.

## What a framework actually buys you

A framework is just the set of layers that keep those problems from ever appearing.
Across this course we build them in order:

- **Utils** — low-level helpers (API request wrappers, auth/token helpers, logging).
- **Fixtures** — Playwright's dependency injection: env, authenticated contexts, test
  data, and Page Objects handed to each test ready to use.
- **Pages** — Page Objects that name *what* a screen does, not *how* to click it.
- **Tests** — short and readable, focused on behavior, importing everything from a
  single `@fixtures` entry point.

The same login test, **once the framework exists** (this is a preview of where we're
headed — we build every piece of it together), reads like intent:

```ts
import { test, expect } from "@fixtures";

test("logged-in user sees their name", async ({ loginPage, user }) => {
  await loginPage.loginAs(user);
  await expect(loginPage.header.username).toHaveText(user.username);
});
```

No URLs, no selectors, no repeated steps — and `user` came from a fixture that seeded
it **through the API**, so the test starts from known data on every run.

## What you'll have by the end

A framework that runs API, UI, and integration suites in parallel, authenticates once
via stored session state, seeds data through the API and verifies it in the UI, and
runs sharded in CI — the same shape a real QA team ships.

## Next up

In **Chapter 2** we install Playwright and TypeScript and write our very first UI and
API test against Inkwell — deliberately *the naive way* — so we can feel the exact
pain the rest of the course removes. Tag: `ch-02`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course),
> and drop a comment if anything doesn't run — I'll help you get unblocked.
