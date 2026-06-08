---
title: "CI/CD with GitHub Actions & Sharding (Playwright + TypeScript, Ch.21)"
description: "Run the suite on every push: stand up the dockerized SUT in a workflow, shard tests across machines, merge the blob reports into one HTML report, and publish it as an artifact."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# CI/CD with GitHub Actions & Sharding

A suite that only runs on your laptop protects only your laptop. This chapter wires
the whole thing into **GitHub Actions**: spin up the dockerized SUT, run the tests
**sharded** across parallel machines, and merge the results into one report. We also
broaden coverage — comments, favorites, follows — to give the shards something to
chew on.

> Code for this chapter is tagged `ch-21` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `.github/workflows/ci.yml` and the new `comments` / `favorites` / `follow` specs.

## Stand up the SUT, then test it

The same one command we use locally brings Inkwell up in CI — healthchecks and all:

```yaml
- name: Start Inkwell (system under test)
  run: docker compose -f sut/docker-compose.yml up -d --build --wait
- run: npm ci
- run: npx playwright install --with-deps chromium
```

`--wait` is doing real work here: the job blocks until every service is healthy, so
tests never race startup.

## Shard across machines

Sharding splits the test list into N groups that run on N parallel runners — wall
time drops roughly linearly. Use a matrix and the **blob** reporter (built to be
merged):

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1, 2]
steps:
  # ...
  - name: Run tests (sharded)
    run: npx playwright test --shard=${{ matrix.shard }}/2 --reporter=blob
  - uses: actions/upload-artifact@v4
    if: ${{ !cancelled() }}
    with:
      name: blob-report-${{ matrix.shard }}
      path: blob-report/
```

Each shard is its **own job** with its **own** dockerized SUT — complete isolation,
no cross-shard database contention.

> One nuance worth knowing: **project dependencies run in every shard that needs
> them.** Our `ui` project depends on `api` + `setup`, so those run once per shard.
> If your dependency project is huge, factor that into how you split — sometimes a
> dedicated setup project (not a full test project) is the better dependency.

## Merge the shards into one report

A second job collects every shard's blob report and merges them into a single
browsable HTML report:

```yaml
report:
  if: ${{ !cancelled() }}
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm }
    - run: npm ci
    - uses: actions/download-artifact@v4
      with: { path: all-blob-reports, pattern: blob-report-*, merge-multiple: true }
    - run: npx playwright merge-reports --reporter=html ./all-blob-reports
    - uses: actions/upload-artifact@v4
      with: { name: playwright-html-report, path: playwright-report/ }
```

Download that artifact from the run and you get the unified report — with traces on
any failure (Chapter 6) — exactly as if it ran on one machine.

## More coverage — and a load-related finding

This chapter also adds **comments**, **favorites**, and **follows** suites, each
using fresh per-test data (a brand-new article, or a newly-registered user for
follow) so counts are deterministic.

Wiring those in surfaced something real. With more parallel tests pounding the
**single** local SUT, `favoritesCount` and follower-count assertions started failing
intermittently — the demo app has a race computing those counts under heavy
concurrent writes. The fix wasn't in the tests: we keep the `ui → api` project
dependency so the two phases don't hammer the database at peak concurrency together.
In CI it's moot (each shard has its own SUT), but it's a good reminder that **your
test infrastructure's limits are part of the system too.**

## Next up — Part 6: Advanced & Capstone

The framework is real and runs in CI. **Chapter 22 — Advanced techniques:** network
mocking to test the UI in isolation, visual snapshots, and accessibility scans — new
kinds of assertions on top of everything we've built. Tag: `ch-22`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how many shards your CI runs.
