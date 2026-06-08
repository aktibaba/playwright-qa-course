import type { APIRequestContext } from "@playwright/test";
import { articleData, type ArticleInput } from "@data/article";

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
