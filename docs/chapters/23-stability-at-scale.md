---
title: "Stability & Maintainability at Scale (Playwright + TypeScript, Ch.23)"
description: "The habits that keep a growing suite trustworthy, explained simply: centralize the tricky bits, wait for the right signal instead of guessing, and let new flows reuse what you already built. Plus another real app bug the suite caught."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Stability & Maintainability at Scale

As a suite grows, two qualities decide whether it stays an asset or becomes a burden:

- **Stable** — it fails only for *real* reasons (not random flakiness).
- **Maintainable** — you can add the next test without copy-pasting setup everywhere.

This chapter is about the habits that keep both true, shown by adding comment and
settings flows.

> Code for this chapter is tagged `ch-23` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see `src/utils/unique.ts`,
> `src/pages/SettingsPage.ts`, and the new `comment-ui` / `settings-ui` specs.

## Centralize the tricky bits

Remember the flaky slug bug? It came from generating "unique" data that wasn't actually
unique across parallel workers. The lesson isn't "be more careful" — it's *put the hard
thing in one place so nobody can get it wrong again*:

```ts
// src/utils/unique.ts
let counter = 0;
export function uniqueId(prefix = "id"): string {
  // timestamp + counter + randomness → unique even across parallel workers
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e9)}`;
}
```

Now the article factory and the user factory both call `uniqueId()` — one proven
recipe, no chance to reintroduce the collision. (This is the **DRY** principle — *Don't
Repeat Yourself* — applied to the riskiest line.) Maintainability means *the correct way
is the only way.*

## Wait for the right signal, not a guess

The settings screen loads the current user **asynchronously**, then fills the form.
Editing a field *before* that load finishes would submit blank values over the real
ones. The stable fix is **never** a fixed `waitForTimeout(2000)` (which is either too
short and flaky, or too long and slow) — it's waiting for the actual *readiness signal*:

```ts
// src/pages/SettingsPage.ts
async goto(): Promise<void> {
  await this.page.goto("/#/settings");
  await expect(this.updateButton).toBeVisible();
  await expect(this.username).not.toHaveValue(""); // wait until the form is filled in
}
```

`not.toHaveValue("")` waits until the username field is no longer empty — a concrete
sign the form finished loading. Putting that wait *inside the Page Object* means every
settings test gets the stability for free — the test just calls `goto()`.

## New flows, same machinery

Adding comments and settings needed **no new infrastructure** — they reuse the fixtures
and Page Objects we already have. A comment test reads as plain behaviour:

```ts
test.use({ storageState: ".auth/playwright.json" });

test("post a comment and see it appear", async ({ makeArticle, articlePage }) => {
  const article = await makeArticle();           // seed via API (fast)
  await articlePage.goto(article.slug);
  const body = `Nice article ${Date.now()}`;
  await articlePage.postComment(body);           // act in the UI
  await expect(articlePage.comment(body)).toBeVisible(); // verify in the UI
});
```

The settings test goes a step further on isolation: it **registers a fresh user**
through the API and logs in as them, so changing a profile never collides with other
tests using the shared seed user. New surface, but the same `registerUser`, `loginPage`,
and `settingsPage` building blocks. *That's* what "scales" means — the cost of the next
flow is small because the pieces already exist.

## …and another real bug

Writing the settings flow, the UI test failed — and so did a direct API check. The app's
update endpoint **returned a 500 error on every profile update**:

```js
// the original, buggy condition
if (password !== undefined || password !== "") {   // this is ALWAYS true!
  loggedUser.password = await bcryptHash(password); // hashing `undefined` → crash
}
```

`a !== x || a !== y` can never be false (a value can't equal two different things at
once), so **every** update tried to hash an absent password and crashed — and on a real
save it would have *overwritten the user's password*. One character — `||` → `&&` —
fixed it. The suite didn't just *check* the settings screen; it proved the whole feature
was broken.

## Next up

**Chapter 24 — Framework maturation & docs:** we tidy the project, document how to run
and extend it, and round out coverage so a newcomer can be productive in minutes. Tag:
`ch-24`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me the one helper that removed the most flakiness from your suite.
