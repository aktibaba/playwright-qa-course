import { test, expect } from "@fixtures";

// API health — the database is seeded once by global-setup, so these are pure
// reads with no reset and no serial ordering needed.
test.describe("API health", () => {
  test("tags endpoint responds", async ({ api }) => {
    const res = await api.get("tags");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toHaveProperty("tags");
  });

  test("seeded user can log in and gets a token", async ({ api, testUser }) => {
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: testUser.password } },
    });
    expect(res.ok()).toBeTruthy();

    const { user } = await res.json();
    expect(user.username).toBe(testUser.username);
    expect(user.token).toBeTruthy();
  });
});
