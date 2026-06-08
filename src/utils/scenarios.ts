import { request, type APIRequestContext } from "@playwright/test";
import { env } from "@utils/env";
import { articleData, type ArticleInput } from "@data/article";
import { uniqueId } from "@utils/unique";

export type { ArticleInput };

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  author: { username: string };
  [key: string]: unknown;
}

/**
 * Provision an article through the API. Reusable building block for scenario
 * setup — pass an authenticated context and any field overrides. Defaults come
 * from the article factory.
 */
export async function createArticle(
  api: APIRequestContext,
  overrides: Partial<ArticleInput> = {},
): Promise<Article> {
  const res = await api.post("articles", {
    data: { article: articleData(overrides) },
  });
  if (!res.ok()) {
    throw new Error(`createArticle failed: HTTP ${res.status()}`);
  }
  return (await res.json()).article as Article;
}

/**
 * Provision an article authored by a SPECIFIC user (by their token), via a
 * short-lived authenticated context. Useful when a test needs an article whose
 * author is a fresh, isolated user (e.g. an uncluttered profile page).
 */
export async function createArticleAs(
  token: string,
  overrides: Partial<ArticleInput> = {},
): Promise<Article> {
  const ctx = await request.newContext({
    baseURL: `${env.apiURL}/`,
    extraHTTPHeaders: { Authorization: `Token ${token}` },
  });
  try {
    return await createArticle(ctx, overrides);
  } finally {
    await ctx.dispose();
  }
}

export interface RegisteredUser {
  username: string;
  email: string;
  password: string;
  token: string;
}

/**
 * Register a brand-new, unique user through the API. Useful when a test needs a
 * fresh identity it fully controls (e.g. follow/unfollow without contending on a
 * shared seed user's follower count).
 */
export async function registerUser(
  api: APIRequestContext,
  overrides: Partial<Pick<RegisteredUser, "username" | "email" | "password">> = {},
): Promise<RegisteredUser> {
  const username = overrides.username ?? uniqueId("user");
  const email = overrides.email ?? `${username}@test.io`;
  const password = overrides.password ?? "Password123!";

  const res = await api.post("users", {
    data: { user: { username, email, password } },
  });
  if (!res.ok()) {
    throw new Error(`registerUser failed: HTTP ${res.status()}`);
  }
  const { user } = await res.json();
  return { username, email, password, token: user.token };
}
