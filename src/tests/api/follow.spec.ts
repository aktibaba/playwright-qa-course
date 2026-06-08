import { test, expect } from "@fixtures";
import { registerUser } from "@utils/scenarios";

// Follow API — each test follows a BRAND-NEW user (registered on the spot), so the
// follower count is deterministic and tests never contend on a shared relationship.
test.describe("Follow API", () => {
  test("following sets following and bumps the follower count", async ({ api, authedApi }) => {
    const target = await registerUser(api);

    const res = await authedApi.post(`profiles/${target.username}/follow`);
    expect(res.ok()).toBeTruthy();

    const profile = (await res.json()).profile;
    expect(profile.following).toBe(true);
    expect(profile.followersCount).toBe(1);
  });

  test("unfollowing reverses it", async ({ api, authedApi }) => {
    const target = await registerUser(api);
    await authedApi.post(`profiles/${target.username}/follow`);

    const res = await authedApi.delete(`profiles/${target.username}/follow`);
    const profile = (await res.json()).profile;
    expect(profile.following).toBe(false);
  });

  test("following requires auth", async ({ api }) => {
    const target = await registerUser(api);
    const res = await api.post(`profiles/${target.username}/follow`);
    expect(res.status()).toBe(401);
  });
});
