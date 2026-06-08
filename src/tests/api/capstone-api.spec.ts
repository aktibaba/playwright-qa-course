import { test, expect } from "@fixtures";
import { registerUser, createArticleAs } from "@utils/scenarios";
import { uniqueId } from "@utils/unique";

// A final sweep of API edges to round out coverage.
test.describe("API edges", () => {
  test("login with an unknown email is rejected", async ({ api }) => {
    const res = await api.post("users/login", {
      data: { user: { email: `${uniqueId("nobody")}@test.io`, password: "Password123!" } },
    });
    expect([401, 404, 422]).toContain(res.status());
  });

  test("the current-user endpoint requires authentication", async ({ api }) => {
    const res = await api.get("user");
    expect(res.status()).toBe(401);
  });

  test("register without an email is rejected", async ({ api }) => {
    const res = await api.post("users", {
      data: { user: { username: uniqueId("u"), password: "Password123!" } },
    });
    expect(res.status()).toBe(422);
  });

  test("GET /tags returns an array", async ({ api }) => {
    const res = await api.get("tags");
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray((await res.json()).tags)).toBe(true);
  });

  test("a known profile is returned", async ({ api }) => {
    const res = await api.get("profiles/alice");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).profile.username).toBe("alice");
  });

  test("the seed author alice owns the welcome article", async ({ api }) => {
    const res = await api.get("articles", { params: { author: "alice" } });
    const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain("welcome-to-inkwell");
  });

  test("the author can delete their own comment", async ({ makeArticle, authedApi, api }) => {
    const article = await makeArticle();
    const created = await authedApi.post(`articles/${article.slug}/comments`, {
      data: { comment: { body: "mine to remove" } },
    });
    const { comment } = await created.json();

    const del = await authedApi.delete(`articles/${article.slug}/comments/${comment.id}`);
    expect(del.ok()).toBeTruthy();

    const list = await api.get(`articles/${article.slug}/comments`);
    expect((await list.json()).comments).toEqual([]);
  });

  test("the favorited filter returns articles the user favorited", async ({ makeArticle, authedApi, api, testUser }) => {
    const article = await makeArticle();
    await authedApi.post(`articles/${article.slug}/favorite`);

    const res = await api.get("articles", {
      params: { favorited: testUser.username, limit: 100 },
    });
    const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain(article.slug);
  });

  test("unfollowing removes an author's articles from the feed", async ({ api, authedApi }) => {
    const author = await registerUser(api);
    const article = await createArticleAs(author.token);
    await authedApi.post(`profiles/${author.username}/follow`);
    await authedApi.delete(`profiles/${author.username}/follow`);

    const res = await authedApi.get("articles/feed", { params: { limit: 100 } });
    const slugs = (await res.json()).articles.map((a: { slug: string }) => a.slug);
    expect(slugs).not.toContain(article.slug);
  });
});
