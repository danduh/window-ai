# State: window-ai — WebMCP Recipe Workbench

**Last updated:** 2026-04-26 (initialization)

## Project Reference

**Core Value:** A Chrome 146 Canary visitor can in under 2 minutes open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector.

**Current focus:** Foundation Skeleton — get the `/webmcp` route, recipe UI, IndexedDB persistence, type declarations, and missing-flag banner shipped as a thin tracer-bullet end-to-end slice.

## Current Position

**Phase:** 1 — Foundation Skeleton
**Plan:** Not yet planned (run `/gsd-plan-phase 1`)
**Status:** Not started
**Progress:** ▱▱▱▱▱▱▱▱▱▱ 0%

**Roadmap snapshot:**
- [ ] Phase 1: Foundation Skeleton
- [ ] Phase 2: WebMCP Tools + In-Page Agent
- [ ] Phase 3: Documentation + SEO

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 3 |
| Phases complete | 0 |
| v1 requirements | 19 |
| v1 requirements mapped | 19 (100%) |
| v1 requirements complete | 0 |
| Plans defined | 0 |
| Plans complete | 0 |

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

### Open Todos

None yet — Phase 1 not yet planned.

### Blockers

None.

### Risks Watched

| Risk | Mitigation |
|------|-----------|
| Chrome 146 Canary `navigator.modelContext` API may shift before milestone closes | Type declarations are isolated; banner already handles unavailability gracefully; spec is W3C Draft Feb 2026 — stable enough |
| `LanguageModel` tool-calling interplay with `navigator.modelContext` not previously exercised in this codebase | Phase 2 plan-check should validate API contracts before deep implementation; existing `/tool-calling` page is the closest reference |
| IndexedDB layer adds first persistence dependency to `chat/` | Keep persistence module small + typed; no new lib needed (native IndexedDB or thin wrapper only) |

## Session Continuity

**Resume command:** `/gsd-plan-phase 1`

**Last session note:** Project initialized 2026-04-26 by `/gsd-new-project`. PROJECT.md, REQUIREMENTS.md, codebase mapping (`ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `STACK.md`), ROADMAP.md, and this STATE.md are all in place. Ready for phase planning.

**Files of record:**
- `.planning/PROJECT.md` — milestone scope, core value, decisions
- `.planning/REQUIREMENTS.md` — 19 v1 requirements with phase traceability
- `.planning/ROADMAP.md` — 3-phase plan with success criteria
- `.planning/codebase/ARCHITECTURE.md` — Nx monorepo + chat SPA architecture
- `.planning/codebase/STRUCTURE.md` — directory layout and where to add code
- `.planning/codebase/CONVENTIONS.md` — code style and patterns to mirror
- `.planning/codebase/STACK.md` — React 19 / Vite / Tailwind / chrome-llm-ts stack reference

---
*State initialized: 2026-04-26*
