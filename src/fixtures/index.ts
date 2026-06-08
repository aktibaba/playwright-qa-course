import { mergeTests, expect } from "@playwright/test";
import { test as dataTest } from "./data.fixture";
import { test as apiTest } from "./api.fixture";
import { test as pagesTest } from "./pages.fixture";

/**
 * The single import surface for the whole framework. Each concern lives in its
 * own focused module (data, api, pages); `mergeTests` composes them into one
 * `test` with all fixtures combined and fully typed. Adding a capability later =
 * write a new *.fixture.ts and add it here — specs never change their import.
 */
export const test = mergeTests(dataTest, apiTest, pagesTest);

export { expect };

// Re-export shared types/data so specs import everything from "@fixtures".
export { SEED_USERS, type TestUser } from "./data.fixture";
