import { test, expect } from "@fixtures";

// Chapter 14 — scenario helpers. Tests start from the state they need in one line
// via `makeArticle`, and never clean up by hand: the fixture deletes everything it
// provisioned when the test ends.
test.describe("Article scenarios", () => {
  test("a provisioned article is retrievable by slug", async ({ makeArticle, api }) => {
    const article = await makeArticle({ title: "Findable Article", tagList: ["scenario"] });

    const res = await api.get(`articles/${article.slug}`);
    expect(res.ok()).toBeTruthy();

    const found = (await res.json()).article;
    expect(found.title).toBe(article.title);
    expect(found.tagList).toEqual(["scenario"]);
    expect(found.author.username).toBe("playwright");
  });

  test("a provisioned article appears in the global feed", async ({ makeArticle, api }) => {
    const article = await makeArticle();

    const res = await api.get("articles");
    const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain(article.slug);
  });
});
