---
title: "Forms & Native Dialogs (Playwright + TypeScript, Ch.5)"
description: "Drive a real multi-field form and answer a native browser confirm() dialog — explained from scratch. We grow a small family of Page Objects and run a full author flow: log in, publish an article, then delete it."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: true
---

# Forms & Native Dialogs

[Chapter 4](https://github.com/aktibaba/playwright-qa-course) gave us one Page Object.
Real apps need several that work together. In this chapter we drive Inkwell's
**article editor** (a form with several fields) and handle a **native browser dialog**
when deleting — running a complete "author" flow from start to finish.

> Code for this chapter is tagged `ch-05` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/pages/ArticleEditorPage.ts`, `src/pages/ArticlePage.ts`, and
> `src/tests/ui/article-editor.spec.ts`.

## A Page Object for a multi-field form

The editor has a title, a description, a body (written in Markdown), and a tags input.
It's the exact same pattern as `LoginPage` from Chapter 4 — just more fields:

```ts
// src/pages/ArticleEditorPage.ts
import { type Page, type Locator, expect } from "@playwright/test";

export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
  tags?: string;            // the "?" means this field is optional
}

export class ArticleEditorPage {
  readonly title: Locator;
  readonly description: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly publish: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByPlaceholder("Article Title");
    this.description = page.getByPlaceholder("What's this article about?");
    this.body = page.getByPlaceholder("Write your article (in markdown)");
    this.tags = page.getByPlaceholder("Enter tags");
    this.publish = page.getByRole("button", { name: "Publish Article" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/#/editor");
    await expect(this.title).toBeVisible();
  }

  async publishArticle(draft: ArticleDraft): Promise<void> {
    await this.goto();
    await this.title.fill(draft.title);
    await this.description.fill(draft.description);
    await this.body.fill(draft.body);
    if (draft.tags) await this.tags.fill(draft.tags);   // only if tags were given
    await this.publish.click();
  }
}
```

Two small TypeScript notes for newcomers: `tags?: string` marks the field optional,
and `if (draft.tags)` means "only fill the tags box when the draft actually has tags".
Everything else is the Chapter 4 pattern repeated.

## Handling a native dialog

Click "Delete Article" and the browser pops up a confirmation box —
`window.confirm("Want to delete the article?")` with **OK** and **Cancel**.

> A **native dialog** is drawn by the *browser itself*, not by the web page. That
> means it isn't an element on the page — you can't `getByRole("button")` the OK
> button, because it doesn't exist in the page's HTML.

Playwright surfaces these through a special **`dialog` event**, and by default it
**auto-dismisses** them (the equivalent of clicking Cancel) so a stray prompt can't
freeze your test. To *accept* one, you register a handler **before** the action that
triggers it:

```ts
// src/pages/ArticlePage.ts
export class ArticlePage {
  readonly deleteButton: Locator;

  constructor(private readonly page: Page) {
    // "Delete Article" appears in both the banner and the footer, so .first().
    this.deleteButton = page
      .getByRole("button", { name: "Delete Article" })
      .first();
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
  }

  async deleteAndConfirm(): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept()); // register BEFORE the click
    await this.deleteButton.click();
  }
}
```

`page.once("dialog", …)` says "the next time a dialog appears, accept it, then forget
this handler." We use `once` (not `on`) because we expect exactly **one** prompt.
Registering it *before* the click matters: the dialog appears the instant you click,
so the handler has to already be waiting.

## The full author flow

Now we wire three Page Objects into one readable end-to-end test:

```ts
// src/tests/ui/article-editor.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";
import { ArticleEditorPage } from "@pages/ArticleEditorPage";
import { ArticlePage } from "@pages/ArticlePage";

const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test("author can publish an article and delete it", async ({ page }) => {
  // A unique title (with a timestamp) so it never clashes with a leftover article.
  const title = `Testing Forms in Inkwell ${Date.now()}`;
  const draft = {
    title,
    description: "A walkthrough of the article editor",
    body: "Written by a Playwright test to prove the editor form works.",
    tags: "playwright testing",
  };

  await new LoginPage(page).loginAs(SEED_USER);
  await new ArticleEditorPage(page).publishArticle(draft);

  const articlePage = new ArticlePage(page);
  await articlePage.expectTitle(title);
  await expect(page).toHaveURL(/#\/article\/testing-forms-in-inkwell-\d+/);

  await articlePage.deleteAndConfirm();

  await expect(page).toHaveURL(/\/#?\/?$/);
  await expect(page.getByRole("button", { name: "Global Feed" })).toBeVisible();
});
```

A couple of things worth pointing out:

- `Date.now()` returns the current time as a number, so the title is unique on every
  run — no clash with an article a previous run left behind.
- `toHaveURL(/…/)` is matching against a **regular expression** (a text pattern). The
  pattern `/#\/article\/testing-forms-in-inkwell-\d+/` means "the URL contains
  `#/article/testing-forms-in-inkwell-` followed by some digits (`\d+`)" — because the
  server adds the timestamp to the article's web address.

The test creates its **own** data (unique title) and **deletes what it creates**, so
it leaves the database exactly as it found it — no reset needed.

## Two bugs this flow surfaced

Building this honestly turned up two real issues — the kind a course that only shows
the happy path hides from you:

1. **A redirect race.** Right after the login form is submitted, the app's success
   handler navigates to the home page — and it does so *asynchronously* (a moment
   later). Our code navigated straight to the editor and got **bounced back home** by
   that late redirect. The fix lives in `LoginPage.loginAs`: wait for the login form
   to disappear before returning, so "logged in" really means logged in.

   ```ts
   async loginAs(credentials: Credentials): Promise<void> {
     await this.goto();
     await this.submitCredentials(credentials);
     await expect(this.submit).toBeHidden(); // the form went away → login finished
   }
   ```

   The lesson: never *assume* an async action (like a redirect) has finished — wait
   for a real signal that it has.

2. **Cross-test data races.** Two UI tests that both reset the database and read it
   stepped on each other. The Chapter 4 stopgap (UI tests don't reset; they rely on
   the `api` project seeding first) **plus** the unique title above makes the suite
   reliable across many runs.

## Next up

We now have a small family of Page Objects, but tests still create them by hand with
`new` and repeat `SEED_USER`. **Chapter 6** wraps up Part 1 with **debugging** —
traces, UI mode, and codegen — and then Part 2 turns these Page Objects into
**fixtures**, so a test just asks for `loginPage` and gets one ready to use. Tag:
`ch-06`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you handle native dialogs in your suite.
