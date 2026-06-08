import { test, expect } from "@fixtures";

// API smoke — now using the `api` fixture (an APIRequestContext pre-pointed at the
// Inkwell API). No more `${env.apiURL}` prefixes, no leading-slash trap: paths are
// plain relatives like "test/reset".
//
// Serial: every test shares one database and /test/reset drops every table, so the
// first test reseeds and the rest run in order. (Per-test isolation: Part 4.)
test.describe.configure({ mode: "serial" });

test.describe("Inkwell API smoke", () => {
  test("reset returns known seed data", async ({ api }) => {
    const res = await api.post("test/reset");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("reset");
    expect(body.article).toBe("welcome-to-inkwell");
    expect(body.users.map((u: { username: string }) => u.username)).toContain(
      "playwright",
    );
  });

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
