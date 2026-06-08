import { test, expect } from "@fixtures";

// Pagination — driven through a UNIQUE tag so exactly the articles this test
// creates match the filter, making limit/offset assertions deterministic even
// while other tests run in parallel.
test.describe("Articles pagination", () => {
  test("limit caps the page and the filtered count is exact", async ({ makeArticle, api }) => {
    const tag = `pg-${Date.now()}`;
    await makeArticle({ tagList: [tag] });
    await makeArticle({ tagList: [tag] });
    await makeArticle({ tagList: [tag] });

    const res = await api.get("articles", { params: { tag, limit: 2 } });
    const body = await res.json();

    expect(body.articlesCount).toBe(3); // total matching the tag
    expect(body.articles.length).toBe(2); // capped by limit
    expect(
      body.articles.every((a: { tagList: string[] }) => a.tagList.includes(tag)),
    ).toBe(true);
  });

  test("without a limit, all matching articles are returned", async ({ makeArticle, api }) => {
    const tag = `pg2-${Date.now()}`;
    for (let i = 0; i < 3; i++) await makeArticle({ tagList: [tag] });

    const res = await api.get("articles", { params: { tag } });
    const body = await res.json();

    expect(body.articlesCount).toBe(3);
    expect(body.articles.length).toBe(3);
    expect(
      body.articles.every((a: { tagList: string[] }) => a.tagList.includes(tag)),
    ).toBe(true);
  });
});
