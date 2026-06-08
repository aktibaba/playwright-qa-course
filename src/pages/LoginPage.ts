import { type Page, type Locator, expect } from "@playwright/test";

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Page Object for Inkwell's login screen. It owns the locators and the *actions*
 * a user can take here, so tests speak in behavior ("log in as this user") and a
 * markup change has exactly one place to fix.
 */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByPlaceholder("Email");
    this.password = page.getByPlaceholder("Password");
    this.submit = page.getByRole("button", { name: "Login" });
  }

  /** Navigate to /#/login and wait until the form is ready. */
  async goto(): Promise<void> {
    await this.page.goto("/#/login");
    await expect(this.submit).toBeVisible();
  }

  /** Fill the form and submit. Assumes you're already on the login page. */
  async submitCredentials({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  /** The whole flow: open the page, enter credentials, submit. */
  async loginAs(credentials: Credentials): Promise<void> {
    await this.goto();
    await this.submitCredentials(credentials);
    // A successful login navigates away from /#/login. Wait for the form to
    // unmount so callers can navigate next without racing the post-login
    // redirect (which would otherwise bounce them back to the home page).
    await expect(this.submit).toBeHidden();
  }
}
