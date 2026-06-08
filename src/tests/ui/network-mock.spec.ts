import { test, expect } from "@playwright/test";

// Network mocking — drive the UI with `page.route`, so these tests need no backend
// data and are fully deterministic. We control exactly what the API "returns".
function mockArticle(overrides = {}) {
  return {
    slug: "mock-1",
    title: "Mocked Headline",
    description: "A controlled article",
    body: "Body",
    tagList: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    author: { username: "ghost", bio: null, image: null, following: false, followersCount: 0 },
    favorited: false,
    favoritesCount: 0,
    ...overrides,
  };
}

test.describe("Network mocking", () => {
  test("renders a mocked article feed", async ({ page }) => {
    await page.route("**/api/articles?*", (route) =>
      route.fulfill({ json: { articles: [mockArticle()], articlesCount: 1 } }),
    );

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Mocked Headline" })).toBeVisible();
  });

  test("shows the empty state when the feed is empty", async ({ page }) => {
    await page.route("**/api/articles?*", (route) =>
      route.fulfill({ json: { articles: [], articlesCount: 0 } }),
    );

    await page.goto("/");

    await expect(page.getByText("Articles not available.")).toBeVisible();
  });

  test("survives an API error without crashing", async ({ page }) => {
    await page.route("**/api/articles?*", (route) =>
      route.fulfill({ status: 500, json: { errors: { body: ["boom"] } } }),
    );

    await page.goto("/");

    // The shell still renders even though the feed request failed.
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });
});
