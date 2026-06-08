import { test as authTest } from "./auth.fixture";
import { createArticle, type Article, type ArticleInput } from "@utils/scenarios";

export interface ScenarioFixtures {
  /**
   * Factory: create an article (authenticated) and get it back. Every article
   * made through it is deleted automatically when the test ends — no manual
   * cleanup in the test.
   */
  makeArticle: (overrides?: Partial<ArticleInput>) => Promise<Article>;
}

// Chains on authTest (it needs `authedApi`). Tracks everything it provisions and
// tears it all down after the test.
export const test = authTest.extend<ScenarioFixtures>({
  makeArticle: async ({ authedApi }, use) => {
    const created: string[] = [];

    const make = async (overrides: Partial<ArticleInput> = {}): Promise<Article> => {
      const article = await createArticle(authedApi, overrides);
      created.push(article.slug);
      return article;
    };

    await use(make);

    // Teardown: remove everything this test created, best-effort.
    for (const slug of created) {
      await authedApi.delete(`articles/${slug}`).catch(() => {});
    }
  },
});
