---
title: "Forms & Native Dialogs (Playwright + TypeScript, Ch.5)"
description: "Drive a real multi-field form and answer a native window.confirm() dialog. We grow a small family of Page Objects and run a full author flow: log in, publish an article, then delete it."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Forms & Native Dialogs

[Chapter 4](https://github.com/aktibaba/playwright-qa-course) gave us one Page
Object. Real apps have several that work together. In this chapter we drive
Inkwell's **article editor** — a richer, multi-field form — and handle a **native
browser dialog** when deleting, running a complete author flow end to end.

> Code for this chapter is tagged `ch-05` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `src/pages/ArticleEditorPage.ts`, `src/pages/ArticlePage.ts`, and
> `src/tests/ui/article-editor.spec.ts`.
>
> (Inkwell has no data grid or file upload, so "tables & uploads" wait until we
> augment the app later — this chapter is forms + dialogs against what's really
> there.)

## A Page Object for a multi-field form

The editor has a title, a description, a markdown body, and a tags input. Same
pattern as `LoginPage`, just more fields:

```ts
// src/pages/ArticleEditorPage.ts
import { type Page, type Locator, expect } from "@playwright/test";

export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
  tags?: string;
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
    if (draft.tags) await this.tags.fill(draft.tags);
    await this.publish.click();
  }
}
```

## Handling a native dialog

Deleting an article triggers a real `window.confirm("Want to delete the
article?")`. Native dialogs aren't DOM — Playwright surfaces them through a
`dialog` event, and **by default it auto-dismisses them** (clicking "Cancel"). To
*accept*, register a handler **before** the action that triggers it:

```ts
// src/pages/ArticlePage.ts
export class ArticlePage {
  readonly deleteButton: Locator;

  constructor(private readonly page: Page) {
    // "Delete Article" renders in both the banner and the footer actions.
    this.deleteButton = page
      .getByRole("button", { name: "Delete Article" })
      .first();
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
  }

  async deleteAndConfirm(): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept()); // BEFORE the click
    await this.deleteButton.click();
  }
}
```

`page.once` (not `page.on`) handles exactly one dialog and unregisters itself —
the right choice for a single expected prompt.

## The full author flow

```ts
// src/tests/ui/article-editor.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";
import { ArticleEditorPage } from "@pages/ArticleEditorPage";
import { ArticlePage } from "@pages/ArticlePage";

const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test("author can publish an article and delete it", async ({ page }) => {
  // Unique title → no collision with a leftover from a previous run.
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

Three Page Objects, one readable flow. The test creates its **own** data with a
unique title and **deletes what it creates**, so it leaves the database as it found
it — no reset needed.

## Two bugs this flow surfaced

Building this honestly turned up two issues worth your attention:

1. **A redirect race.** Right after submitting the login form, the app's
   success handler calls `navigate("/")` *asynchronously*. Navigating straight to
   the editor raced that redirect and got bounced back home. The fix lives in
   `LoginPage.loginAs`: wait for the login form to unmount before returning, so a
   "logged-in" Page Object really means logged in.

   ```ts
   async loginAs(credentials: Credentials): Promise<void> {
     await this.goto();
     await this.submitCredentials(credentials);
     await expect(this.submit).toBeHidden(); // login navigated away
   }
   ```

2. **Cross-test data races.** Two UI tests that both reset the database and read it
   stepped on each other. The stopgap from Chapter 4 — UI tests don't reset; they
   rely on the `api` project seeding first — plus the unique title above, makes the
   suite deterministic (verified over many runs).

## Next up

We now have a small family of Page Objects, but tests still `new` them up by hand
and repeat `SEED_USER`. **Chapter 6** wraps up Part 1 with **debugging** — traces,
UI mode, and codegen — and then Part 2 turns these Page Objects into **fixtures**
so a test just asks for `loginPage` and gets one. Tag: `ch-06`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how you handle native dialogs in your suite.
