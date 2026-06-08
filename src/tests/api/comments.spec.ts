import { test, expect } from "@fixtures";

// Comments API — comments live on a freshly-made article per test, so the comment
// list is deterministic.
test.describe("Comments API", () => {
  test("post a comment, then find it in the list", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();

    const res = await authedApi.post(`articles/${article.slug}/comments`, {
      data: { comment: { body: "Great read" } },
    });
    expect(res.ok()).toBeTruthy();

    const { comment } = await res.json();
    expect(comment.body).toBe("Great read");
    expect(comment.author.username).toBe("playwright");

    const list = await (await api.get(`articles/${article.slug}/comments`)).json();
    expect(list.comments.map((c: { id: number }) => c.id)).toContain(comment.id);
  });

  test("delete a comment removes it from the list", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    const { comment } = await (
      await authedApi.post(`articles/${article.slug}/comments`, {
        data: { comment: { body: "to be deleted" } },
      })
    ).json();

    const del = await authedApi.delete(`articles/${article.slug}/comments/${comment.id}`);
    expect(del.ok()).toBeTruthy();

    const list = await (await api.get(`articles/${article.slug}/comments`)).json();
    expect(list.comments.map((c: { id: number }) => c.id)).not.toContain(comment.id);
  });

  test("commenting requires auth", async ({ makeArticle, api }) => {
    const article = await makeArticle();
    const res = await api.post(`articles/${article.slug}/comments`, {
      data: { comment: { body: "x" } },
    });
    expect(res.status()).toBe(401);
  });
});
