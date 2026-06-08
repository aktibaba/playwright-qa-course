import { test, expect } from "@fixtures";
import { uniqueId } from "@utils/unique";

// Validation & error contracts — the negative paths a happy-path suite forgets.
test.describe("Validation", () => {
  test("create article without a title is rejected", async ({ authedApi }) => {
    const res = await authedApi.post("articles", {
      data: { article: { description: "d", body: "b", tagList: [] } },
    });
    expect(res.status()).toBe(422);
  });

  test("create article without a description is rejected", async ({ authedApi }) => {
    const res = await authedApi.post("articles", {
      data: { article: { title: uniqueId("t"), body: "b", tagList: [] } },
    });
    expect(res.status()).toBe(422);
  });

  test("create article without a body is rejected", async ({ authedApi }) => {
    const res = await authedApi.post("articles", {
      data: { article: { title: uniqueId("t"), description: "d", tagList: [] } },
    });
    expect(res.status()).toBe(422);
  });

  test("create article WITHOUT a tagList succeeds (regression)", async ({ authedApi }) => {
    const res = await authedApi.post("articles", {
      data: { article: { title: uniqueId("t"), description: "d", body: "b" } },
    });
    expect(res.ok()).toBeTruthy();
    await authedApi.delete(`articles/${(await res.json()).article.slug}`);
  });

  test("a duplicate title is rejected (unique slug)", async ({ authedApi }) => {
    const title = uniqueId("Dup");
    const first = await authedApi.post("articles", {
      data: { article: { title, description: "d", body: "b", tagList: [] } },
    });
    const dup = await authedApi.post("articles", {
      data: { article: { title, description: "d", body: "b", tagList: [] } },
    });
    expect(dup.status()).toBe(422);
    await authedApi.delete(`articles/${(await first.json()).article.slug}`);
  });

  test("an empty comment body is rejected", async ({ authedApi, makeArticle }) => {
    const article = await makeArticle();
    const res = await authedApi.post(`articles/${article.slug}/comments`, {
      data: { comment: { body: "" } },
    });
    expect(res.status()).toBe(422);
  });

  test("register without a username is rejected", async ({ api }) => {
    const res = await api.post("users", {
      data: { user: { email: `${uniqueId("e")}@test.io`, password: "Password123!" } },
    });
    expect(res.status()).toBe(422);
  });

  test("register with a duplicate email is rejected", async ({ api }) => {
    const res = await api.post("users", {
      data: { user: { username: uniqueId("u"), email: "playwright@test.io", password: "Password123!" } },
    });
    expect(res.status()).toBe(422);
  });

  test("login with a wrong password is rejected", async ({ api, testUser }) => {
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: "wrong-password" } },
    });
    expect(res.status()).toBe(422);
  });
});
