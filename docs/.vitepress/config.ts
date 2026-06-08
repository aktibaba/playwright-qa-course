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
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com" },
    ],

    search: { provider: "local" },
  },
});
