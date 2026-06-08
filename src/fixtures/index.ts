import {
  test as base,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { env } from "@utils/env";

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

/** The deterministic users created by POST /api/test/reset. */
export const SEED_USERS = {
  playwright: {
    username: "playwright",
    email: "playwright@test.io",
    password: "Password123!",
  },
  alice: { username: "alice", email: "alice@test.io", password: "Password123!" },
  bob: { username: "bob", email: "bob@test.io", password: "Password123!" },
} as const satisfies Record<string, TestUser>;

export interface Fixtures {
  /** An APIRequestContext pre-pointed at the Inkwell API. */
  api: APIRequestContext;
  /** A default seed user, so tests stop hard-coding credentials. */
  testUser: TestUser;
}

/**
 * The project's custom `test`. Today it provides `api` and `testUser`; later
 * chapters add Page Objects and compose more fixture modules into this same
 * import surface.
 */
export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    // Trailing slash + relative paths sidestep the baseURL trap from Ch.2:
    // a leading-slash path would otherwise drop the "/api" prefix.
    const context = await request.newContext({ baseURL: `${env.apiURL}/` });
    await use(context);
    await context.dispose();
  },

  testUser: async ({}, use) => {
    await use(SEED_USERS.playwright);
  },
});

export { expect };
