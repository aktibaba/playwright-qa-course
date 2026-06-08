import { test, expect } from "@fixtures";
import { LoginPage } from "@pages/LoginPage";
import { ArticleEditorPage } from "@pages/ArticleEditorPage";
import { ArticlePage } from "@pages/ArticlePage";

// Chapter 5 — forms & dialogs. A full author flow: log in, publish an article via
// the editor form, see it render, then delete it through a native confirm dialog.
// Credentials come from the `testUser` fixture (Chapter 7).
//
// No DB reset (the `ui` project depends on `api`, so seed users already exist).
// The article title carries a unique suffix so this test never collides with a
// leftover from a previous run, and it deletes what it creates.
test("author can publish an article and delete it", async ({ page, testUser }) => {
  const title = `Testing Forms in Inkwell ${Date.now()}`;
  const draft = {
    title,
    description: "A walkthrough of the article editor",
    body: "Written by a Playwright test to prove the editor form works end to end.",
    tags: "playwright testing",
  };

  await new LoginPage(page).loginAs(testUser);

  // Publish via the editor form.
  await new ArticleEditorPage(page).publishArticle(draft);

  // We land on the new article's page.
  const articlePage = new ArticlePage(page);
  await articlePage.expectTitle(title);
  await expect(page).toHaveURL(/#\/article\/testing-forms-in-inkwell-\d+/);

  // Delete it — answering the window.confirm() dialog — and land back home.
  await articlePage.deleteAndConfirm();

  await expect(page).toHaveURL(/\/#?\/?$/);
  await expect(page.getByRole("button", { name: "Global Feed" })).toBeVisible();
});
