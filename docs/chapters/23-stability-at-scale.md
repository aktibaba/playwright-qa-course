---
title: "Stability & Maintainability at Scale (Playwright + TypeScript, Ch.23)"
description: "The habits that keep a growing suite trustworthy: centralize the tricky bits (unique data), wait for the right signal instead of guessing, and let new flows reuse the same fixtures and Page Objects. Plus another real SUT bug the suite caught."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Stability & Maintainability at Scale

As a suite grows, two things decide whether it stays an asset or becomes a liability:
is it **stable** (does it fail only for real reasons?) and is it **maintainable**
(can you add the next flow without copy-paste?). This chapter is about the habits
that keep both true — demonstrated by adding comment and settings flows.

> Code for this chapter is tagged `ch-23` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/utils/unique.ts`,
> `src/pages/SettingsPage.ts`, and the new `comment-ui` / `settings-ui` specs.

## Centralize the tricky bits

The flaky slug bug a few chapters back came from generating "unique" data that
wasn't unique across parallel workers. The lesson isn't "be careful" — it's *put the
hard thing in one place so nobody gets it wrong again*:

```ts
// src/utils/unique.ts
let counter = 0;
export function uniqueId(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e9)}`;
}
```

Now the article factory and the user factory both call `uniqueId()` — one proven
recipe, zero chances to reintroduce the collision. That's maintainability: the
correct way is the only way.

## Wait for the right signal, not a guess

The settings screen loads the current user **asynchronously**, then fills the form.
Editing a field before that load lands would submit empty values over the real ones.
The stable fix is never a `waitForTimeout` — it's waiting for the actual readiness
signal:

```ts
// src/pages/SettingsPage.ts
async goto(): Promise<void> {
  await this.page.goto("/#/settings");
  await expect(this.updateButton).toBeVisible();
  await expect(this.username).not.toHaveValue(""); // the form has loaded
}
```

Encapsulating that wait *in the Page Object* means every settings test inherits the
stability for free — the test just calls `goto()`.

## New flows, same machinery

Adding comments and settings didn't require new infrastructure — they reuse the
fixtures and Page Objects we already have. A comment test reads as behavior:

```ts
test.use({ storageState: ".auth/playwright.json" });

test("post a comment and see it appear", async ({ makeArticle, articlePage }) => {
  const article = await makeArticle();           // seed via API
  await articlePage.goto(article.slug);
  const body = `Nice article ${Date.now()}`;
  await articlePage.postComment(body);           // act in UI
  await expect(articlePage.comment(body)).toBeVisible(); // verify in UI
});
```

The settings test goes further on isolation: it registers a **fresh** user through
the API and logs in as them, so changing a profile never contends with other tests
on the shared seed user. New surface, but the same `registerUser`, `loginPage`, and
`settingsPage` building blocks. That's what "scales" means here — the marginal cost
of the next flow is small.

## …and another real bug

Writing the settings flow, the UI test failed — and so did a direct API check. The
SUT's update endpoint **500'd on every profile update**:

```js
// the original, buggy condition
if (password !== undefined || password !== "") {   // always true!
  loggedUser.password = await bcryptHash(password); // bcryptHash(undefined) -> 500
}
```

`a !== x || a !== y` is **always true**, so every update tried to hash an absent
password (`"data and salt arguments required"`) — and on a real save would have
clobbered the user's password. One character — `||` → `&&` — fixed it. The suite
didn't just *verify* the settings screen; it proved the whole feature was broken.

## Next up

**Chapter 24 — Framework maturation & docs:** we tidy the project, document how to
run and extend it, and round out coverage so a newcomer can be productive in
minutes. Tag: `ch-24`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the one helper that removed the most flakiness from your suite.
