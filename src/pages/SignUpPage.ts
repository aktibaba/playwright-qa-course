import { type Page, type Locator, expect } from "@playwright/test";

export interface NewUser {
  username: string;
  email: string;
  password: string;
}

/** Page Object for the registration screen (/#/register). */
export class SignUpPage {
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByPlaceholder("Your Name");
    this.email = page.getByPlaceholder("Email");
    this.password = page.getByPlaceholder("Password");
    this.submit = page.getByRole("button", { name: "Sign up" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/#/register");
    await expect(this.submit).toBeVisible();
  }

  /** Fill and submit. A successful sign-up logs in and redirects to home. */
  async signUp(user: NewUser): Promise<void> {
    await this.goto();
    await this.username.fill(user.username);
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submit.click();
    await expect(this.submit).toBeHidden(); // navigated away on success
  }
}
