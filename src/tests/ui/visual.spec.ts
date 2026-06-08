import { test, expect } from "@playwright/test";

// Visual regression — pixel-compare static pages against committed baselines.
// Screenshots are platform-specific (font rendering differs across OSes), so we
// skip on CI; generate Linux baselines there with `--update-snapshots` in the
// Playwright Docker image when you wire visual checks into a pipeline.
test.skip(!!process.env.CI, "visual baselines are platform-specific");

test.describe("Visual regression", () => {
  test("login page matches its baseline", async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready); // avoid web-font swap flicker

    await expect(page).toHaveScreenshot("login.png", { maxDiffPixelRatio: 0.02 });
  });

  test("register page matches its baseline", async ({ page }) => {
    await page.goto("/#/register");
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot("register.png", { maxDiffPixelRatio: 0.02 });
  });
});
