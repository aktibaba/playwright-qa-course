---
title: "Why a Test Automation Framework? (Playwright + TypeScript, Ch.1)"
description: "A hands-on course where you build a production-grade Playwright + TypeScript framework — API and UI — against a real, dockerized app. Chapter 1: a gentle welcome for first-timers, the plan, the vocabulary, and why raw scripts rot."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Why a Test Automation Framework?

Welcome to the first chapter of a hands-on course where we build a **production-grade
Playwright + TypeScript automation framework** — covering **both API and UI testing** —
against a real web app you run on your own machine.

This isn't a "5 quick Playwright tips" post. By the end of the series you'll have a
framework with the same shape a real QA team ships. But we start from **zero** — if
you've never written an automated test in your life, you're in the right place.

## New to all this? Read this first

Let's make sure a few words mean the same thing to both of us.

- **Automated test** — a small program that *uses your app the way a person would*
  (clicks buttons, types into fields, calls your backend) and then **checks that the
  result is correct**. Instead of a human clicking through "log in, see my name" for
  the hundredth time, code does it in a second — every time you change anything.
- **Playwright** — the tool we use to drive a real browser from code. It can open
  Chrome, go to a page, fill a form, click, and read what's on screen. It also has a
  built-in **test runner** (the thing that finds your tests and runs them) and an
  **assertion library** (the `expect(...)` you use to say "this should be true").
- **TypeScript** — JavaScript with type labels. If you can write JavaScript, you can
  write the TypeScript in this course; the types just catch typos before you run.
- **UI testing vs API testing** — *UI* (user interface) tests drive the **browser**:
  the buttons and pages a user sees. *API* tests skip the browser and talk to the
  **backend** directly over HTTP (much faster). A great suite uses both, and we'll do
  exactly that.

If those four ideas make sense, you have everything you need to begin.

## Who this is for

