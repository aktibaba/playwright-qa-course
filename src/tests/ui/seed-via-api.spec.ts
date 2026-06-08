import { test, expect } from "@fixtures";

// Chapter 16 — the integration pattern: create data through the API in
// milliseconds (no UI clicking), then verify the UI renders it. Viewing an
// article is public, so this test needs no logged-in browser — only the creation
// is authenticated, handled by makeArticle.
test.describe("Seed via API, verify in UI", () => {
  test("an article created through the API renders on its page", async ({
    makeArticle,
    page,
  }) => {
    const article = await makeArticle({
      title: `Seeded via API ${Date.now()}`,
      body: "This article was created through the API and rendered by the UI.",
      tagList: ["integration"],
    });

    await page.goto(`/#/article/${article.slug}`);

    await expect(page.getByRole("heading", { name: article.title })).toBeVisible();
    await expect(page.getByText(article.body)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "playwright" }).first(),
    ).toBeVisible();
  });
});
