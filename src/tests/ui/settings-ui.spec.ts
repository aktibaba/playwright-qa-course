import { test, expect } from "@fixtures";
import { registerUser } from "@utils/scenarios";

// Settings through the UI. Uses a BRAND-NEW user (registered via the API, then
// logged in through the form) so the test owns its identity and never contends
// with other tests on the shared seed user's profile.
test.describe("Settings (UI)", () => {
  test("update bio and see it on the profile", async ({
    api,
    loginPage,
    settingsPage,
    page,
  }) => {
    const user = await registerUser(api);
    await loginPage.loginAs({ email: user.email, password: user.password });

    const bio = `Bio set by a test ${Date.now()}`;
    await settingsPage.goto();
    await settingsPage.setBio(bio);

    // Verify it persisted by reading the user's public profile.
    await page.goto(`/#/profile/${user.username}`);
    await expect(page.getByText(bio)).toBeVisible();
  });
});
