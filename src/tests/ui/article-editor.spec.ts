import { test, expect } from "@fixtures";

// Chapter 8 — the same author flow, but every Page Object (LoginPage,
// ArticleEditorPage, ArticlePage) arrives as a fixture. The test asks for what it
// needs and gets it, ready to use.
//
// No DB reset (the `ui` project depends on `api`, so seed users already exist).
// The article title carries a unique suffix so this test never collides with a
// leftover from a previous run, and it deletes what it creates.
test("author can publish an article and delete it", async ({
  page,
  loginPage,
  articleEditorPage,
  articlePage,
  testUser,
}) => {
  const title = `Testing Forms in Inkwell ${Date.now()}`;
  const draft = {
    title,
    description: "A walkthrough of the article editor",
    body: "Written by a Playwright test to prove the editor form works end to end.",
    tags: "playwright testing",
  };

  await loginPage.loginAs(testUser);

  // Publish via the editor form.
  await articleEditorPage.publishArticle(draft);

  // We land on the new article's page.
  await articlePage.expectTitle(title);
  await expect(page).toHaveURL(/#\/article\/testing-forms-in-inkwell-\d+/);

  // Delete it — answering the window.confirm() dialog — and land back home.
  await articlePage.deleteAndConfirm();

  await expect(page).toHaveURL(/\/#?\/?$/);
  await expect(page.getByRole("button", { name: "Global Feed" })).toBeVisible();
});
