import { test, expect } from "@fixtures";

// Comments — listing behavior on a fresh, isolated article.
test.describe("Comments listing", () => {
  test("a fresh article has no comments", async ({ makeArticle, api }) => {
    const article = await makeArticle();
    const res = await api.get(`articles/${article.slug}/comments`);
    expect((await res.json()).comments).toEqual([]);
  });

  test("multiple comments are all listed", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    for (const body of ["first", "second", "third"]) {
      await authedApi.post(`articles/${article.slug}/comments`, {
        data: { comment: { body } },
      });
    }

    const res = await api.get(`articles/${article.slug}/comments`);
    const bodies = (await res.json()).comments.map((c: { body: string }) => c.body);
    expect(bodies).toEqual(expect.arrayContaining(["first", "second", "third"]));
    expect(bodies).toHaveLength(3);
  });

  test("a comment carries its author", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    await authedApi.post(`articles/${article.slug}/comments`, {
      data: { comment: { body: "by playwright" } },
    });

    const res = await api.get(`articles/${article.slug}/comments`);
    expect((await res.json()).comments[0].author.username).toBe("playwright");
  });
});
