---
title: "The Page Object Model (Playwright + TypeScript, Ch.4)"
description: "Stop scattering selectors and repeating steps. Wrap each screen in a Page Object so tests read as behavior — loginPage.loginAs(user) — and a UI change has exactly one place to fix."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# The Page Object Model

In [Chapter 3](https://github.com/aktibaba/playwright-qa-course) we learned to
locate and assert cleanly. But look at our login test from Chapter 2 — the
*selectors* and the *steps* still live inside the test. Write five tests that need
a logged-in user and you'll copy that block five times. Change the login form and
you'll edit it five times.

The **Page Object Model (POM)** fixes that: one class per screen that owns its
locators and the actions a user can take there. Tests then speak in behavior.

> Code for this chapter is tagged `ch-04` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/pages/LoginPage.ts` and `src/tests/ui/login.spec.ts`.

## Build the Page Object

A Page Object is just a class. It takes the `page` in its constructor, exposes
locators as fields, and exposes **actions** as methods:

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

Notice the design choices:

- Locators are **defined once**, in the constructor — the only place that knows the
  page's markup.
- Methods are named after **intent** (`loginAs`), not mechanics.
- `goto()` waits for the form to be ready, so callers never have to.
- It's plain TypeScript — `Credentials` makes the call sites self-documenting.

## Use it: tests that read as behavior

```ts
// src/tests/ui/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";

const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test.describe("Login (Page Object)", () => {
  test("a seeded user can log in", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginAs(SEED_USER);

    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("playwright"),
    ).toBeVisible();
  });
});
```

The test body is now three readable lines. The `@pages/LoginPage` import works
because of the `paths` alias we set up in Chapter 2 — no `../../../` chains.

## Where do assertions go?

A useful rule: **Page Objects model the page; tests make the claims.** Keep
`expect` about *business outcomes* (`New Article` is visible → we're logged in) in
the test. The one exception is a *readiness* wait inside an action — like `goto()`
asserting the form rendered — which is about the action being complete, not about
what the test is verifying.

## A real wrinkle: test data and a cross-project race

This test logs a **real seeded user** in, so the seed data has to be present. My
first instinct was to `reset` the database in a `beforeAll`. That made it **worse**:
the `api` project *also* resets the database, and when an API reset fired while this
UI test was mid-login, login failed — about **7 of 10 runs**.

The honest stopgap is to stop the two from overlapping: make the `ui` project run
**after** the `api` project, and let the API be the one that seeds. UI tests then
just *use* the seed data — no resetting of their own:

```ts
// playwright.config.ts (ui project)
{
  name: "ui",
  testDir: "./src/tests/ui",
  dependencies: ["api"],   // api finishes (and seeds) before any UI test starts
  use: { baseURL: env.webURL, ...devices["Desktop Chrome"] },
}
```

That's a blunt instrument — we serialized two whole projects to dodge a data race.
The *right* fix is giving each test its **own** isolated data (a fresh user per
test, created through the API), which we build in Part 4. I'm leaving the stopgap
in so you can see the problem the isolation layer is designed to solve.

## What POM bought us

- **One place to fix.** The login form's markup is known only to `LoginPage`.
- **Readable tests.** `loginAs(user)` says what, not how.
- **Reuse.** Every future test that needs a logged-in user calls one method.

But we still wrote `new LoginPage(page)` by hand, and the test still hard-codes
`SEED_USER` and leans on a whole-project dependency for its data. Those are the
next dominoes — fixtures and per-test data isolation.

## Next up

**Chapter 5 — Forms, tables, and dialogs:** we put the Page Object Model to work on
richer interactions (the article editor, tag inputs, confirmation dialogs), and
grow a small family of Page Objects. Then in Part 2 we make them effortless to use
by turning them into **fixtures**. Tag: `ch-05`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me: do you put assertions inside your Page Objects, or keep them in tests?
