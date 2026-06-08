import { test, expect } from "@fixtures";

// Chapter 8 — the LoginPage now arrives as a ready-built fixture; the test no
// longer constructs it. Credentials come from the `testUser` fixture (Ch.7).
//
// No DB reset here: the `ui` project depends on the `api` project (see
// playwright.config.ts), so the database is already seeded by the time UI tests
// run — and the API's resets can never race a UI read. Real per-test data
// isolation comes later (Part 4).
test.describe("Login (Page Object)", () => {
  test("a seeded user can log in", async ({ page, loginPage, testUser }) => {
    await loginPage.loginAs(testUser);

    // Logged-in state: the navbar now offers article authoring and shows the
    // username — neither is present when logged out.
    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText(testUser.username),
    ).toBeVisible();
  });
});
