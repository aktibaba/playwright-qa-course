import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the single-article view (/#/article/:slug). Demonstrates
 * handling a native browser dialog: deleting an article triggers a
 * window.confirm() that Playwright must answer.
 */
export class ArticlePage {
  /** "Delete Article" renders in both the banner and the footer actions. */
  readonly deleteButton: Locator;

  constructor(private readonly page: Page) {
    this.deleteButton = page
      .getByRole("button", { name: "Delete Article" })
      .first();
  }

  /** Assert the article title heading is shown. */
  async expectTitle(title: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: title }),
    ).toBeVisible();
  }

  /**
   * Click Delete and accept the confirm() dialog. The handler must be registered
   * BEFORE the click — Playwright auto-dismisses dialogs otherwise, and the click
   * would hang waiting on the modal.
   */
  async deleteAndConfirm(): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.deleteButton.click();
  }
}
