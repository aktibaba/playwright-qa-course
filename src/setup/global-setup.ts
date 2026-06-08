import { request } from "@playwright/test";
import { env } from "../utils/env";

/**
 * Runs once before the whole suite: reset Inkwell to known seed data so every
 * test starts from a deterministic baseline. Because no individual test resets
 * the database anymore, read tests can never race a mid-run wipe.
 */
export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: `${env.apiURL}/` });
  try {
    const res = await ctx.post("test/reset");
    if (!res.ok()) {
      throw new Error(`global-setup: reset failed with HTTP ${res.status()}`);
    }
  } finally {
    await ctx.dispose();
  }
}
