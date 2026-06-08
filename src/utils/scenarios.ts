import type { APIRequestContext } from "@playwright/test";

export interface ArticleInput {
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  author: { username: string };
  [key: string]: unknown;
}

function uniqueTitle(): string {
  return `Scenario Article ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Provision an article through the API. Reusable building block for scenario
 * setup — pass an authenticated context and any field overrides. Always sends
 * `tagList` (the Ch.13 quirk: the API throws without it).
 */
export async function createArticle(
  api: APIRequestContext,
  overrides: ArticleInput = {},
): Promise<Article> {
  const res = await api.post("articles", {
    data: {
      article: {
        title: overrides.title ?? uniqueTitle(),
        description: overrides.description ?? "Seeded by a scenario helper",
        body: overrides.body ?? "Body text.",
        tagList: overrides.tagList ?? [],
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`createArticle failed: HTTP ${res.status()}`);
  }
  return (await res.json()).article as Article;
}