- You can read basic **JavaScript** — variables, functions, and `async/await` (the
  `async`/`await` keywords are everywhere in Playwright because the browser does
  things *over time*; we'll explain them as we go).
- **No Playwright, TypeScript, or QA experience required.** We introduce each idea the
  first time you need it.
- Maybe you've written a few tests before and watched them turn into an unmaintainable
  tangle. This course is about the **structure** that stops that from happening.

## How the course works

- Each **chapter is one post**, in order — read them top to bottom.
- There's a **companion GitHub repo** with every line of code:

  👉 **https://github.com/aktibaba/playwright-qa-course**

- The repo has **one git tag per chapter** (`ch-01`, `ch-02`, …). A *tag* is just a
  bookmark for a point in the project's history. `git checkout ch-03` gives you the
  code exactly as it was at the end of Chapter 3, so you can compare it with yours.
- You can **build along** (recommended) or just read — both work.

## The words you'll keep seeing

A tiny glossary so nothing later feels like jargon:

| Term | In plain English |
|------|------------------|
| **SUT** | "System Under Test" — the app we're testing. Ours is called *Inkwell*. |
| **Locator** | How Playwright *finds* an element on the page (a button, an input). |
| **Assertion** | A check that must be true, written as `expect(...)`. |
| **Fixture** | A reusable piece of setup Playwright hands to a test that asks for it (e.g. "give me a logged-in page"). More in Part 2 — don't worry yet. |
| **Page Object** | A small class that wraps one screen, so tests say `loginPage.loginAs(user)` instead of clicking around. |

You don't need to memorize these — they'll click into place as you use them.

## Get the code and run the app

We don't test toy pages. The course runs against **Inkwell** — a small but real
blogging app (you can write articles, comment, tag, follow people, favorite posts,
and log in). It's built with **React** (the part you see), **Express** (the backend),
and **PostgreSQL** (the database). It lives in the repo under `sut/` and runs with a
single command thanks to **Docker** (a tool that runs apps in isolated "containers"
so you don't have to install databases by hand).

You'll need [Node.js](https://nodejs.org/) 18+ (runs JavaScript outside the browser)
and [Docker](https://www.docker.com/).

```bash
# 1. Clone the course repo to your machine
git clone https://github.com/aktibaba/playwright-qa-course.git
cd playwright-qa-course

# 2. Start the app: database + API + web page.
#    `--wait` blocks until everything is healthy, so the app is fully ready.
cd sut
docker compose up -d --build --wait

# 3. Open it in your browser
#    Web (the UI):  http://localhost:3000
#    API (backend): http://localhost:3001/api
```

One more thing that makes life easy: the app has a special test-only button to
**reset its data** to a known starting point — three users (all with password
`Password123!`) and one article. Run this whenever you want a clean slate:

```bash
curl -X POST http://localhost:3001/api/test/reset
```

(`curl` just sends an HTTP request from your terminal — here a `POST` to the reset
endpoint.) Determinism — *the same starting data every time* — is what keeps tests
from failing for random reasons, and we'll lean on it the whole way.

That's the app under test. Now — why bother with a *framework* at all, instead of
just writing tests?

## The naive way (and why it's worth seeing)

Your very first Playwright test usually looks like this — everything written inline,
in one file:

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

Reading it line by line, because every test you write looks like this:

- `import { test, expect } …` — pull in Playwright's test runner and assertions.
- `test("user can log in", async ({ page }) => { … })` — declare a test with a name.
  The `{ page }` is Playwright handing you a fresh browser tab (a *fixture*!); `async`
  means the function does things that take time, so we `await` each one.
- `await page.goto(...)` — open the login page.
- `await page.getByPlaceholder("Email").fill(...)` — *find* the input whose placeholder
  text is "Email" (a **locator**) and type into it.
- `await page.getByRole("button", { name: "Login" }).click()` — find the **button**
  labelled "Login" and click it.
- `await expect(...).toBeVisible()` — the **assertion**: after logging in, the user's
  name should appear. If it doesn't, the test fails.

It works! Then you write the next twenty tests and the cracks show:

- The URL and the email/password are **hard-coded in every single file**.
- The four login steps are **copy-pasted everywhere** — change the login form and you
  edit forty tests by hand.
- There's no clean way to start a test **already logged in**, so every test pays the
  slow cost of logging in through the form.
- Test data is **whatever happens to be in the database today** — so tests pass on
  your machine and fail on your colleague's.

Most automation efforts don't fail because Playwright is hard. They fail because the
**second hundred tests** look nothing like the first ten. The tool was never the
problem — the **absence of structure** was.

## What a framework actually buys you

A "framework" sounds heavy, but it's really just a few **layers** that each have one
job, so those problems never appear. We build them in order across the course:

- **Utils** — tiny low-level helpers (e.g. "where is the app running?", "make an
  API request").
- **Fixtures** — Playwright's way of handing a test exactly what it asks for, already
  set up: a logged-in page, a test user, a ready-to-use Page Object. (Part 2 is all
  about these — it's the heart of the course.)
- **Pages** (Page Objects) — one small class per screen that names *what* you can do
  ("log in as this user") instead of *how* ("type here, click there").
- **Tests** — short and readable, focused on behaviour, importing everything from a
  single place.

Here's that same login test **once the framework exists**. You can't run this yet —
it's a preview of where we're headed, and we build every piece of it together:

```ts
import { test, expect } from "@fixtures";

test("logged-in user sees their name", async ({ loginPage, user }) => {
  await loginPage.loginAs(user);
  await expect(loginPage.header.username).toHaveText(user.username);
});
```

No URLs, no selectors, no repeated steps. `loginPage` arrived ready to use, and
`user` was created **through the API** before the test started — so it runs from
known data every time. Notice how it reads almost like a sentence: *log in as the
user, then their name shows.* That readability is the whole point.

## What you'll have by the end

A framework that runs API, UI, and integration tests in parallel, logs in once and
reuses that session, creates its test data through the API and checks it in the
browser, and runs automatically in CI (on every code change) — the same shape a real
QA team ships. We even use it to find and fix real bugs in the app along the way.

## Next up

In **Chapter 2** we install Playwright and TypeScript from scratch and write our very
first UI and API tests against Inkwell — deliberately *the naive way* — so we can
*feel* the exact pain the rest of the course removes. Tag: `ch-02`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course),
> and drop a comment if anything doesn't run — I'll help you get unblocked.
