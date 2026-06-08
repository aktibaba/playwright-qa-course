import { test as setup, expect } from "@playwright/test";
import { env } from "@utils/env";
import { SEED_USERS } from "../fixtures/data.fixture";

// Runs as the "setup" project, before the UI tests that depend on it. We log in
// ONCE through the API (fast), write the session Inkwell expects into
// localStorage, and save the whole browser storage to disk. UI tests then start
// already authenticated — no logging in through the form on every test.
const authFile = ".auth/playwright.json";

setup("authenticate", async ({ page, request }) => {
  const { email, password } = SEED_USERS.playwright;

  // 1. Log in via the API and get the token.
  const res = await request.post(`${env.apiURL}/users/login`, {
    data: { user: { email, password } },
  });
  expect(res.ok()).toBeTruthy();
  const { user } = await res.json();

  // 2. Inkwell restores its session from this exact localStorage shape on load.
  const session = {
    headers: { Authorization: `Token ${user.token}` },
    isAuth: true,
    loggedUser: user,
  };
  await page.goto("/");
  await page.evaluate((value) => {
    localStorage.setItem("loggedUser", JSON.stringify(value));
  }, session);

  // 3. Persist cookies + localStorage to disk for reuse.
  await page.context().storageState({ path: authFile });

  // Sanity-check that the saved session actually authenticates.
  await page.reload();
  await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
});
