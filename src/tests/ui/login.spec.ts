import { test, expect } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";

// Chapter 4 — Page Object Model. The test reads as behavior; all the "how"
// (selectors, fill, click) lives in LoginPage.
//
// No DB reset here: the `ui` project depends on the `api` project (see
// playwright.config.ts), so the database is already seeded by the time UI tests
// run — and the API's resets can never race a UI read. Real per-test data
// isolation comes later (Part 4).
const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test.describe("Login (Page Object)", () => {
  test("a seeded user can log in", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginAs(SEED_USER);

    // Logged-in state: the navbar now offers article authoring and shows the
    // username — neither is present when logged out.
    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("playwright"),
    ).toBeVisible();
  });
});
