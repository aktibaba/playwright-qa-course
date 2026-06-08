import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the user settings screen (/#/settings). Requires an
 * authenticated session.
 */
export class SettingsPage {
  readonly bio: Locator;
  readonly username: Locator;
  readonly updateButton: Locator;

  constructor(private readonly page: Page) {
    this.bio = page.getByPlaceholder("Short bio about you");
    this.username = page.getByPlaceholder("Your Name");
    this.updateButton = page.getByRole("button", { name: "Update Settings" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/#/settings");
    await expect(this.updateButton).toBeVisible();
    // The form loads the current user async — wait for it before editing, or a
    // submit would send empty username/email over the populated values.
    await expect(this.username).not.toHaveValue("");
  }

  async setBio(text: string): Promise<void> {
    await this.bio.fill(text);
    await this.updateButton.click();
  }
}
