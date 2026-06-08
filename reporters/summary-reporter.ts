import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  FullConfig,
  Suite,
} from "@playwright/test/reporter";
import { appendFileSync } from "node:fs";

/**
 * A small custom reporter (Ch.25). Playwright lets you implement the Reporter
 * interface to turn raw results into whatever your team needs. This one prints a
 * concise end-of-run summary — totals by status, the slowest tests, and a
 * per-project breakdown — and, on CI, appends a Markdown summary to the GitHub
 * Actions step summary so results show up right on the run page.
 */
export default class SummaryReporter implements Reporter {
  private readonly entries: { test: TestCase; result: TestResult }[] = [];
  private projects: string[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.projects = suite.suites.map((s) => s.title).filter(Boolean);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.entries.push({ test, result });
  }

  onEnd(result: FullResult): void {
    const count = (status: TestResult["status"]) =>
      this.entries.filter((e) => e.result.status === status).length;

    const passed = count("passed");
    const failed = count("failed");
    const timedOut = count("timedOut");
    const skipped = count("skipped");
    // A test is "flaky" when it ended up passing but needed a retry.
    const flaky = this.entries.filter(
      (e) => e.result.status === "passed" && e.result.retry > 0,
    ).length;

    const slowest = [...this.entries]
      .sort((a, b) => b.result.duration - a.result.duration)
      .slice(0, 5);

    const byProject = (project: string) =>
      this.entries.filter((e) => e.test.parent.project()?.name === project).length;

    const lines: string[] = [];
    lines.push("", "── Run summary ───────────────────────────────");
    lines.push(`  result:   ${result.status}`);
    lines.push(
      `  tests:    ${this.entries.length}  ` +
        `(✓ ${passed}  ✘ ${failed + timedOut}  ⤿ flaky ${flaky}  – skipped ${skipped})`,
    );
    if (this.projects.length) {
      lines.push(
        `  projects: ${this.projects.map((p) => `${p} ${byProject(p)}`).join("  ")}`,
      );
    }
    lines.push("  slowest:");
    for (const e of slowest) {
      lines.push(`    ${Math.round(e.result.duration)}ms  ${e.test.title}`);
    }
    lines.push("──────────────────────────────────────────────", "");

    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));

    if (process.env.GITHUB_STEP_SUMMARY) {
      const md = [
        `### Playwright results — ${result.status}`,
        "",
        `- ✓ Passed: **${passed}**`,
        `- ✘ Failed: **${failed + timedOut}**`,
        `- ⤿ Flaky: **${flaky}**`,
        `- – Skipped: **${skipped}**`,
        "",
      ].join("\n");
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
    }
  }
}
