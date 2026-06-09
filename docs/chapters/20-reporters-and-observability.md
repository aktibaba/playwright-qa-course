---
title: "Reporters & Observability (Playwright + TypeScript, Ch.20)"
description: "What a reporter is and how to make failures explain themselves: stack the list, HTML, and JUnit reporters, attach traces and context, and stamp each run with its environment — so you debug from artifacts, not re-runs."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Reporters & Observability

A suite is only as useful as what it tells you when it fails. A red ✘ with no context
means a re-run; a red ✘ with a screenshot, a recording, and the environment it ran on
means a *fix*. This chapter makes failures **self-explanatory**.

> A **reporter** is the part of Playwright that turns raw results into output — terminal
> text, an HTML page, an XML file, whatever you need. You can run several at once.

> Code for this chapter is tagged `ch-20` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see the `reporter` config in
> `playwright.config.ts`.

## Stack reporters for different audiences

Reporters aren't either/or — list several, and each serves a different consumer:

```ts
// playwright.config.ts
reporter: [
  ["list"],                                             // for you, live in the terminal
  ["html", { open: "never" }],                          // a rich, browsable report
  ["junit", { outputFile: "test-results/junit.xml" }],  // an XML file CI understands
],
```

- **`list`** — readable, streaming output while you work.
- **`html`** — the investigative tool: every test, its steps, attached
  screenshots/traces, and the run's metadata. Open it with `npm run test:report`.
- **`junit`** — XML that CI systems (GitHub Actions, GitLab, Jenkins) parse to annotate
  pull requests and track history. We wire this into CI next chapter.
- **`blob`** — a special format made for *merging* results from parallel machines
  (shards); we reach for it in Chapter 21.

## Failures that explain themselves

We set two options back in Chapter 6, and they pay off in every report:

```ts
use: { trace: "on-first-retry", screenshot: "only-on-failure" }
```

On a failure, the HTML report carries the **screenshot** at the moment things broke and
a full **trace** (DOM snapshots, network, console, a timeline you can scrub) from the
retry. You reconstruct exactly what happened **without** reproducing it locally — the
difference between minutes and hours on a CI-only flake.

## Stamp the run with its environment

Because the config sets `metadata` (Chapter 18), every report records *what it ran
against*:

```ts
metadata: { environment: env.name, webURL: env.webURL, apiURL: env.apiURL }
```

"It failed" is noise; "it failed on **staging**, against *that* URL" is a lead.

## Attach your own context

When a test knows something useful — like the API response that drove an assertion —
you can **attach** it, and it appears inline in the report:

```ts
test("...", async ({ api }, testInfo) => {
  const res = await api.get("articles");
  await testInfo.attach("articles-response", {
    body: JSON.stringify(await res.json(), null, 2),
    contentType: "application/json",
  });
});
```

`testInfo` is an extra argument Playwright passes to every test with details about the
current run; `testInfo.attach(...)` saves a file alongside the result. Now the data
that caused a failure travels *with* it.

## More coverage to observe

A report is richer when there's more to observe, so this chapter also broadens the API
coverage — profiles, tags, and pagination — using a **unique tag per test** so the
filtered results are deterministic even under parallelism:

```ts
test("limit caps the page and the filtered count is exact", async ({ makeArticle, api }) => {
  const tag = `pg-${Date.now()}`;                  // unique → only THIS test's articles
  await makeArticle({ tagList: [tag] });
  await makeArticle({ tagList: [tag] });
  await makeArticle({ tagList: [tag] });

  const body = await (await api.get("articles", { params: { tag, limit: 2 } })).json();
  expect(body.articlesCount).toBe(3);     // exact filtered total
  expect(body.articles.length).toBe(2);   // capped by limit
});
```

> A finding while writing these: Inkwell's **`offset` pagination was broken** —
> `?tag=X&limit=2&offset=2` over 3 matches returned **0** items instead of 1, because
> the API multiplied `offset * limit` (treating offset as a page number), breaking the
> RealWorld contract. Exactly the sort of bug good coverage surfaces — we fix it in the
> app in Chapter 21 and the offset test goes green.

## Next up

We have results CI can read. **Chapter 21 — CI/CD with GitHub Actions:** stand up the
dockerized app in a workflow, run the suite **sharded** across machines, merge the
reports, and publish the HTML report as a downloadable artifact. Tag: `ch-21`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me which reporter you live in.
