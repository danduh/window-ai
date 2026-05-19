---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Generative UI on WebMCP
status: completed
last_updated: "2026-05-19T08:48:16.519Z"
last_activity: 2026-05-19 -- Phase 06 marked complete
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 14
  completed_plans: 14
  percent: 86
---

# State: window-ai — Generative UI on WebMCP (v1.1)

**Last updated:** 2026-05-18 — v1.1 roadmap created (4 phases, 15 GENUI requirements mapped 100%)

## Project Reference

**Core Value (v1.1):** A Chrome 146 Canary visitor opens `/generative-ui`, asks the in-page chat for a recipe, sees an interactive recipe-card carousel render *inside the chat bubble* (sandboxed iframe + JSON-RPC postMessage bridge), clicks "Pick", and watches the page's meal-plan column update live — all in under 90 seconds, zero outbound network requests.

**Core Value (v1.0 — shipped):** A Chrome 146 Canary visitor can in under 2 minutes open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector.

**Current focus:** Phase 06 — in-page-chat-tool-wiring

## Current Position

Phase: 06 — COMPLETE
Plan: 2 of 2
Status: Phase 06 complete
Last activity: 2026-05-19 -- Phase 06 marked complete

Progress: [██████████] 100%

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1.0 phases planned | 3 |
| v1.0 phases complete | 3 |
| v1.0 requirements | 19 |
| v1.0 requirements mapped | 19 (100%) |
| v1.0 requirements complete | 19 (code; some runtime UAT pending) |
| v1.1 phases planned | 4 |
| v1.1 phases complete | 0 |
| v1.1 requirements (GENUI) | 15 |
| v1.1 requirements mapped | 15 (100%) |
| v1.1 requirements complete | 0 |
| Plan 01-01 duration | 221s (persistence + WebMCP types) |
| Plan 01-02 duration | 720s (UI shell + sub-components) |
| Plan 01-03 duration | 360s (routing + nav + SEO + prerender) |
| Phase 02 P02-03 | 270s | 3 tasks | 2 files |
| Phase 03-documentation-seo P03-02 | 203s | 2 tasks | 3 files |

## Accumulated Context

### Decisions Logged

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-26 | Native `navigator.modelContext` only, no polyfill | User wants to showcase the real Chrome API; polyfill would dilute the message. Browsers without the flag get a banner |
| 2026-04-26 | Recipe Workbench (vs. Reading List or Stamp DB) | Most demo-able, visually engaging, naturally aligns with WebMCP's "shopping" archetype, lets us showcase tool composability (scale + swap + shopping list) |
| 2026-04-26 | In-page LanguageModel chat AND external-agent compatibility | Demonstrates WebMCP's headline value: same tool definitions consumed by both an in-page agent and an external Chrome agent |
| 2026-04-26 | IndexedDB persistence | Reinforces "tools see the user's session state" — recipes survive reloads, so an external agent visiting the page acts on the user's saved data |
| 2026-04-26 | Dedicated `/webmcp/docs` route via DocsRenderer | Matches existing demo style; explainer is part of the educational value. SEO bonus |
| 2026-04-26 | Local-only this milestone (no deploy) | User wants to validate locally first. Deployment is a low-risk follow-up once it works |
| 2026-04-26 | 1–2 preloaded sample recipes (vs. blank or library) | Optimizes for the 2-min demo flow — visitor doesn't need to build a recipe before they can ask the agent to manipulate one |
| 2026-04-26 | 3-phase coarse roadmap with tracer-bullet Phase 1 | Granularity is coarse and DoD is "2-min demo-able" — minimize phase boundaries; ship a usable skeleton in Phase 1, layer agent/tools in Phase 2, polish docs in Phase 3 |
| 2026-05-18 | v1.1 4-phase shape, tracer-bullet Phase 4 + bridge-in-isolation Phase 5 | Bridge + iframe is the largest unknown (~200 LOC novel postMessage protocol); decoupling it from chat lets us harden the protocol before LanguageModel JSON-dispatch is layered on top |
| 2026-05-18 | v1.1 route `/generative-ui` (not `/mcp-apps`) | Talk-friendly URL — codebase-integration-map's "marketing alias" is the speaker's choice; `seoConfigs.generativeUI` key stays available, no collision with shipped `seoConfigs.webmcp` |
| 2026-05-18 | v1.1 native local bridge (~200 LOC), no `@mcp-b/transports` | Carries v1.0 native-only constraint; research found `@mcp-b/transports` could work but local bridge is the safest path for one-iframe-at-a-time scope |
| 2026-05-18 | v1.1 in-page chat reuses `responseFormat` JSON-dispatch (not native `tools` API) | Chrome 147 native `LanguageModel.create({tools})` remains broken per shipped `AgentDrawer.tsx` workaround; pattern is proven from v1.0 Phase 2 |

