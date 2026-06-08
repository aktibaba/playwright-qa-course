import { test, expect } from "@fixtures";
import { uniqueId } from "@utils/unique";

// Authentication flows through the UI: sign up, log out, and a failed login.
test.describe("Auth flows (UI)", () => {
  test("signing up via the form lands logged in", async ({ signUpPage, page }) => {
    const username = uniqueId("newbie").replace(/-/g, "");
    await signUpPage.signUp({
      username,
      email: `${username}@test.io`,
      password: "Password123!",
    });

    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText(username)).toBeVisible();
  });

  test("a wrong password shows an error and stays on the login page", async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.submitCredentials({ email: "playwright@test.io", password: "definitely-wrong" });

    await expect(page.locator(".error-messages")).toBeVisible();
    await expect(loginPage.submit).toBeVisible(); // not redirected
  });
});

// Logout needs a logged-in session; load the saved storage state for this file.
test.describe("Logout (UI)", () => {
  test.use({ storageState: ".auth/playwright.json" });

  test("logging out returns to the anonymous navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();

    // Open the user dropdown, then log out.
    await page.getByRole("navigation").getByText("playwright").click();
    await page.getByText("Logout").click();

    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Article" })).toBeHidden();
  });
});
