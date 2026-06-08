import { test as base } from "@playwright/test";
import { LoginPage } from "@pages/LoginPage";
import { ArticleEditorPage } from "@pages/ArticleEditorPage";
import { ArticlePage } from "@pages/ArticlePage";
import { SettingsPage } from "@pages/SettingsPage";
import { SignUpPage } from "@pages/SignUpPage";

export interface PageFixtures {
  loginPage: LoginPage;
  articleEditorPage: ArticleEditorPage;
  articlePage: ArticlePage;
  settingsPage: SettingsPage;
  signUpPage: SignUpPage;
}

export const test = base.extend<PageFixtures>({
  // Each Page Object is built on THIS test's own `page` fixture — fresh and
  // isolated per test (see Ch.8 on the beforeAll trap).
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  articleEditorPage: async ({ page }, use) => {
    await use(new ArticleEditorPage(page));
  },
  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },
});