### Open Todos

- Plan Phase 4: v1.1 Foundation — Page shell, store, seed
- Consider `/gsd-discuss-phase 4` before planning to surface 12-recipe seed schema decisions and `MealPlanStore` shape

### Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-fam | Rework /webmcp Recipe Workbench layout: ingredients under recipes on left, chat panel pulled up to dominant area | 2026-04-28 | 38e7b73 | [260428-fam-rework-webmcp-recipe-workbench-layout-in](./quick/260428-fam-rework-webmcp-recipe-workbench-layout-in/) |
| 260518-lig | Add `/live-translate` demo: Web Speech API transcribes speaker live, each result fans out to two user-selectable target languages via the existing TranslateService (mode toggle: per-sentence vs rolling-interim) | 2026-05-18 | 6a5a0e2 | [260518-lig-live-voice-transcription-dual-translator](./quick/260518-lig-live-voice-transcription-dual-translator/) |

### Risks Watched

| Risk | Mitigation |
|------|-----------|
| Chrome 146 Canary `navigator.modelContext` API may shift before milestone closes | Type declarations are isolated; banner already handles unavailability gracefully; spec is W3C Draft Feb 2026 — stable enough |
| `LanguageModel` tool-calling interplay with `navigator.modelContext` not previously exercised in this codebase | v1.0 Phase 2 proved `responseFormat` JSON-dispatch pattern; reuse same pattern in v1.1 Phase 6 |
| Iframe `load` race in Chrome 146 Canary (`srcdoc` + immediate `postMessage` silently no-ops ~30% of the time) | Phase 5 bridge MUST queue messages until iframe fires `load`; called out explicitly in codebase-integration-map.md #12.3 |
| `_meta.ui.resourceUri` leaking into model context (model "talks about" the URI instead of staying conversational) | Phase 6 chat must intercept `_meta.ui.resourceUri` BEFORE stringifying tool result for the model; substitute with summary text |
| IDB `seedIfEmpty` won't add new recipes for existing v1.0 users (early-returns if any recipes exist) | Phase 4 uses `seedIfMissing()` (upsert by ID) instead of `seedIfEmpty`; verify v1.0 pancakes + pasta are preserved |
| Duplicate-tool-name across `/webmcp` ↔ `/generative-ui` route transitions on Canary | Tool names are disjoint (`searchRecipes`/`commitRecipeToPlan` vs `scaleRecipe`/`swapIngredient`); reuse `previousRegistrationController` module-scope guard pattern from `RecipeWorkbenchPage.tsx:98` |
| Prerender drift between `useSEOData.ts` and `prerender-react.js` (caused a Phase 3 hotfix) | Phase 7 explicitly requires byte-identical entries cross-checked via `grep -F` |

## Session Continuity

**Resume command:** `/gsd-plan-phase 4`

**Last session note:** 2026-05-18 — v1.1 roadmap created. 4 phases (4, 5, 6, 7) continuing v1.0 numbering. 15 GENUI requirements mapped 100%. Tracer-bullet Phase 4 (page shell + store + seed) is the first to plan. Consider `/gsd-discuss-phase 4` first to surface decisions about additive seed strategy (`seedIfMissing` vs `DB_VERSION` bump) and `MealPlanStore` schema before plan-phase.

**Files of record:**

- `.planning/PROJECT.md` — v1.1 milestone scope, core value, decisions
- `.planning/REQUIREMENTS.md` — 19 v1.0 + 15 v1.1 GENUI requirements with phase traceability
- `.planning/ROADMAP.md` — v1.0 (3 phases) + v1.1 (4 phases) with success criteria
- `.planning/HANDOFF_WEBMCP_GENERATIVE_UI.md` — speaker handoff doc (the v1.1 source brief)
- `.planning/research/mcp-apps-spec.md` — SEP-1865 wire format, postMessage protocol, sandbox recipe
- `.planning/research/mcp-ui-webmcp-tictactoe-analysis.md` — upstream reference pattern + code excerpts
- `.planning/research/webmcp-rich-content-status.md` — Chrome 146 status; in-page LanguageModel confirmed (Option B)
- `.planning/research/codebase-integration-map.md` — hazards, reusable assets, file-layout proposal
- `.planning/codebase/ARCHITECTURE.md` — Nx monorepo + chat SPA architecture
- `.planning/codebase/STRUCTURE.md` — directory layout and where to add code
- `.planning/codebase/CONVENTIONS.md` — code style and patterns to mirror
- `.planning/codebase/STACK.md` — React 19 / Vite / Tailwind / chrome-llm-ts stack reference

---
*State initialized: 2026-04-26 (v1.0)*
*v1.1 starting state recorded: 2026-05-18*

**Planned Phase:** 4 (v1.1 Foundation — page shell, store, seed) — TBD plans — 2026-05-18T20:00:00.000Z
