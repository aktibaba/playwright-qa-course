import { test, expect } from "@fixtures";

// Comments through the UI — seed the article via the API (fast), act through the
// browser, verify in the browser. Authenticated via the saved storage state.
test.use({ storageState: ".auth/playwright.json" });

test.describe("Comments (UI)", () => {
  test("post a comment and see it appear", async ({ makeArticle, articlePage }) => {
    const article = await makeArticle();
    await articlePage.goto(article.slug);

    const body = `Nice article ${Date.now()}`;
    await articlePage.postComment(body);

    await expect(articlePage.comment(body)).toBeVisible();
  });

  test("delete a comment via the UI", async ({ makeArticle, articlePage }) => {
    const article = await makeArticle();
    await articlePage.goto(article.slug);

    const body = `To delete ${Date.now()}`;
    await articlePage.postComment(body);
    await expect(articlePage.comment(body)).toBeVisible();

    await articlePage.deleteComment(body);
    await expect(articlePage.comment(body)).toBeHidden();
  });
});
