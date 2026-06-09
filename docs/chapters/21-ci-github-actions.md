---
title: "CI/CD with GitHub Actions & Sharding (Playwright + TypeScript, Ch.21)"
description: "Run the suite automatically on every push, explained from scratch: what CI and GitHub Actions are, stand up the dockerized app in a workflow, shard tests across machines, merge the reports — and the real app bugs the load surfaced."
tags: [playwright, typescript, testing, webdev]
series: "Playwright + TypeScript QA Course"
devto: true
published: false
---

# CI/CD with GitHub Actions & Sharding

A suite that only runs on your laptop protects only your laptop. We want it to run
**automatically, on every change, for everyone** — that's the job of CI.

> **CI/CD** = Continuous Integration / Continuous Delivery. The CI part: a service runs
> your tests every time code is pushed, so problems are caught immediately.
> **GitHub Actions** is GitHub's built-in CI. You describe what to do in a **workflow**
> — a YAML file in `.github/workflows/`. A workflow has **jobs**, each running on a
> fresh virtual machine called a **runner**, and each job is a list of **steps**.
> (YAML is just an indentation-based config format.)

> Code for this chapter is tagged `ch-21` in the repo:
> **https://github.com/aktibaba/playwright-qa-course** — see
> `.github/workflows/ci.yml` and the new `comments` / `favorites` / `follow` specs.

## Stand up the app, then test it

The exact command we use locally brings Inkwell up on the CI runner — healthchecks and
all:

```yaml
- name: Start Inkwell (system under test)
  run: docker compose -f sut/docker-compose.yml up -d --build --wait
- run: npm ci                                  # install deps from the lockfile
- run: npx playwright install --with-deps chromium   # download the browser
```

`--wait` matters: the step blocks until every service is healthy, so the tests never
start before the app is ready.

## Shard across machines

**Sharding** splits the test list into N groups that run on N machines *at the same
time*, so the total wall-clock time drops roughly N×. We use a **matrix** (a way to run
the same job several times with different values) and the **blob** reporter (made to be
merged later):

```yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1, 2]                              # run this job twice: shard 1 and shard 2
steps:
  # ...
  - name: Run tests (sharded)
    run: npx playwright test --shard=${{ matrix.shard }}/2 --reporter=blob
  - uses: actions/upload-artifact@v4           # save this shard's results
    if: ${{ !cancelled() }}
    with:
      name: blob-report-${{ matrix.shard }}
      path: blob-report/
```

Each shard is its **own job** on its **own** runner with its **own** dockerized app —
complete isolation, no two shards sharing a database.

> One nuance: **project dependencies run in every shard that needs them.** Our `ui`
> project depends on `setup` (the saved auth session), so `setup` runs once per shard —
> a good reason to keep dependency projects small.

## Merge the shards into one report

A second job downloads every shard's blob report and merges them into a single HTML
report you can browse:

```yaml
report:
  if: ${{ !cancelled() }}
  needs: [test]                                # wait for all the shard jobs
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

Download that artifact from the run and you get one unified report — with traces on any
failure — exactly as if it had all run on one machine.

## More coverage — and real bugs in the app

This chapter also adds **comments**, **favorites**, and **follows** test suites, each
using fresh per-test data so counts are deterministic.

Cranking up the parallelism did what good tests do: it **found real bugs in the
application.** Under heavy concurrent load, requests started failing — and a trace plus
the server logs pinned down four genuine defects in Inkwell:

1. **A null-author race.** `createArticle` set the author with an *un-awaited*
   `setAuthor()`, leaving a brief moment where the new article had no author. A
   concurrent `GET /articles` hitting that row crashed. Fix: set the author atomically
   when creating the row.
2. **Duplicate slugs.** `slug` wasn't unique and the code used a racy "check then
   create", so two concurrent same-title creates made two articles with the same slug —
   which then broke favoriting. Fix: a `unique` constraint on `slug` and an atomic
   create.
3. **A crash on a missing `tagList`**, and **4. broken `offset` pagination**
   (it multiplied `offset * limit`).

Rather than mask these with retries, **we fixed the app itself** (it's in `sut/`). And
that's the real lesson: *running your suite at scale is a load test, and load tests find
concurrency bugs.* With the app corrected, the suite is fully deterministic — UI and API
specs run concurrently with no special ordering needed.

## Next up — Part 6: Advanced & Capstone

The framework is real and runs in CI. **Chapter 22 — Advanced techniques:** network
mocking to test the UI in isolation, visual snapshots, and accessibility scans — new
kinds of checks on top of everything we've built. Tag: `ch-22`.

> Following along? Star the [repo](https://github.com/aktibaba/playwright-qa-course)
> and tell me how many shards your CI runs.
