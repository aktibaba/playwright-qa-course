import { test, expect } from "@playwright/test";

// Chapter 15 — reuse the saved session. `storageState` loads the cookies +
// localStorage captured by the setup project, so this test opens the app already
// logged in. No LoginPage, no form, no per-test login cost.
test.use({ storageState: ".auth/playwright.json" });

test.describe("Authenticated session (storageState)", () => {
  test("starts already logged in", async ({ page }) => {
    await page.goto("/");

    // Authoring affordances only a logged-in user sees:
    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("playwright"),
    ).toBeVisible();
    // And the logged-out CTA is gone.
    await expect(page.getByRole("link", { name: "Sign up" })).toBeHidden();
  });
});
