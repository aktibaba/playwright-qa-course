---
title: "Reporting: Custom Reporters & Result Visibility (Playwright + TypeScript, Ch.25)"
description: "Turn raw test results into something a team acts on. Recap the built-in reporters, write your own custom reporter (with the lifecycle hooks explained), surface results on the CI run page, and know when to reach for Allure."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# Reporting: Custom Reporters & Result Visibility

Chapter 6 made individual *failures* legible (traces, the HTML report). This chapter is
about **results as a whole** — the signal a team reads every day: what passed, what's
flaky, what's slow — and getting it in front of people without anyone opening a report.

> Code for this chapter is tagged `ch-25` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `reporters/summary-reporter.ts` and the `reporter` array in `playwright.config.ts`.

## The built-ins, recapped

A **reporter** turns the stream of test events into output. We already stack three
(Chapter 20): `list` (terminal), `html` (rich, browsable), and `junit` (XML for CI).
Others ship in the box: `dot` (very compact for huge suites), `json`
(machine-readable), `github` (annotations right on a pull request), and `blob`
(mergeable across shards). You can run any combination at once.

## Write a custom reporter

When the built-ins don't say *exactly* what you want, you write your own by
implementing Playwright's **`Reporter` interface**.

> An *interface* here is a set of methods Playwright will call at certain moments. You
> only implement the ones you care about. The key **lifecycle hooks**:
> `onBegin` (the run starts), `onTestEnd` (one test finished — called once per test),
> and `onEnd` (the whole run finished).

Here's a reporter that collects every result and prints an end-of-run summary —
totals, a flaky count, and the slowest tests:

```ts
// reporters/summary-reporter.ts
import type { Reporter, TestCase, TestResult, FullResult } from "@playwright/test/reporter";

export default class SummaryReporter implements Reporter {
  private entries: { test: TestCase; result: TestResult }[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.entries.push({ test, result });        // remember each finished test
  }

  onEnd(result: FullResult) {                   // at the very end, summarise
    const count = (s: TestResult["status"]) =>
      this.entries.filter((e) => e.result.status === s).length;
    // "flaky" = passed, but only after a retry
    const flaky = this.entries.filter(
      (e) => e.result.status === "passed" && e.result.retry > 0,
    ).length;

    console.log(`\n  ${result.status} — ✓ ${count("passed")}  ✘ ${count("failed")}  ⤿ flaky ${flaky}`);
    // …plus slowest tests and a per-project breakdown
  }
}
```

Register it alongside the built-ins (the string is just the path to the file):

```ts
// playwright.config.ts
reporter: [
  ["list"],
  ["html", { open: "never" }],
  ["junit", { outputFile: "test-results/junit.xml" }],
  ["./reporters/summary-reporter.ts"],
],
```

Now every run ends with a glanceable summary:

```
── Run summary ───────────────────────────────
  result:   passed
  tests:    100  (✓ 100  ✘ 0  ⤿ flaky 0  – skipped 0)
  projects: setup 1  api 66  ui 33
  slowest:
    741ms  home page has no serious accessibility violations
    ...
```

The **flaky** number is the one to watch over time — a test that passes only on a retry
is a bug waiting to turn the pipeline red (Chapter 19).

## Put results where people look

A report nobody opens isn't reporting. Two cheap, high-value channels:

- **The CI run page.** GitHub Actions exposes a special file via the
  `GITHUB_STEP_SUMMARY` environment variable — append Markdown to it and it renders
  right on the run's summary page. Our reporter writes a pass/fail table there when that
  variable is present, so results show up without downloading anything.
- **PR annotations.** The built-in `github` reporter marks failing lines directly in the
  pull-request diff. Add it to the `reporter` array on CI.

For **history and trends** — flaky rate over time, durations, ownership — reach for a
dedicated tool: **Allure** (`allure-playwright`) or shipping the `json`/`blob` output to
a dashboard. Use those when "how is the suite trending?" becomes a recurring question;
the custom reporter covers the single-run story.

## The principle

Reporting is a **transformation of raw results into a decision**: collect → summarise →
deliver to where your audience already looks. Playwright gives you the events; a few
lines of reporter turn them into the one line your team actually reads.

## Next up

Everything's in place — and visible. **Chapter 26 — Capstone:** one comprehensive
end-to-end regression that exercises the whole product (sign up → author → comment →
favorite → follow) and ties every technique from the course together. Tag: `ch-26`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me what your end-of-run summary would highlight.
