---
title: "Reporting: Custom Reporters & Result Visibility (Playwright + TypeScript, Ch.25)"
description: "Turn raw results into something a team acts on. Recap the built-in reporters, write a custom reporter for an end-of-run summary, surface results on the CI run page, and know when to reach for Allure or a dashboard."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Reporting: Custom Reporters & Result Visibility

Chapter 6 made *failures* legible (traces, the HTML report). This chapter is about
**results** as a whole — the signal a team reads every day: what passed, what's
flaky, what's slow, and getting that in front of people without anyone opening a
report.

> Code for this chapter is tagged `ch-25` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `reporters/summary-reporter.ts` and the `reporter` array in `playwright.config.ts`.

## The built-ins, recapped

We already stack three (Chapter 20): `list` (terminal), `html` (rich, browsable,
with traces), and `junit` (XML for CI to ingest). Others ship in the box: `dot`
(compact for huge suites), `json` (machine-readable), `github` (inline PR
annotations), and `blob` (mergeable across shards, Chapter 21). You can run any
combination.

## Write a custom reporter

When the built-ins don't say exactly what you want, implement the **Reporter**
interface. The hooks are simple: `onBegin`, `onTestEnd`, `onEnd`. Here's a reporter
that prints an end-of-run summary — totals by status, flaky count, slowest tests,
and a per-project breakdown:

```ts
// reporters/summary-reporter.ts
import type { Reporter, TestCase, TestResult, FullResult } from "@playwright/test/reporter";

export default class SummaryReporter implements Reporter {
  private entries: { test: TestCase; result: TestResult }[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.entries.push({ test, result });
  }

  onEnd(result: FullResult) {
    const count = (s: TestResult["status"]) =>
      this.entries.filter((e) => e.result.status === s).length;
    const flaky = this.entries.filter(
      (e) => e.result.status === "passed" && e.result.retry > 0,
    ).length;

    console.log(`\n  ${result.status} — ✓ ${count("passed")}  ✘ ${count("failed")}  ⤿ flaky ${flaky}`);
    // …plus slowest tests and a per-project breakdown
  }
}
```

Register it alongside the others:

```ts
// playwright.config.ts
reporter: [
  ["list"],
  ["html", { open: "never" }],
  ["junit", { outputFile: "test-results/junit.xml" }],
  ["./reporters/summary-reporter.ts"],
],
```

Now every run ends with:

```
── Run summary ───────────────────────────────
  result:   passed
  tests:    57  (✓ 57  ✘ 0  ⤿ flaky 0  – skipped 0)
  projects: setup 1  api 32  ui 24
  slowest:
    741ms  home page has no serious accessibility violations
    ...
```

The **flaky** number is the one to watch over time — a test that passes only on
retry is a bug waiting to redden the pipeline (Chapter 19).

## Put results where people look

A report nobody opens isn't reporting. Two cheap, high-value channels:

- **The CI run page.** GitHub Actions exposes `GITHUB_STEP_SUMMARY` — append Markdown
  to that file and it renders on the run summary. Our reporter writes a pass/fail
  table there when the env var is present, so results show up without downloading an
  artifact.
- **PR annotations.** The built-in `github` reporter marks failing lines directly in
  the PR diff. Add it to the `reporter` array on CI.

For history and trends — flaky-rate over time, durations, ownership — that's where a
dedicated tool earns its keep: **Allure** (`allure-playwright`), or shipping the
`json`/`blob` output to a dashboard. Reach for those when "how is the suite trending?"
becomes a recurring question; the custom reporter covers the per-run story.

## The principle

Reporting is a **transformation of results into a decision**: merge → summarize →
deliver to where the audience already is. Playwright gives you the raw events; a
few lines of reporter turn them into the one line your team actually reads.

## Next up

Everything's in place — and visible. **Chapter 26 — Capstone:** one comprehensive
end-to-end regression that exercises the whole product (sign up → author → comment →
favorite → follow) and ties every technique from the course together. Tag: `ch-26`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me what your end-of-run summary would highlight.
