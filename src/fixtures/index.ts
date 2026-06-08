import { mergeTests, expect } from "@playwright/test";
import { test as authTest } from "./auth.fixture";
import { test as pagesTest } from "./pages.fixture";

/**
 * The single import surface for the whole framework. `authTest` chains data + api +
 * authedApi (a dependency line); `pagesTest` adds the Page Objects. `mergeTests`
 * composes the modules into one `test` with all fixtures combined and fully typed.
 * Adding a capability later = a new *.fixture.ts here — specs never change imports.
 */
export const test = mergeTests(authTest, pagesTest);

export { expect };

// Re-export shared types/data so specs import everything from "@fixtures".
export { SEED_USERS, type TestUser } from "./data.fixture";
