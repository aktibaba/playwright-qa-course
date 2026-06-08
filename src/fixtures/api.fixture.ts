import { test as base, request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";

export interface ApiFixtures {
  /** An APIRequestContext pre-pointed at the Inkwell API. */
  api: APIRequestContext;
}

export const test = base.extend<ApiFixtures>({
  api: async ({}, use) => {
    // Trailing slash + relative paths sidestep the baseURL trap from Ch.2:
    // a leading-slash path would otherwise drop the "/api" prefix.
    const context = await request.newContext({ baseURL: `${env.apiURL}/` });
    await use(context);
    await context.dispose();
  },
});
