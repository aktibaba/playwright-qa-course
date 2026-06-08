import { defineConfig } from "vitepress";

// Our own Vite-powered copy of the course. Every chapter authored here is the
// single source of truth; `npm run blog:devto` converts and pushes the same
// content to dev.to as drafts.
export default defineConfig({
  title: "Playwright + TypeScript QA Course",
  description:
    "Build a production-grade Playwright + TypeScript automation framework — API and UI — against a real dockerized app.",
  lang: "en-US",

  // Internal planning docs live under docs/planning but are NOT part of the site.
  srcExclude: ["planning/**", "**/README.md"],
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Chapters", link: "/chapters/" },
    ],

    sidebar: {
      "/chapters/": [
        {
          text: "Part 0 — Foundations",
          items: [
            { text: "1. Why a framework", link: "/chapters/01-why-a-framework" },
            { text: "2. Setup & first tests", link: "/chapters/02-setup-and-first-tests" },
          ],
        },
        {
          text: "Part 1 — UI Core",
          items: [
            { text: "3. Locators & assertions", link: "/chapters/03-locators-and-assertions" },
            { text: "4. Page Object Model", link: "/chapters/04-page-object-model" },
            { text: "5. Forms & dialogs", link: "/chapters/05-forms-and-dialogs" },
            { text: "6. Debugging & DX", link: "/chapters/06-debugging" },
          ],
        },
        {
          text: "Part 2 — Fixtures & Architecture",
          items: [
            { text: "7. Custom fixtures", link: "/chapters/07-custom-fixtures" },
            { text: "8. POM-as-fixture", link: "/chapters/08-pom-as-fixture" },
            { text: "9. Composition & imports", link: "/chapters/09-composition-and-imports" },
            { text: "10. Scopes & layer rules", link: "/chapters/10-scopes-and-layers" },
          ],
        },
        {
          text: "Part 3 — API Testing",
          items: [
            { text: "11. APIRequestContext", link: "/chapters/11-apirequestcontext" },
            { text: "12. API auth & sessions", link: "/chapters/12-api-auth" },
            { text: "13. CRUD API suites", link: "/chapters/13-crud-suites" },
            { text: "14. Scenario helpers", link: "/chapters/14-scenario-helpers" },
          ],
        },
        {
          text: "Part 4 — Integrating API + UI",
          items: [
            { text: "15. Auth with storageState", link: "/chapters/15-storage-state-auth" },
            { text: "16. Seed via API, verify in UI", link: "/chapters/16-seed-via-api" },
            { text: "17. Test data & env config", link: "/chapters/17-test-data-and-env" },
          ],
        },
        {
          text: "Part 5 — Scaling, Config & CI",
          items: [
            { text: "18. Multi-env configuration", link: "/chapters/18-multi-env-config" },
            { text: "19. Parallelism & flake", link: "/chapters/19-parallelism-and-flake" },
            { text: "20. Reporters & observability", link: "/chapters/20-reporters-and-observability" },
            { text: "21. CI/CD & sharding", link: "/chapters/21-ci-github-actions" },
          ],
        },
        {
          text: "Part 6 — Advanced & Capstone",
          items: [
            { text: "22. Mocking, visual & a11y", link: "/chapters/22-advanced-techniques" },
            { text: "23. Stability at scale", link: "/chapters/23-stability-at-scale" },
            { text: "24. Maturation & docs", link: "/chapters/24-maturation-and-docs" },
          ],
        },
        {
          text: "Reference",
          items: [{ text: "Framework reference", link: "/reference/framework" }],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com" },
    ],

    search: { provider: "local" },
  },
});
