# window-ai — WebMCP Recipe Workbench

## What This Is

`window-ai` is a public showcase site (windowai.danduh.me) demonstrating Chrome's experimental built-in AI APIs (`window.ai` / `LanguageModel`, `Summarizer`, `Translator`/`LanguageDetector`, `Writer`/`Rewriter`) plus a Model Context Protocol (MCP) reference implementation. This milestone adds a new in-browser **WebMCP** demo — a Recipe Workbench page where the page registers tools via `navigator.modelContext` and an in-page chat agent (powered by Chrome's `LanguageModel`) calls them, alongside an external Chrome 146 Canary agent.

## Core Value

A visitor with **Chrome 146 Canary** (WebMCP flag enabled) can, in under 2 minutes: open `/webmcp`, see a preloaded recipe, type *"scale to 6 and swap milk for oat milk"* into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector extension.

## Requirements

### Validated

<!-- Inferred from the existing codebase (see .planning/codebase/) -->

- ✓ Nx 21.5.x monorepo with workspaces: `chat/` (React 19 SPA), `chrome-llm-ts/` (publishable types library), `mcp/` (MCP server), `mcp-client/` (MCP client), `devops/awsweb/` (AWS CDK) — existing
- ✓ Chrome built-in AI demos at `/chat`, `/tool-calling`, `/summary`, `/translate`, `/writer` routes in `chat/src/app/AppRouter.tsx` — existing
- ✓ Page-level demo pattern: page component + service wrapper in `chat/src/app/services/` + types from `chrome-llm-ts` + markdown docs rendered via `chat/src/app/tools/DocsRenderer.tsx` — existing
- ✓ Theme (dark mode), SEO, Google Analytics, Tailwind v4, react-router-dom infrastructure — existing
- ✓ Reference MCP server (`mcp/`) over stdio with payment-demo tools — existing (orthogonal to this milestone)

### Active

<!-- Hypotheses until shipped and validated -->

- [ ] **WEBMCP-01**: A new `/webmcp` route is registered in `chat/src/app/AppRouter.tsx` and reachable from main nav (matching `/writer` and `/summary` placement)
- [ ] **WEBMCP-02**: The page registers WebMCP tools via the native `navigator.modelContext` API on mount and unregisters on unmount
- [ ] **WEBMCP-03**: A "Recipe Workbench" UI shows an active recipe (ingredients, steps, servings) using the existing site's Tailwind theme and dark-mode pattern
- [ ] **WEBMCP-04**: The page seeds 1–2 sample recipes on first load (e.g. pancakes + tomato pasta) persisted to IndexedDB; recipes survive reloads
- [ ] **WEBMCP-05**: Registered tools cover the core 2-min demo flow at minimum: `scaleRecipe(servings)`, `swapIngredient(from, to)`, `addIngredient`, `removeIngredient`, `listRecipes`, `selectRecipe(id)`, `generateShoppingList`
- [ ] **WEBMCP-06**: An in-page chat panel uses `LanguageModel` (window.ai) tool-calling to invoke the same registered WebMCP tools — same tool definitions, two consumers
- [ ] **WEBMCP-07**: When Chrome lacks `navigator.modelContext` (flag off / older browser), a clear banner explains how to enable it (Chrome 146+ Canary, `chrome://flags/#WebMCP for testing`); no polyfill
- [ ] **WEBMCP-08**: A dedicated `/webmcp/docs` route renders a markdown explainer via `DocsRenderer` covering: what WebMCP is, the API surface (`registerTool`, `provideContext`, schema), the security/permission model, browser support, and code samples — matching the structure of existing `/writer` and `/summary` doc tabs
- [ ] **WEBMCP-09**: Tools verified discoverable + invokable by an external agent (WebMCP Tool Inspector extension on Chrome 146 Canary)
- [ ] **WEBMCP-10**: SEO/title/description updated for `/webmcp` and `/webmcp/docs` matching existing SEOProvider conventions

### Out of Scope

- **`@mcp-b/global` polyfill** — User chose native-only; demo is meant to showcase the real Chrome API. Browsers without the flag get a banner.
- **External MCP server integration** — This is purely WebMCP (browser-mediated, client-side). The existing `mcp/` workspace is unrelated and untouched in this milestone.
- **Live deployment** — User chose local-only first; deciding deployment later. `nx run awsweb:deploy-windowai` not part of this milestone.
- **Production-polish error states / a11y audit / analytics events** — Definition of done is "2-min demo-able", not reference-quality. Advanced polish deferred.
- **Large recipe library / recipe creation UX from blank** — 1–2 seeded recipes only. No "browse 10 recipes" UI; no rich recipe editor.
- **Server-side persistence / sync** — IndexedDB only. No backend.
- **Authentication / multi-user** — Single-user local demo.
- **Streaming UI for tool responses** — Tool calls return synchronously; the conversational LanguageModel response can stream, but tool handlers don't.

