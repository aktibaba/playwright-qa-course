import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the single-article view (/#/article/:slug). Covers deleting the
 * article (a native window.confirm dialog) and the comments thread.
 */
export class ArticlePage {
  /** "Delete Article" renders in both the banner and the footer actions. */
  readonly deleteButton: Locator;
  readonly commentInput: Locator;
  readonly postCommentButton: Locator;

  constructor(private readonly page: Page) {
    this.deleteButton = page
      .getByRole("button", { name: "Delete Article" })
      .first();
    this.commentInput = page.getByPlaceholder("Write a comment...");
    this.postCommentButton = page.getByRole("button", { name: "Post Comment" });
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/#/article/${slug}`);
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
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

  // --- comments -------------------------------------------------------------
  async postComment(body: string): Promise<void> {
    await this.commentInput.fill(body);
    await this.postCommentButton.click();
  }

  /** A posted comment card by its body text (the editor card has no .card-text). */
  comment(body: string): Locator {
    return this.page.locator(".card", {
      has: this.page.locator(".card-text", { hasText: body }),
    });
  }

  /** Delete a comment via its trash icon, accepting the confirm() dialog. */
  async deleteComment(body: string): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.comment(body).locator(".ion-trash-a").click();
  }
}
