import { test, expect } from "@fixtures";
import { registerUser, createArticleAs } from "@utils/scenarios";

// Authenticated UI flows that round out coverage: profile pages, the global feed
// toggle, tag filtering, and editing an article. Seeded via the API, verified in
// the browser.
test.use({ storageState: ".auth/playwright.json" });

test.describe("Profile, feed & editing (UI)", () => {
  test("an author's article shows on their profile", async ({ api, page }) => {
    // A FRESH author, so their profile lists exactly this one article (playwright
    // authors hundreds across the suite — its profile is too noisy to assert on).
    const author = await registerUser(api);
    const article = await createArticleAs(author.token, { title: `Profile piece ${Date.now()}` });

    await page.goto(`/#/profile/${author.username}`);

    await expect(page.getByRole("heading", { name: article.title })).toBeVisible();
  });

  test("the Global Feed toggle loads the article list", async ({ makeArticle, page }) => {
    await makeArticle(); // ensure the global feed is non-empty

    await page.goto("/");
    const globalFeed = page.getByRole("button", { name: "Global Feed" });
    await globalFeed.click();

    // The toggle activates and a real article preview renders. (Asserting a
    // SPECIFIC article would be position-dependent — the unfiltered feed is
    // page-limited and other tests add articles concurrently.)
    await expect(globalFeed).toHaveClass(/active/);
    await expect(page.locator(".preview-link").first()).toBeVisible();
  });

  test("clicking a tag filters the feed to it", async ({ makeArticle, page }) => {
    const tag = `topic${Date.now()}`;
    const article = await makeArticle({ title: `Tagged ${Date.now()}`, tagList: [tag] });

    await page.goto("/");
    await page.getByRole("button", { name: tag }).click(); // tag pill in Popular Tags

    await expect(page.getByRole("heading", { name: article.title })).toBeVisible();
  });

  test("editing an article updates it", async ({ makeArticle, articleEditorPage, articlePage, page }) => {
    const article = await makeArticle({ title: `Editable ${Date.now()}` });

    await articleEditorPage.gotoEdit(article.slug, article.title);
    await articleEditorPage.editBody("An edited body, saved from the editor.");

    // Lands back on the article; the new body is rendered.
    await articlePage.expectTitle(article.title);
    await expect(page.getByText("An edited body, saved from the editor.")).toBeVisible();
  });
});
