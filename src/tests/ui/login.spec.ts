import { test, expect, request as apiRequest } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";
import { env } from "@utils/env";

// Chapter 4 — Page Object Model. The test reads as behavior; all the "how"
// (selectors, fill, click) lives in LoginPage.
//
// Serial + one reset up front: this test logs a seeded user in, so it needs the
// known seed data present. Real per-test isolation comes later (Part 4).
const SEED_USER = { email: "playwright@test.io", password: "Password123!" };

test.describe.configure({ mode: "serial" });

test.describe("Login (Page Object)", () => {
  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext();
    await ctx.post(`${env.apiURL}/test/reset`);
    await ctx.dispose();
  });

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
