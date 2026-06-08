import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// Accessibility — scan key pages with axe-core and fail on serious/critical
// violations. (Public pages, no auth or seeded data needed.)
const PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/#/login" },
  { name: "register", path: "/#/register" },
];

for (const { name, path } of PAGES) {
  test(`${name} page has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    // .first(): the home feed's pagination is also a navigation landmark.
    await expect(page.getByRole("navigation").first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      // Exclude the pagination widget: react-paginate renders its <ul> with
      // role="navigation", which orphans the <li>s (a `listitem` violation). It's
      // a third-party limitation we can't fix from app code — triage it out and
      // report upstream rather than letting it mask our own regressions.
      .exclude(".pagination")
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // Helpful on failure: list the rule ids that fired.
    expect(serious, serious.map((v) => `${v.id} (${v.impact})`).join(", ")).toEqual([]);
  });
}
