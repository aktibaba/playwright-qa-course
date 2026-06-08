import { type Page, type Locator, expect } from "@playwright/test";

export interface ArticleDraft {
  title: string;
  description: string;
  body: string;
  /** Space- or comma-separated tags, e.g. "playwright testing". */
  tags?: string;
}

/**
 * Page Object for Inkwell's article editor (/#/editor). A richer form than login:
 * title, description, a markdown body, and a tags input. Requires an authenticated
 * session.
 */
export class ArticleEditorPage {
  readonly title: Locator;
  readonly description: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly publish: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByPlaceholder("Article Title");
    this.description = page.getByPlaceholder("What's this article about?");
    this.body = page.getByPlaceholder("Write your article (in markdown)");
    this.tags = page.getByPlaceholder("Enter tags");
    this.publish = page.getByRole("button", { name: "Publish Article" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/#/editor");
    await expect(this.title).toBeVisible();
  }

  /** Fill the whole form and publish. Navigates to the new article on success. */
  async publishArticle(draft: ArticleDraft): Promise<void> {
    await this.goto();
    await this.title.fill(draft.title);
    await this.description.fill(draft.description);
    await this.body.fill(draft.body);
    if (draft.tags) await this.tags.fill(draft.tags);
    await this.publish.click();
  }
}
