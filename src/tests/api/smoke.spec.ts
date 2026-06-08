import { test, expect } from "@playwright/test";
import { env } from "@utils/env";

// API smoke — proves the dockerized Inkwell API is up, the test endpoints work,
// and seeding is deterministic. Paths are built from env.apiURL explicitly so
// there's no baseURL/relative-path ambiguity (a relative "/test" would drop the
// "/api" prefix). A dedicated api fixture replaces this boilerplate in Part 3.
//
// Serial mode: every test here shares one database, and /test/reset drops &
// recreates every table. Running them in parallel would let one test wipe the
// schema mid-request for another. We reset ONCE up front, then run in order.
test.describe.configure({ mode: "serial" });

test.describe("Inkwell API smoke", () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${env.apiURL}/test/reset`);
    expect(res.ok()).toBeTruthy();
  });

  test("reset returns known seed data", async ({ request }) => {
    const res = await request.post(`${env.apiURL}/test/reset`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("reset");
    expect(body.article).toBe("welcome-to-inkwell");
    expect(body.users.map((u: { username: string }) => u.username)).toContain(
      "playwright",
    );
  });

  test("tags endpoint responds", async ({ request }) => {
    const res = await request.get(`${env.apiURL}/tags`);
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toHaveProperty("tags");
  });

  test("seeded user can log in and gets a token", async ({ request }) => {
    const res = await request.post(`${env.apiURL}/users/login`, {
      data: { user: { email: "playwright@test.io", password: "Password123!" } },
    });
    expect(res.ok()).toBeTruthy();

    const { user } = await res.json();
    expect(user.username).toBe("playwright");
    expect(user.token).toBeTruthy();
  });
});
