#!/usr/bin/env node
/**
 * devto-sync — push course chapters to dev.to as DRAFTS via the Forem API.
 *
 *   npm run blog:devto                 # sync every chapter under docs/chapters
 *   npm run blog:devto -- 01-why-a-framework   # sync one (by filename or path)
 *
 * Idempotent: the first push creates a dev.to article and records its id in
 * scripts/.devto-map.json; later pushes UPDATE that same article instead of
 * creating duplicates. Articles are always sent unpublished — you review and
 * hit "Publish" on dev.to.
 *
 * Reads DEV_API_KEY (required) and SITE_BASE_URL (optional, for canonical_url)
 * from the environment. `npm run blog:devto` loads them from .env via
 * `node --env-file=.env`.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHAPTERS_DIR = join(ROOT, "docs", "chapters");
const MAP_PATH = join(__dirname, ".devto-map.json");
const API = "https://dev.to/api/articles";

const API_KEY = process.env.DEV_API_KEY;
const SITE_BASE_URL = (process.env.SITE_BASE_URL || "").replace(/\/+$/, "");
const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");

if (!DRY_RUN && (!API_KEY || API_KEY === "your_devto_api_key_here")) {
  console.error(
    "✗ DEV_API_KEY is not set. Copy .env.example to .env and add your dev.to API key\n" +
      "  (https://dev.to/settings/extensions → 'DEV Community API Keys').",
  );
  process.exit(1);
}

// --- chapter selection ------------------------------------------------------
function resolveTargets(argv) {
  const args = argv.slice(2).filter((a) => !a.startsWith("--"));
  if (args.length === 0) {
    return readdirSync(CHAPTERS_DIR)
      .filter((f) => f.endsWith(".md") && f !== "index.md")
      .sort()
      .map((f) => join(CHAPTERS_DIR, f));
  }
  return args.map((a) => {
    if (existsSync(a)) return resolve(a);
    const withExt = a.endsWith(".md") ? a : `${a}.md`;
    const candidate = join(CHAPTERS_DIR, withExt);
    if (!existsSync(candidate)) {
      console.error(`✗ chapter not found: ${a}`);
      process.exit(1);
    }
    return candidate;
  });
}

// --- markdown → dev.to body -------------------------------------------------
function toDevtoBody(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let strippedH1 = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Drop a single leading H1 — dev.to renders the `title` field as the heading.
    if (!strippedH1 && /^#\s+/.test(line)) {
      strippedH1 = true;
      // also skip a following blank line
      if (lines[i + 1] === "") i++;
      continue;
    }

    // Clean Vite/Shiki fence info: ```ts{1,3} :line-numbers  ->  ```ts
    const fence = line.match(/^(\s*```)([A-Za-z0-9]+)?[^\n]*$/);
    if (fence) {
      out.push(`${fence[1]}${fence[2] || ""}`);
      continue;
    }

    // VitePress containers → blockquotes (dev.to has no container syntax).
    const open = line.match(/^:::\s*(tip|warning|info|danger|details)\s*(.*)$/i);
    if (open) {
      const labels = { tip: "TIP", warning: "WARNING", info: "NOTE", danger: "CAUTION", details: "DETAILS" };
      const label = labels[open[1].toLowerCase()] || "NOTE";
      const title = open[2].trim();
      out.push(`> **${title || label}**`, ">");
      // quote until the closing :::
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        out.push(lines[i].length ? `> ${lines[i]}` : ">");
        i++;
      }
      continue;
    }

    out.push(line);
  }

  return out.join("\n").trim() + "\n";
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 4); // dev.to allows at most 4 tags
}

// --- id map -----------------------------------------------------------------
function loadMap() {
  if (!existsSync(MAP_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MAP_PATH, "utf8"));
  } catch {
    return {};
  }
}
function saveMap(map) {
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
}

// --- dev.to API -------------------------------------------------------------
async function pushArticle(article, existingId) {
  const url = existingId ? `${API}/${existingId}` : API;
  const method = existingId ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: {
      "api-key": API_KEY,
      "content-type": "application/json",
      accept: "application/vnd.forem.api-v1+json",
    },
    body: JSON.stringify({ article }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.raw || res.statusText;
    throw new Error(`${res.status} ${res.statusText} — ${msg}`);
  }
  return data;
}

// --- main -------------------------------------------------------------------
const targets = resolveTargets(process.argv);
const map = loadMap();
let created = 0;
let updated = 0;
let skipped = 0;

for (const file of targets) {
  const key = basename(file, ".md");
  const { data: fm, content } = matter(readFileSync(file, "utf8"));

  if (fm.devto === false) {
    console.log(`• skip   ${key} (devto: false)`);
    skipped++;
    continue;
  }
  if (!fm.title) {
    console.warn(`• skip   ${key} (no \`title\` in frontmatter)`);
    skipped++;
    continue;
  }

  const article = {
    title: fm.title,
    body_markdown: toDevtoBody(content),
    published: fm.published === true, // default: draft
    tags: sanitizeTags(fm.tags),
  };
  if (fm.series) article.series = fm.series;
  if (fm.description) article.description = fm.description;
  const canonical = fm.canonical_url || (SITE_BASE_URL ? `${SITE_BASE_URL}/chapters/${key}` : null);
  if (canonical) article.canonical_url = canonical;

  const existingId = map[key]?.id;

  if (DRY_RUN) {
    console.log(`\n— dry run: ${key} ${existingId ? `(would update #${existingId})` : "(would create)"} —`);
    console.log(`  title:   ${article.title}`);
    console.log(`  tags:    ${article.tags.join(", ") || "(none)"}`);
    console.log(`  series:  ${article.series || "(none)"}`);
    console.log(`  canon:   ${article.canonical_url || "(none)"}`);
    console.log(`  draft:   ${!article.published}`);
    console.log("  --- body_markdown (first 24 lines) ---");
    console.log(
      article.body_markdown
        .split("\n")
        .slice(0, 24)
        .map((l) => `  | ${l}`)
        .join("\n"),
    );
    skipped++;
    continue;
  }

  try {
    const result = await pushArticle(article, existingId);
    map[key] = { id: result.id, slug: result.slug };
    saveMap(map);
    const editUrl = `https://dev.to/${result.url ? new URL(result.url).pathname.slice(1) : ""}`;
    const state = article.published ? "published" : "draft";
    if (existingId) {
      console.log(`✓ update ${key} → dev.to #${result.id} (${state})`);
      updated++;
    } else {
      console.log(`✓ create ${key} → dev.to #${result.id} (${state})`);
      created++;
    }
    console.log(`         edit: https://dev.to/dashboard  •  ${result.url || editUrl}`);
  } catch (err) {
    console.error(`✗ fail   ${key}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`\nDone — ${created} created, ${updated} updated, ${skipped} skipped.`);
console.log("Publish state follows each chapter's `published` frontmatter (default: draft).");
