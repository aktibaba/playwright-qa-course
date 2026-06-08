import { test, expect } from "@fixtures";

// Chapter 12 — auth & sessions. `authedApi` carries the testUser's token, so an
// authenticated call is as easy as an anonymous one. We also assert the API
// rejects the same call without a token.
test.describe("Authenticated API", () => {
  test("GET /user returns the current user", async ({ authedApi, testUser }) => {
    const res = await authedApi.get("user");

    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.username).toBe(testUser.username);
    expect(user.email).toBe(testUser.email);
    expect(user.token).toBeTruthy();
  });

  test("GET /user without a token is rejected", async ({ api }) => {
    const res = await api.get("user");

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.errors.body[0]).toContain("login");
  });
});
