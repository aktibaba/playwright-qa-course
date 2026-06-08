import { test, expect } from "@fixtures";
import { uniqueId } from "@utils/unique";

// Capstone — full end-to-end journeys for a brand-new user, exercising signup,
// authoring, the profile, and comments together. Each journey owns a fresh user,
// so it's fully isolated.
test.describe("Capstone journeys", () => {
  test("a new user signs up, publishes an article, and sees it on their profile", async ({
    signUpPage,
    articleEditorPage,
    articlePage,
    page,
  }) => {
    const username = uniqueId("author").replace(/-/g, "");
    await signUpPage.signUp({ username, email: `${username}@test.io`, password: "Password123!" });

    const title = `Capstone article ${Date.now()}`;
    await articleEditorPage.publishArticle({
      title,
      description: "Written during the capstone",
      body: "The whole stack, end to end.",
      tags: "capstone",
    });

    await articlePage.expectTitle(title);

    // It shows on the (uncluttered) profile of this fresh author.
    await page.goto(`/#/profile/${username}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("a new user comments on an existing article", async ({
    signUpPage,
    makeArticle,
    articlePage,
  }) => {
    const article = await makeArticle(); // seeded via API
    const username = uniqueId("commenter").replace(/-/g, "");
    await signUpPage.signUp({ username, email: `${username}@test.io`, password: "Password123!" });

    await articlePage.goto(article.slug);
    const body = `Capstone comment ${Date.now()}`;
    await articlePage.postComment(body);

    await expect(articlePage.comment(body)).toBeVisible();
  });
});
