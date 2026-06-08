import { test, expect } from "@fixtures";
import { registerUser } from "@utils/scenarios";

// Users & auth surface.
test.describe("Users API", () => {
  test("register returns the user with a token", async ({ api }) => {
    const username = `u${Date.now()}`;
    const res = await api.post("users", {
      data: { user: { username, email: `${username}@test.io`, password: "Password123!" } },
    });
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.username).toBe(username);
    expect(user.token).toBeTruthy();
  });

  test("an invalid token is rejected with 401 (regression)", async ({ api }) => {
    const res = await api.get("user", {
      headers: { Authorization: "Token not.a.real.token" },
    });
    expect(res.status()).toBe(401);
  });

  test("login returns the user's identity and a token", async ({ api, testUser }) => {
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: testUser.password } },
    });
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.username).toBe(testUser.username);
    expect(user.email).toBe(testUser.email);
    expect(user.token).toBeTruthy();
  });

  test("updating the bio persists and the password still works (regression)", async ({ api }) => {
    const user = await registerUser(api);
    const authed = await api.post("users/login", {
      data: { user: { email: user.email, password: user.password } },
    });
    const token = (await authed.json()).user.token;

    const update = await api.put("user", {
      headers: { Authorization: `Token ${token}` },
      data: { user: { bio: "Updated bio" } },
    });
    expect(update.ok()).toBeTruthy();

    const profile = await api.get(`profiles/${user.username}`);
    expect((await profile.json()).profile.bio).toBe("Updated bio");

    // The password was NOT clobbered by the update.
    const relogin = await api.post("users/login", {
      data: { user: { email: user.email, password: user.password } },
    });
    expect(relogin.ok()).toBeTruthy();
  });

  test("profile following flips after follow/unfollow", async ({ api, authedApi }) => {
    const target = await registerUser(api);

    const before = await authedApi.get(`profiles/${target.username}`);
    expect((await before.json()).profile.following).toBe(false);

    await authedApi.post(`profiles/${target.username}/follow`);
    const after = await authedApi.get(`profiles/${target.username}`);
    expect((await after.json()).profile.following).toBe(true);

    await authedApi.delete(`profiles/${target.username}/follow`);
    const reset = await authedApi.get(`profiles/${target.username}`);
    expect((await reset.json()).profile.following).toBe(false);
  });
});
