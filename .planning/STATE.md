---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Proofreader + Multimodal
status: roadmap_defined
last_updated: "2026-05-19T00:00:00Z"
last_activity: 2026-05-19 -- v1.2 roadmap defined (5 phases, 19 requirements)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
shipped_milestones:
  - version: v1.0
    name: WebMCP Recipe Workbench
    shipped: 2026-04-27
  - version: v1.1
    name: Generative UI on WebMCP
    shipped: 2026-05-19
---

# State: window-ai — v1.2 Proofreader + Multimodal

**Last updated:** 2026-05-19 — v1.2 roadmap defined. Ready for `/gsd-plan-phase 8`.

## Project Reference

**Core Value (v1.2):** A Chrome Canary visitor opens `/proofreader` to see Gemini Nano correct prose on-device with three selectable output styles (side-by-side diff / inline strikethrough / suggestion list), then switches to `/multimodal` to chat with the model about images via drag-drop, clipboard paste, single-frame webcam capture, or continuous live webcam — all on-device, zero outbound network requests.

**Core Value (v1.1 — shipped):** A Chrome 146 Canary visitor opens `/generative-ui`, asks the in-page chat for a recipe, sees an interactive recipe-card carousel render inside the chat bubble (sandboxed iframe + JSON-RPC postMessage bridge), clicks "Pick", and watches the page's meal-plan column update live — in under 90 seconds, zero outbound network requests.

**Core Value (v1.0 — shipped):** A Chrome 146 Canary visitor can in under 2 minutes open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector.

**Current focus:** Phase 8 — Proofreader Foundation (not yet planned)

## Current Position

Phase: 08 — NOT STARTED
Plan: 0 of ?
Status: Roadmap defined; awaiting plan-phase
Last activity: 2026-05-19 — v1.2 roadmap created (5 phases, 19/19 requirements mapped)

Progress: [..........] 0%

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1.0 phases planned | 3 |
| v1.0 phases complete | 3 |
| v1.0 requirements | 19 |
| v1.0 requirements mapped | 19 (100%) |
| v1.1 phases planned | 4 |
| v1.1 phases complete | 4 |
| v1.1 requirements (GENUI) | 15 |
| v1.1 requirements mapped | 15 (100%) |
| v1.2 phases planned | 5 |
| v1.2 phases complete | 0 |
| v1.2 requirements | 19 |
| v1.2 requirements mapped | 19 (100%) |

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
| 2026-05-19 | v1.2 Proofreader flag-gated only (Canary) | OT ended at Chrome 145; no confirmed stable in 148/149. Demo requires explicit flags — banner copy must include exact `chrome://flags/` URLs with copy-pasteable code elements |
| 2026-05-19 | v1.2 Multimodal ships stable on Chrome 148 (no flag needed) | `expectedInputs: [{type:'image'}]` confirmed stable in Chrome 148 per research findings; lighter demo friction than Proofreader |
| 2026-05-19 | v1.2 audio deferred to v1.3 | Audio input requires discrete GPU; integrated graphics returns NotAllowedError. Web Speech API is the reliable fallback path for v1.3 |
| 2026-05-19 | v1.2 5-phase coarse shape, parallel Proofreader (8-9) + Multimodal (10-11) tracks | Two independent feature tracks with no cross-dependency until Phase 12 Polish; allows parallel execution |
| 2026-05-19 | v1.2 Docs tab first (Phase 12 carries v1.1 lesson) | v1.1 Phase 7 discovered Docs tab must be default-selected; Phase 8 and 10 wire this from the start |

### Open Todos

- Plan Phase 8: Proofreader Foundation
- Consider `/gsd-discuss-phase 8` first to surface `ProofreaderService` type-declaration approach (extend `dom-chromium-ai.d.ts` vs new file) and `MissingFlagBanner` variant strategy (reuse component with props vs separate components)

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
| Proofreader OT ended at Chrome 145; no confirmed stable in 148/149 | Phase 8 banner must be prominent with exact flag URLs; demo is explicitly Canary-only; check `developer.chrome.com/origintrials/` before Phase 8 execution for any new OT registration |
| LoRA adapter download can stall at 0% | Phase 8 PROOF-06 must handle `downloading` state gracefully; include `chrome://on-device-internals` reference in the docs explainer |
| Webcam-live memory pressure on 8 GB VRAM | Phase 11 uses 512x512 downsample + session reuse + single-in-flight gating per research recommendations; empirical test during plan-phase |
| Prerender drift between `useSEOData.ts` and `prerender-react.js` | Phase 7 hotfix precedent — Phase 12 DOC-03 requires explicit `grep -F` cross-check as part of the success criteria |
| `Proofreader` global TypeScript declarations not in `lib.dom.d.ts` | Extend `chat/src/app/types/dom-chromium-ai.d.ts` (established pattern from `navigator.modelContext` types in v1.0) |

## Session Continuity

**Resume command:** `/gsd-plan-phase 8`

**Last session note:** 2026-05-19 — v1.2 roadmap defined. 5 phases (8-12) continuing v1.1 numbering. 19 requirements mapped 100%. Two parallel tracks: Proofreader (8-9) and Multimodal (10-11), converging at Phase 12. Consider `/gsd-discuss-phase 8` first to resolve `ProofreaderService` type-declaration strategy and `MissingFlagBanner` variant approach before planning.

**Files of record:**

- `.planning/PROJECT.md` — v1.2 milestone scope, core value, decisions
- `.planning/REQUIREMENTS.md` — 19 v1.2 requirements with phase traceability (PROOF-01..06, MULTI-01..08, DOC-01..03, POLISH-01..02)
- `.planning/ROADMAP.md` — v1.0 (3 phases) + v1.1 (4 phases) archived + v1.2 (5 phases, Phase 8-12) active
- `.planning/research/v1.2-multimodal-proofreader-api.md` — Proofreader API surface, image-input syntax, webcam-live perf pattern, open questions
- `.planning/codebase/ARCHITECTURE.md` — Nx monorepo + chat SPA architecture
- `.planning/codebase/STRUCTURE.md` — directory layout and where to add code
- `.planning/codebase/CONVENTIONS.md` — code style and patterns to mirror
- `.planning/codebase/STACK.md` — React 19 / Vite / Tailwind / chrome-llm-ts stack reference

---
*State initialized: 2026-04-26 (v1.0)*
*v1.1 starting state recorded: 2026-05-18*
*v1.2 starting state recorded: 2026-05-19*
