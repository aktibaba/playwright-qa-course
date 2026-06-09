---
title: "The Page Object Model (Playwright + TypeScript, Ch.4)"
description: "Stop scattering selectors and repeating steps. Learn the Page Object Model from scratch — one class per screen — so tests read as behaviour (loginPage.loginAs(user)) and a UI change has exactly one place to fix."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# The Page Object Model

In [Chapter 3](https://github.com/aktibaba/playwright-qa-course) we learned to find
elements and assert cleanly. But look back at our login test from Chapter 2 — the
locators and the steps live **inside** the test. Write five tests that each need a
logged-in user and you copy that login block five times. Change the login form once
and you edit five tests by hand. That doesn't scale.

The **Page Object Model (POM)** fixes it. It's a long name for a simple idea, and
it's the most widely used pattern in UI test automation.

## What is a "Page Object"?

A **Page Object** is a small **class** that represents **one screen** of your app.

> A *class* (in TypeScript/JavaScript) is a blueprint that bundles related data and
> functions together. You create an instance with `new`, e.g. `new LoginPage(page)`,
> and then call its methods. If you've never used classes, think of it as "a box that
> holds the login page's locators and the things you can do on it."

The class keeps **two** things in one place:

1. **The locators** — how to find the email field, the password field, the button.
2. **The actions** — meaningful things a user does, like "log in as this user".

Tests then talk to the Page Object (`loginPage.loginAs(user)`) instead of touching
locators directly. The payoff: when the login form's HTML changes, you fix it in
**one** file, and every test keeps working.

## Build the Page Object

Here's the whole `LoginPage` class — we'll read it piece by piece:

```ts
// src/pages/LoginPage.ts
import { type Page, type Locator, expect } from "@playwright/test";

export interface Credentials {
  email: string;
  password: string;
}

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByPlaceholder("Email");
    this.password = page.getByPlaceholder("Password");
    this.submit = page.getByRole("button", { name: "Login" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/#/login");
    await expect(this.submit).toBeVisible();
  }

  async submitCredentials({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async loginAs(credentials: Credentials): Promise<void> {
    await this.goto();
    await this.submitCredentials(credentials);
  }
}
```

Line by line:

- **`interface Credentials { … }`** — a TypeScript type that says "an object with an
  `email` and a `password`, both strings". It documents what `loginAs` expects and
  lets your editor catch mistakes.
- **`class LoginPage { … }`** — the Page Object itself.
- **`readonly email: Locator;`** — a field holding the email-field locator.
  `readonly` means "set once, never reassign" — a locator shouldn't change.
- **`constructor(private readonly page: Page)`** — the constructor runs when you do
  `new LoginPage(page)`. Writing `private readonly page` is a TypeScript shorthand
  that *stores* the passed-in `page` as a private field automatically. Inside the
  class we then use `this.page`.
- **Inside the constructor** we create the locators **once** — this is the only place
  in the whole codebase that knows the login form's markup.
- **`goto()`** navigates to the login page *and waits* for the form to be ready, so
  callers never have to remember that.
- **`submitCredentials({ email, password })`** fills the fields and clicks. The
  `{ email, password }` is *destructuring* — it pulls those two values out of the
  object you pass.
- **`loginAs(...)`** is the high-level action: go to the page, then submit. This is
  the method tests actually call.

The design choices that matter:

- Locators are defined **once**.
- Methods are named after **intent** (`loginAs`), not mechanics ("type and click").
- It's plain TypeScript — no magic.

## Use it: tests that read as behaviour

```ts
// src/tests/ui/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";

const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test.describe("Login (Page Object)", () => {
  test("a seeded user can log in", async ({ page }) => {
    const loginPage = new LoginPage(page);          // create the Page Object

    await loginPage.loginAs(SEED_USER);             // one readable action

    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("playwright"),
    ).toBeVisible();
  });
});
```

The test body is three readable lines: create the page object, log in, check we're
in (the navbar now shows "New Article" and the username). `new LoginPage(page)` builds
an instance using this test's browser tab. The `@pages/LoginPage` import works because
of the path alias we set up in Chapter 2 — no `../../../` chains.

## Where do assertions go?

A handy rule of thumb: **Page Objects model the page; tests make the claims.** Keep
`expect` about *business outcomes* (the user is logged in) in the **test**. The one
exception is a *readiness* check inside an action — like `goto()` waiting for the form
— which is about the action having finished, not about what the test is verifying.

## A real wrinkle: test data and a cross-project race

This test logs a **real seeded user** in, so that user must exist in the database. My
first instinct was to `reset` the database in a `beforeAll`. That made it **worse**:
the `api` project *also* resets the database, and when an API reset fired *while* this
UI test was mid-login, login failed — about **7 of 10 runs**. (A test that fails
randomly like that is *flaky*, the thing we hate most.)

The honest stopgap: stop the two from overlapping. Make the `ui` project run **after**
the `api` project, and let the API do the seeding. UI tests then just *use* the data:

```ts
// playwright.config.ts (ui project)
{
  name: "ui",
  testDir: "./src/tests/ui",
  dependencies: ["api"],   // api runs (and seeds) first; ui waits for it
  use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
}
```

`dependencies: ["api"]` tells Playwright "don't start the ui project until the api
project is done." It's a blunt instrument — we serialised two whole projects to dodge
a data race. The *proper* fix is to give each test its **own** isolated data (a fresh
user per test, made through the API), which we build in Part 4. I'm keeping the
stopgap so you can feel the problem the isolation layer later solves.

## What POM bought us

- **One place to fix.** The login form's markup lives only in `LoginPage`.
- **Readable tests.** `loginAs(user)` says *what*, not *how*.
- **Reuse.** Every future test that needs a logged-in user calls one method.

But we still wrote `new LoginPage(page)` by hand, and the test still hard-codes
`SEED_USER` and leans on a project dependency for its data. Those are the next
dominoes — **fixtures** and per-test data isolation.

## Next up

**Chapter 5 — Forms & dialogs:** we put the Page Object Model to work on richer
interactions (the article editor form, and a native browser confirmation dialog when
deleting), growing a small family of Page Objects. Tag: `ch-05`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me: do you put assertions inside your Page Objects, or keep them in tests?
