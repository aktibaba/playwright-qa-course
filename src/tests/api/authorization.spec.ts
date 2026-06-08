import { test, expect } from "@fixtures";
import { registerUser, createArticleAs } from "@utils/scenarios";

// Authorization — you can only mutate your own resources.
test.describe("Authorization", () => {
  test("updating someone else's article is forbidden", async ({ api, authedApi }) => {
    const author = await registerUser(api);
    const article = await createArticleAs(author.token);

    const res = await authedApi.put(`articles/${article.slug}`, {
      data: { article: { body: "hijacked" } },
    });
    expect(res.status()).toBe(403);
  });

  test("deleting someone else's article is forbidden", async ({ api, authedApi }) => {
    const author = await registerUser(api);
    const article = await createArticleAs(author.token);

    const res = await authedApi.delete(`articles/${article.slug}`);
    expect(res.status()).toBe(403);
  });
});
