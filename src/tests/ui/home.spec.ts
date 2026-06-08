import { test, expect } from "@playwright/test";

// UI smoke — proves the SPA is served and the brand renders. Inkwell uses a
// HashRouter, so the pathname is always "/" and direct navigation is stable.
test.describe("Inkwell home page", () => {
  test("renders the brand and auth links", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Inkwell");
    // The brand wordmark appears as the banner heading (the navbar/footer also
    // carry "inkwell" links, so target the unique <h1>).
    await expect(page.getByRole("heading", { name: "inkwell" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("navigates to the login page", async ({ page }) => {
    await page.goto("/#/login");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });
});
