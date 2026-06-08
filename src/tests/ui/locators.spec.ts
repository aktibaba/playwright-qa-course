import { test, expect } from "@playwright/test";

// Chapter 3 — locators & web-first assertions. These run against stable parts of
// Inkwell (navigation + the login form), so they need no seeded data and stay
// deterministic. Each test demonstrates one locator/assertion habit.
test.describe("Locators & web-first assertions", () => {
  test("prefer role-based locators over CSS", async ({ page }) => {
    await page.goto("/");

    // getByRole asserts the accessible role AND name — resilient to markup changes.
    await expect(page.getByRole("button", { name: "Global Feed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "inkwell" })).toBeVisible();
  });

  test("strict mode forces you to disambiguate", async ({ page }) => {
    await page.goto("/");

    // The brand "inkwell" is a link in BOTH the navbar and the footer. A bare
    // getByRole here would throw a strict-mode error — so we assert the count
    // and then narrow with .first().
    const brand = page.getByRole("link", { name: "inkwell" });
    await expect(brand).toHaveCount(2);
    await expect(brand.first()).toBeVisible();
  });

  test("form locators: placeholder, role, and state", async ({ page }) => {
    await page.goto("/#/login");

    const email = page.getByPlaceholder("Email");
    const password = page.getByPlaceholder("Password");
    const submit = page.getByRole("button", { name: "Login" });

    await expect(email).toBeVisible();
    await expect(submit).toBeEnabled();

    // Web-first assertions auto-wait and re-poll — no manual waits needed.
    await email.fill("playwright@test.io");
    await password.fill("Password123!");
    await expect(email).toHaveValue("playwright@test.io");
  });
});
