import { test, expect } from "@fixtures";

// Chapter 11 — APIRequestContext fundamentals. Read-only assertions against
// Inkwell's RealWorld API: status codes, JSON shape, query params, and errors.
// Data is seeded once by global-setup; the `api` fixture is the request context.
test.describe("Articles API (read)", () => {
  test("GET /articles lists the seeded article", async ({ api }) => {
    const res = await api.get("articles");

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");

    const body = await res.json();
    expect(typeof body.articlesCount).toBe("number");
    expect(Array.isArray(body.articles)).toBe(true);

    const slugs = body.articles.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain("welcome-to-inkwell");
  });

  test("GET /articles respects the limit query param", async ({ api }) => {
    const res = await api.get("articles", { params: { limit: 1 } });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.articles.length).toBeLessThanOrEqual(1);
  });

  test("GET /articles/:slug returns a single article", async ({ api }) => {
    const res = await api.get("articles/welcome-to-inkwell");

    expect(res.ok()).toBeTruthy();
    const { article } = await res.json();
    expect(article.title).toBe("Welcome to Inkwell");
    expect(article.author.username).toBe("alice");
    expect(article.tagList).toEqual([]);
  });

  test("GET /articles/:slug returns 404 for an unknown slug", async ({ api }) => {
    const res = await api.get("articles/does-not-exist-xyz");

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.errors.body[0]).toContain("not found");
  });
});
