---
title: "Reporters & Observability (Playwright + TypeScript, Ch.20)"
description: "Make test results legible. Stack the list, HTML, and JUnit reporters; attach traces and context so a failure explains itself; and stamp each run with its environment — so you debug from artifacts, not re-runs."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Reporters & Observability

A suite is only as useful as what it tells you when it fails. A red X with no context
means a re-run; a red X with a trace, a screenshot, and the environment it ran
against means a fix. This chapter makes failures **self-explanatory** — and grows our
coverage so there's more worth observing.

> Code for this chapter is tagged `ch-20` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `reporter` config in
> `playwright.config.ts` and the new `profiles` / `tags` / `pagination` specs.

## Stack reporters for different audiences

Reporters aren't either/or — list several and each serves a consumer:

```ts
// playwright.config.ts
reporter: [
  ["list"],                                          // humans, live in the terminal
  ["html", { open: "never" }],                       // rich, browsable, with traces
  ["junit", { outputFile: "test-results/junit.xml" }], // CI ingests this
],
```

- **`list`** — readable streaming output while you work.
- **`html`** — the investigative tool: every test, its steps, attached
  screenshots/traces, and the run's metadata. Open it with `npm run test:report`.
- **`junit`** — XML that GitHub Actions, GitLab, Jenkins, etc. parse to annotate PRs
  and track history. We wire this into CI next chapter.

(There's also a **`blob`** reporter built for *merging* results from parallel shards —
we'll reach for it in Chapter 21.)

## Failures that explain themselves

We set these once, back in Chapter 6, and they pay off in every report:

```ts
use: { trace: "on-first-retry", screenshot: "only-on-failure" }
```

On a failure, the HTML report carries the **screenshot** at the point of failure and
a full **trace** (DOM snapshots, network, console, timeline) for the retry. You
reconstruct exactly what happened without reproducing it locally — the difference
between minutes and hours on a CI-only flake.

## Stamp the run with its environment

Because the config sets `metadata` (Chapter 18), every report says *what it ran
against*:

```ts
metadata: { environment: env.name, webURL: env.webURL, apiURL: env.apiURL }
```

"It failed" is noise; "it failed on **staging**, against *that* URL" is a lead.

## Attach your own context

When a test knows something useful, attach it — it shows up inline in the report:

```ts
test("...", async ({ api }, testInfo) => {
  const res = await api.get("articles");
  await testInfo.attach("articles-response", {
    body: JSON.stringify(await res.json(), null, 2),
    contentType: "application/json",
  });
});
```

Now the response that drove an assertion travels *with* the result.

## More coverage to observe

Reports are richer when the suite covers more, so this chapter also broadens the API
surface — profiles, tags, and pagination — using a **unique tag per test** so the
filtered results are deterministic under parallelism:

```ts
test("limit caps the page and the filtered count is exact", async ({ makeArticle, api }) => {
  const tag = `pg-${Date.now()}`;
  await makeArticle({ tagList: [tag] });
  await makeArticle({ tagList: [tag] });
  await makeArticle({ tagList: [tag] });

  const body = await (await api.get("articles", { params: { tag, limit: 2 } })).json();
  expect(body.articlesCount).toBe(3);     // exact filtered total
  expect(body.articles.length).toBe(2);   // capped by limit
});
```

> A finding while writing these: Inkwell's **`offset` is broken** —
> `?tag=X&limit=2&offset=2` over 3 matches returns **0** items instead of 1. We
> avoid relying on offset and flag it as a bug to report — exactly the sort of thing
> good coverage (and a readable report) surfaces.

## Next up

We have results CI can read. **Chapter 21 — CI/CD with GitHub Actions:** stand up the
dockerized SUT in a workflow, run the suite **sharded** across machines, merge the
blob reports, and publish the HTML report as an artifact. Tag: `ch-21`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which reporter you live in.
