import { test, expect } from "@fixtures";

// Tags API — a tag created on an article shows up in GET /tags. A unique tag keeps
// this isolated from whatever other tests create concurrently.
test.describe("Tags API", () => {
  test("a tag used on an article appears in GET /tags", async ({ makeArticle, api }) => {
    const tag = `topic-${Date.now()}`;
    await makeArticle({ tagList: [tag] });

    const res = await api.get("tags");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).tags).toContain(tag);
  });
});