## Context

**Repository state:** Currently on branch `feature/mcp-preview`. The branch already contains in-flight chat API documentation work (`chat/CHAT_API.md`) and chat routing tweaks. WebMCP work continues on this branch (or a sub-branch off it — TBD in planning).

**Existing patterns to mirror (per `.planning/codebase/CONVENTIONS.md` and `STRUCTURE.md`):**
- Each demo lives at `chat/src/app/<demo>/` with a `<Demo>Page.tsx`, a `services/<Demo>Service.ts`, and a markdown doc imported via the Vite/Webpack `markdown-loader` plugin
- Routes registered in `chat/src/app/AppRouter.tsx` and exposed in the main nav
- Types for browser AI surfaces come from `chrome-llm-ts` (path alias) plus `chat/src/app/types/dom-chromium-ai.d.ts`
- Streaming AI responses use `ReadableStream<string>` rendered incrementally
- Theme via `ThemeProvider` (`chat/src/app/context/ThemeContext.tsx`); SEO via `SEOProvider`

**WebMCP background (April 2026):**
- W3C Draft Community Group Report (Feb 10, 2026); shipping in **Chrome 146 Canary** behind `chrome://flags/#WebMCP for testing` and **Edge 147**
- Spec: https://webmachinelearning.github.io/webmcp/ ; repo: https://github.com/webmachinelearning/webmcp
- Core API: `navigator.modelContext.registerTool({ name, description, inputSchema, handler })`, also `provideContext(tools[])`, `unregisterTool(name)`
- Tools inherit user's existing browser session — no OAuth needed
- Test tooling: WebMCP Tool Inspector browser extension shows registered tools on the current page

**Browser type definitions:** `navigator.modelContext` is not yet in `lib.dom.d.ts`. The `chrome-llm-ts` library may need a new type declaration file (or addition to `dom-chromium-ai.d.ts`) to make it type-safe.

## Constraints

- **Tech stack**: Must reuse existing stack — React 19, Vite (chat workspace), Tailwind v4, react-router-dom, `chrome-llm-ts` types. No new build tooling. Style/structure must match `/writer` and `/summary` pages.
- **Browser**: Native `navigator.modelContext` only. Target Chrome 146+ Canary / Edge 147+. No polyfill.
- **Definition of done**: 2-minute demo-able by a Chrome 146 Canary visitor. Not reference-quality, not production-polished.
- **No deployment in this milestone**: stay local (`nx serve chat`). Live deployment is deferred.
- **No backend**: IndexedDB persistence only. No new services or HTTP endpoints.
- **Brownfield discipline**: Don't refactor existing demos. Don't touch `mcp/`, `mcp-client/`, or `devops/awsweb/` unless strictly necessary.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Recipe Workbench (vs. Reading List or Stamp DB) | Most demo-able, visually engaging, naturally aligns with WebMCP's "shopping" archetype, lets us showcase tool composability (scale + swap + shopping list) | — Pending |
| Native `navigator.modelContext` only, no polyfill | User wants to showcase the *real* Chrome API; polyfill would dilute the message. Banner guides users to enable the flag | — Pending |
| In-page LanguageModel chat AND external-agent compatibility | Demonstrates WebMCP's headline value: same tool definitions consumed by both an in-page agent and an external Chrome agent. Unique to this site (which is built around Chrome AI) | — Pending |
| IndexedDB persistence | Reinforces "tools see the user's session state" — recipes survive reloads, so an external agent visiting the page acts on the user's saved data | — Pending |
| Dedicated `/webmcp/docs` route via DocsRenderer | Matches existing demo style; explainer is part of the educational value. SEO bonus | — Pending |
| Local-only this milestone (no deploy) | User wants to validate locally first. Deployment is a low-risk follow-up once it works | — Pending |
| 1–2 preloaded sample recipes (vs. blank or library) | Optimizes for the 2-min demo flow — visitor doesn't need to build a recipe before they can ask the agent to manipulate one | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-26 after initialization*
