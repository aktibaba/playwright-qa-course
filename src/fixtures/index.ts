import { mergeTests, expect } from "@playwright/test";
import { test as scenariosTest } from "./scenarios.fixture";
import { test as pagesTest } from "./pages.fixture";

/**
 * The single import surface for the whole framework. `scenariosTest` chains the
 * dependency line data → api → authedApi → makeArticle; `pagesTest` adds the Page
 * Objects. `mergeTests` composes the modules into one `test`, fully typed. Adding a
 * capability later = a new *.fixture.ts here — specs never change their import.
 */
export const test = mergeTests(scenariosTest, pagesTest);

export { expect };

// Re-export shared types/data so specs import everything from "@fixtures".
export { SEED_USERS, type TestUser } from "./data.fixture";
