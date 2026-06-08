import { test, expect } from "@fixtures";

// Profiles API — read coverage for the user/profile surface.
test.describe("Profiles API", () => {
  test("GET /profiles/:username returns the profile", async ({ api }) => {
    const res = await api.get("profiles/alice");
    expect(res.ok()).toBeTruthy();

    const { profile } = await res.json();
    expect(profile.username).toBe("alice");
    expect(typeof profile.following).toBe("boolean");
    expect(typeof profile.followersCount).toBe("number");
  });

  test("GET /profiles/:username returns 404 for an unknown user", async ({ api }) => {
    const res = await api.get("profiles/nobody-xyz");
    expect(res.status()).toBe(404);
  });
});
