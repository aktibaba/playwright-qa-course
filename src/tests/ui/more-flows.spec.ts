import { test, expect } from "@fixtures";

// A few more UI flows to round out coverage.
test.describe("More UI flows", () => {
  test("the logged-out navbar offers Login and Sign up, not authoring", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Article" })).toBeHidden();
  });

  test("the home page shows the Popular Tags sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Popular Tags" })).toBeVisible();
  });
});

// Logged-in flows need the saved session.
test.describe("More UI flows (authenticated)", () => {
  test.use({ storageState: ".auth/playwright.json" });

  test("publishing an empty article stays on the editor", async ({ articleEditorPage, page }) => {
    await articleEditorPage.goto();
    await articleEditorPage.publish.click(); // nothing filled in

    // No navigation to an article — the form is still here.
    await expect(articleEditorPage.title).toBeVisible();
    await expect(page).toHaveURL(/#\/editor/);
  });

  test("the article page shows authoring controls to the author", async ({ makeArticle, articlePage, page }) => {
    const article = await makeArticle(); // authored by playwright
    await articlePage.goto(article.slug);

    await expect(page.getByRole("button", { name: "Delete Article" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit Article" }).first()).toBeVisible();
  });
});
