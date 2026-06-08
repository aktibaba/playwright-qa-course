import { test, expect } from "@fixtures";

// Favorites — the count as seen through the article endpoint (fresh article per
// test, so the count is deterministic).
test.describe("Favorites count", () => {
  test("favoriting is reflected in the article's favoritesCount", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    await authedApi.post(`articles/${article.slug}/favorite`);

    const res = await api.get(`articles/${article.slug}`);
    expect((await res.json()).article.favoritesCount).toBe(1);
  });

  test("unfavoriting returns the count to zero", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    await authedApi.post(`articles/${article.slug}/favorite`);
    await authedApi.delete(`articles/${article.slug}/favorite`);

    const res = await api.get(`articles/${article.slug}`);
    expect((await res.json()).article.favoritesCount).toBe(0);
  });
});
