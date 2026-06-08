import { test as base, request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";

export interface ApiWorkerFixtures {
  /** An APIRequestContext pre-pointed at the Inkwell API, shared per worker. */
  api: APIRequestContext;
}

// `api` is WORKER-scoped: the context holds no per-test state (no cookies, no
// auth), so building one per test would be pure waste. One per worker, reused by
// every test that worker runs, disposed once at the end.
export const test = base.extend<object, ApiWorkerFixtures>({
  api: [
    async ({}, use) => {
      // Trailing slash + relative paths sidestep the baseURL trap from Ch.2.
      const context = await request.newContext({ baseURL: `${env.apiURL}/` });
      await use(context);
      await context.dispose();
    },
    { scope: "worker" },
  ],
});
