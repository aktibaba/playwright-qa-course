import { test as base } from "@playwright/test";

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

export interface DataFixtures {
  /** A default seed user, so tests stop hard-coding credentials. */
  testUser: TestUser;
}

export const test = base.extend<DataFixtures>({
  testUser: async ({}, use) => {
    await use(SEED_USERS.playwright);
  },
});
