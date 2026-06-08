import { test, expect } from "@fixtures";
import { registerUser, createArticleAs } from "@utils/scenarios";

// Article list filters. Each test uses a FRESH author so the filtered result is
// exactly the data it created — deterministic under parallelism.
test.describe("Article list filters", () => {
  test("filters by author", async ({ api }) => {
    const author = await registerUser(api);
    const article = await createArticleAs(author.token);

    const res = await api.get("articles", { params: { author: author.username } });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.articlesCount).toBe(1);
    expect(body.articles[0].slug).toBe(article.slug);
    expect(body.articles[0].author.username).toBe(author.username);
  });

  test("returns an empty list for an author with no articles", async ({ api }) => {
    const loner = await registerUser(api);

    const res = await api.get("articles", { params: { author: loner.username } });
    const body = await res.json();
    expect(body.articlesCount).toBe(0);
    expect(body.articles).toEqual([]);
  });

  test("the feed returns articles from followed authors", async ({ api, authedApi }) => {
    const author = await registerUser(api);
    const article = await createArticleAs(author.token);

    await authedApi.post(`profiles/${author.username}/follow`);

    // High limit so the assertion doesn't depend on the article's feed position.
    const res = await authedApi.get("articles/feed", { params: { limit: 100 } });
    expect(res.ok()).toBeTruthy();
    const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain(article.slug);
  });
});
