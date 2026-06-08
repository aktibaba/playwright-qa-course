import { test, expect } from "@fixtures";

// Chapter 13 — a CRUD suite through `authedApi`. Each test creates its OWN article
// (unique title → unique slug) and deletes it, so tests never collide and leave
// the database as they found it.
function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

test.describe("Articles CRUD", () => {
  test("create returns the new article with a generated slug", async ({
    authedApi,
  }) => {
    const title = uniqueTitle("CRUD create");
    const res = await authedApi.post("articles", {
      data: {
        article: { title, description: "made by a test", body: "body", tagList: ["api", "crud"] },
      },
    });
    expect(res.ok()).toBeTruthy();

    const { article } = await res.json();
    expect(article.title).toBe(title);
    expect(article.slug).toContain("crud-create-");
    expect(article.tagList).toEqual(["api", "crud"]);
    expect(article.author.username).toBe("playwright");

    await authedApi.delete(`articles/${article.slug}`); // cleanup
  });

  test("update changes fields without changing the slug", async ({ authedApi }) => {
    const create = await authedApi.post("articles", {
      // tagList is required even when empty — see the note in the chapter.
      data: { article: { title: uniqueTitle("CRUD update"), description: "old", body: "b", tagList: [] } },
    });
    const { article } = await create.json();

    const res = await authedApi.put(`articles/${article.slug}`, {
      data: { article: { description: "new description" } },
    });
    expect(res.ok()).toBeTruthy();

    const updated = (await res.json()).article;
    expect(updated.slug).toBe(article.slug);
    expect(updated.description).toBe("new description");

    await authedApi.delete(`articles/${article.slug}`); // cleanup
  });

  test("delete removes the article (404 afterward)", async ({ authedApi }) => {
    const create = await authedApi.post("articles", {
      data: { article: { title: uniqueTitle("CRUD delete"), description: "d", body: "b", tagList: [] } },
    });
    const { article } = await create.json();

    const del = await authedApi.delete(`articles/${article.slug}`);
    expect(del.status()).toBe(200);

    const after = await authedApi.get(`articles/${article.slug}`);
    expect(after.status()).toBe(404);
  });

  test("create without a token is rejected", async ({ api }) => {
    const res = await api.post("articles", {
      data: { article: { title: "no auth", description: "d", body: "b" } },
    });
    expect(res.status()).toBe(401);
  });
});
