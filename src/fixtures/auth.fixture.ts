import {
  mergeTests,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { env } from "@utils/env";
import { test as apiTest } from "./api.fixture";
import { test as dataTest } from "./data.fixture";

export interface AuthFixtures {
  /** An APIRequestContext that carries the testUser's auth token on every call. */
  authedApi: APIRequestContext;
}

// CHAINED, not merged: `authedApi` depends on `api` and `testUser`, so we build it
// on top of a test that already has them (Ch.9: merge across modules, chain within
// a dependency line). It's test-scoped because it depends on the test-scoped
// `testUser` — and in Part 4 that user becomes unique per test.
export const test = mergeTests(apiTest, dataTest).extend<AuthFixtures>({
  authedApi: async ({ api, testUser }, use) => {
    const res = await api.post("users/login", {
      data: { user: { email: testUser.email, password: testUser.password } },
    });
    const { user } = await res.json();

    const context = await request.newContext({
      baseURL: `${env.apiURL}/`,
      // RealWorld uses the "Token <jwt>" scheme (not "Bearer").
      extraHTTPHeaders: { Authorization: `Token ${user.token}` },
    });
    await use(context);
    await context.dispose();
  },
});
