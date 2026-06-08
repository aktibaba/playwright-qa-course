import { test, expect } from "@fixtures";

// Favorites API — each test favorites its OWN freshly-made article, so the count
// is deterministic (starts at 0) regardless of what else runs in parallel.
test.describe("Favorites API", () => {
  test("favoriting sets favorited and bumps the count", async ({ makeArticle, authedApi }) => {
    const article = await makeArticle();

    const res = await authedApi.post(`articles/${article.slug}/favorite`);
    expect(res.ok()).toBeTruthy();

    const favorited = (await res.json()).article;
    expect(favorited.favorited).toBe(true);
    expect(favorited.favoritesCount).toBe(1);
  });

  test("unfavoriting reverses it", async ({ makeArticle, authedApi }) => {
    const article = await makeArticle();
    await authedApi.post(`articles/${article.slug}/favorite`);

    const res = await authedApi.delete(`articles/${article.slug}/favorite`);
    const a = (await res.json()).article;
    expect(a.favorited).toBe(false);
    expect(a.favoritesCount).toBe(0);
  });

  test("favoriting requires auth", async ({ makeArticle, api }) => {
    const article = await makeArticle();
    const res = await api.post(`articles/${article.slug}/favorite`);
    expect(res.status()).toBe(401);
  });
});
