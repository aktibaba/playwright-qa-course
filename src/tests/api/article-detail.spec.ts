import { test, expect } from "@fixtures";
import { uniqueId } from "@utils/unique";

// Article shape & updates.
test.describe("Article detail", () => {
  test("a single article returns its full shape", async ({ makeArticle, api }) => {
    const tag = uniqueId("t");
    const article = await makeArticle({ tagList: [tag] });

    const res = await api.get(`articles/${article.slug}`);
    const { article: got } = await res.json();
    expect(got.slug).toBe(article.slug);
    expect(got.author.username).toBe("playwright");
    expect(got.tagList).toContain(tag);
    expect(typeof got.favoritesCount).toBe("number");
    expect(got.favorited).toBe(false); // anonymous request
  });

  test("the list carries author and counts", async ({ makeArticle, api }) => {
    await makeArticle();
    const res = await api.get("articles", { params: { limit: 1 } });
    const { articles } = await res.json();
    expect(articles[0].author.username).toBeTruthy();
    expect(typeof articles[0].favoritesCount).toBe("number");
  });

  test("updating an article changes its body and keeps the slug", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    const newBody = `Edited ${Date.now()}`;

    const upd = await authedApi.put(`articles/${article.slug}`, {
      data: { article: { body: newBody } },
    });
    expect(upd.ok()).toBeTruthy();
    expect((await upd.json()).article.slug).toBe(article.slug);

    const got = await api.get(`articles/${article.slug}`);
    expect((await got.json()).article.body).toBe(newBody);
  });

  test("multiple tags are all stored", async ({ makeArticle, api }) => {
    const tags = [uniqueId("a"), uniqueId("b"), uniqueId("c")];
    const article = await makeArticle({ tagList: tags });

    const got = await api.get(`articles/${article.slug}`);
    const tagList = (await got.json()).article.tagList;
    for (const t of tags) expect(tagList).toContain(t);
  });
});
