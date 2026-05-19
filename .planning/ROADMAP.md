# Roadmap: window-ai — WebMCP Recipe Workbench

**Defined:** 2026-04-26
**Granularity:** coarse (3 phases)
**Coverage:** 19/19 v1 requirements mapped

## Core Value

A visitor with Chrome 146 Canary (WebMCP flag enabled) can, in under 2 minutes: open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector extension.

## Phases

- [x] **Phase 1: Foundation Skeleton** - `/webmcp` route mounts, recipe UI renders from IndexedDB-seeded data, type definitions for `navigator.modelContext` exist, missing-flag banner appears in unsupported browsers
- [x] **Phase 2: WebMCP Tools + In-Page Agent** - All 8 tools registered via `navigator.modelContext`, in-page LanguageModel chat panel invokes them via tool-calling, external Tool Inspector verifies discoverability
- [ ] **Phase 3: Documentation + SEO** - `/webmcp/docs` markdown explainer route mirrors existing `/writer`/`/summary` doc style; SEO metadata applied to both routes

## Phase Details

### Phase 1: Foundation Skeleton
**Goal**: Visitor can open `/webmcp`, see a real recipe persisted in IndexedDB, switch between seeded recipes, and (in unsupported browsers) read a clear banner explaining how to enable the flag — all wired with type-safe `navigator.modelContext` declarations ready for Phase 2.
**Depends on**: Nothing (first phase)
**Requirements**: NAV-01, NAV-03, UI-01, UI-02, UI-03, DATA-01, DATA-02, DATA-03, MCP-01
**Success Criteria** (what must be TRUE):
  1. Navigating to `/webmcp` from the main nav loads a Recipe Workbench page styled with the existing site's Tailwind theme and dark-mode toggle, and the link sits alongside `/writer` and `/summary` in the nav
  2. On first load the page seeds 1–2 sample recipes (pancakes, tomato pasta) into IndexedDB; reloading the page restores the same recipe state with no re-seeding
  3. The page shows a recipe picker that lets the user switch the active recipe, and the rendered title, servings, ingredients (name + quantity + unit), and ordered steps update in real time to match the active recipe
  4. A typed persistence module exposes `getRecipes` / `getRecipe` / `saveRecipe` / `deleteRecipe` and is the only path that reads or writes recipe state from the page
  5. When `navigator.modelContext` is undefined, a clearly visible banner explains the Chrome 146+ Canary requirement and the `chrome://flags/#WebMCP for testing` toggle, while the rest of the page (recipe browsing) remains usable
  6. TypeScript declarations for `navigator.modelContext`, `ModelContext`, `registerTool`, `provideContext`, and tool descriptor shapes compile cleanly across `chat/` (no `any` casts at the API surface)
**Plans**: 3 plans
- [x] 01-01-PLAN.md — Persistence + WebMCP types (idb wrapper, recipe seeds, ambient navigator.modelContext)
- [x] 01-02-PLAN.md — RecipeWorkbenchPage + sub-components (header, picker, ingredients, steps, missing-flag banner)
- [x] 01-03-PLAN.md — Routing + nav links + SEO + prerender (mounts the page, ships nav entries, wires useSEOData)
**UI hint**: yes

### Phase 2: WebMCP Tools + In-Page Agent
**Goal**: Both an in-page `LanguageModel` chat agent and an external Chrome 146 Canary agent can drive the Recipe Workbench through the same registered WebMCP tools — and the canonical 2-minute demo flow works end-to-end.
**Depends on**: Phase 1
**Requirements**: MCP-02, MCP-03, MCP-04, MCP-05, AGENT-01, AGENT-02, AGENT-03
**Success Criteria** (what must be TRUE):
  1. On Recipe Workbench page mount, all 8 tools (`listRecipes`, `getRecipe`, `selectRecipe`, `scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`, `generateShoppingList`) register via `navigator.modelContext` with descriptions and JSON Schema input schemas; on unmount they unregister
  2. The WebMCP Tool Inspector extension (Chrome 146 Canary) lists all 8 tool names with correct descriptions and input schemas when the inspector is opened on `/webmcp`
  3. Tool handlers route through the Phase 1 persistence layer so a tool invocation (e.g. `scaleRecipe`) updates the rendered UI live and survives a page reload
  4. The in-page chat panel uses `LanguageModel` tool-calling to invoke the same registered tools (single tool-definition source of truth) and streams the assistant's text response using the existing `/chat` and `/tool-calling` UI patterns
  5. Typing "scale to 6 and swap milk for oat milk" (or equivalent) into the in-page chat causes the assistant to call `scaleRecipe` and `swapIngredient`, the recipe UI updates with new servings and the replaced ingredient, and the entire flow completes in well under 2 minutes
**Plans**: 3 plans
- [x] 02-01-PLAN.md — Data + tools layer (recipeStore, recipeToolHandlers, recipeTools, toolAdapter)
- [x] 02-02-PLAN.md — UI components (ToolRegistrationPill, LanguageModelUnavailable, ToolCallIndicator, ToolListPanel, AgentDrawer)
- [x] 02-03-PLAN.md — Page wiring + manual UAT (RecipeWorkbenchPage tool registration mount-effect, store subscription, drawer mount, Tool Inspector + 2-min demo UAT)

### Phase 3: Documentation + SEO
**Goal**: A visitor (and search engines) can discover, navigate to, and read a high-quality `/webmcp/docs` explainer that mirrors the structure of the existing `/writer` and `/summary` doc pages.
**Depends on**: Phase 1
**Requirements**: NAV-02, DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. Navigating to `/webmcp/docs` renders a markdown explainer through `DocsRenderer` covering: what WebMCP is, W3C spec status, the `navigator.modelContext.registerTool` API surface, security/permission model, browser support (Chrome 146+ / Edge 147+), and at least 2 code samples
  2. The `/webmcp/docs` page layout, navigation chrome, and tab structure match the existing `/writer` and `/summary` doc tabs (no bespoke layout)
  3. Both `/webmcp` and `/webmcp/docs` set page-specific titles and meta descriptions through the existing `SEOProvider` pattern, observable in the rendered `<head>`
**Plans**: 2 plans
- [x] 03-01-PLAN.md — Author WebMCP-API.md markdown explainer (4 DOCS-01 sections + 2 typed code samples from RECIPE_TOOLS)
- [x] 03-02-PLAN.md — Path-aware SEO + DocsRenderer mount + prerender drift fix (wires the Docs tab and swaps <head>)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Skeleton | 3/3 | Complete | 2026-04-27 |
| 2. WebMCP Tools + In-Page Agent | 3/3 | Complete | 2026-04-27 |
| 3. Documentation + SEO | 2/2 | Complete (code; runtime UAT pending) | 2026-04-28 |
| 4. v1.1 Foundation: /generative-ui shell + MealPlanStore + 12-recipe seed | 0/2 | Planned | — |
| 5. v1.1 MCP Apps Host: sandboxed iframe + postMessage bridge + carousel | 0/? | Not started | — |
| 6. v1.1 In-Page Chat + Tool Wiring: searchRecipes + commitRecipeToPlan + live meal plan | 0/2 | Planned | — |
| 7. v1.1 Docs + Demo Polish: explainer + SEO + 5-cold-run + zero-network verification | 0/? | Not started | — |

## Coverage Validation

**v1 Requirements:** 19 total, 19 mapped, 0 orphaned.

| Phase | Requirements Mapped | Count |
|-------|---------------------|-------|
| 1. Foundation Skeleton | NAV-01, NAV-03, UI-01, UI-02, UI-03, DATA-01, DATA-02, DATA-03, MCP-01 | 9 |
| 2. WebMCP Tools + In-Page Agent | MCP-02, MCP-03, MCP-04, MCP-05, AGENT-01, AGENT-02, AGENT-03 | 7 |
| 3. Documentation + SEO | NAV-02, DOCS-01, DOCS-02 | 3 |
| **Total** | | **19** |

## Notes

- **Tracer-bullet shape**: Phase 1 deliberately delivers a full vertical slice (route + page + persistence + types + banner) without WebMCP wiring, so the skeleton is demo-able as soon as it lands. Phase 2 layers the AI agent and tool registration on top.
- **Definition of done**: 2-minute demo on Chrome 146 Canary. Not reference-quality, not production-polished. Phase boundaries are calibrated to the shortest path to that demo.
- **Brownfield discipline**: All work confined to `chat/` (and possibly a single new file in `chrome-llm-ts/src/lib/` for shared types). `mcp/`, `mcp-client/`, `devops/awsweb/` are untouched.

---
*Roadmap defined: 2026-04-26*

---

## Milestone v1.1: Generative UI on WebMCP — ✅ Shipped 2026-05-19

`/generative-ui` MCP Apps demo with sandboxed iframe + JSON-RPC postMessage bridge + on-device LanguageModel chat. 4 phases (Phase 4-7), 8 plans, 15 GENUI requirements. See [milestones/v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) for the full archive.

---

## Milestone v1.2: Proofreader + Multimodal

**Defined:** 2026-05-19
**Granularity:** coarse (5 phases — continues v1.1 numbering at Phase 8)
**Coverage:** 19/19 requirements mapped

### Core Value (v1.2)

A Chrome Canary visitor opens `/proofreader` to see Gemini Nano correct prose on-device with three selectable output styles (side-by-side diff / inline strikethrough / suggestion list), then switches to `/multimodal` to chat with the model about images via drag-drop, clipboard paste, single-frame webcam capture, or continuous live webcam — all on-device, zero outbound network requests, same kicker as v1.1.

### Phases (v1.2)

- [ ] **Phase 8: Proofreader Foundation** - `/proofreader` route + `ProofreaderService` wrapper + text input UI + plain output mode + flag banner for required Chrome flags
- [ ] **Phase 9: Proofreader Output Modes** - Three selectable output styles (side-by-side diff / inline strikethrough / suggestion list) + language selector + download progress UX
- [ ] **Phase 10: Multimodal Foundation** - `/multimodal` route + `MultimodalService` wrapper + chat panel + drag-drop + clipboard paste + thumbnail rendering + flag banner
- [ ] **Phase 11: Webcam Capture** - Single-frame snap + continuous live mode with single-in-flight gating, 512x512 downsample, session reuse + camera permission UX + perf indicator
- [ ] **Phase 12: Docs + SEO + Demo Polish** - `/proofreader/docs` + `/multimodal/docs` markdown explainers + SEO byte-identical mirrors + 5-cold-run rehearsal log

### Phase Details (v1.2)

#### Phase 8: Proofreader Foundation
**Goal**: A visitor opening `/proofreader` on Chrome Canary with the proofreader flags enabled can type a sentence, press "Proofread", and see corrected text rendered below — with a clear flag-gated banner (including copy-pasteable `chrome://flags/` URLs) displayed when the `Proofreader` global is absent. The page shell, routing, nav link, and `ProofreaderService` typed wrapper are in place for Phase 9 to layer output modes on top.
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: PROOF-01, PROOF-02, PROOF-03, PROOF-05, PROOF-06
**Success Criteria** (what must be TRUE):
  1. Navigating to `/proofreader` from the main nav loads the Proofreader page styled with the site's Tailwind theme and dark-mode support; the nav link appears alongside the other shipped demo links
  2. When `window.Proofreader` is undefined the page shows a banner with the exact flag URLs (`chrome://flags/#optimization-guide-on-device-model` and `chrome://flags/#proofreader-api-for-gemini-nano`) in copy-pasteable `<code>` elements; the rest of the page (docs tab) remains accessible
  3. When the Proofreader model is downloading a progress spinner with a byte-counter sourced from the `monitor` callback is visible; when unavailable the banner replaces the workbench area entirely
  4. Typing text into the input area, selecting a language from the dropdown (English default; en/es/ja/de/fr), and clicking "Proofread" calls `ProofreaderService.proofread()` and renders `correctedInput` below the input (plain text output at minimum)
  5. The language selector choice persists in `localStorage` and is pre-selected on the next visit
  6. If `proofread()` throws, an inline error message appears inside the result panel (not silently swallowed or console-only)
**Plans**: 2 plans
- [ ] 08-01-PLAN.md — Types + ProofreaderService + MissingFlagBanner move (ambient Proofreader API decls, pooled-session service, additive banner generalization with v1.0/v1.1 import-path updates)
- [ ] 08-02-PLAN.md — Page + routing + SEO (ProofreaderPage subtree under components/Proofreader/, /proofreader + /proofreader/docs routes + desktop/mobile nav, Tabs with Docs first, dual-write seoConfigs in useSEOData.ts + prerender-react.js)
**UI hint**: yes

#### Phase 9: Proofreader Output Modes
**Goal**: A visitor can select any of three output styles via a segmented control — side-by-side diff (original left / corrected right with highlighted changed spans), inline strikethrough (original with deleted text struck through and insertions highlighted in a single column), or plain corrected text with a bulleted suggestion list — and the chosen mode re-renders the last result instantly without re-running the model.
**Depends on**: Phase 8
**Requirements**: PROOF-04
**Success Criteria** (what must be TRUE):
  1. A segmented toggle control with three labeled options ("Side-by-side", "Strikethrough", "Suggestion list") is visible on the Proofreader workbench; the active mode is visually distinguished
  2. In side-by-side mode the original text appears in a left column and the corrected text in a right column, with changed spans highlighted (e.g. yellow background) in both; the corrections array `startIndex`/`endIndex` values drive the highlight boundaries
  3. In strikethrough mode a single column renders the original text with removed words struck through and inserted corrections highlighted inline; the result is readable as a marked-up version of the original
  4. In suggestion list mode the corrected text appears as a clean paragraph followed by a bulleted list where each item reads "changed X -> Y because [explanation]", sourced from the `correction` and `explanation` fields
  5. Switching modes after a proofread re-renders the last result immediately in the new format without issuing a second API call
**Plans**: TBD
**UI hint**: yes

#### Phase 10: Multimodal Foundation
**Goal**: A visitor opening `/multimodal` on Chrome 148+ (or Canary with the multimodal flag) can drag-drop or paste an image into the chat panel, type a question about it, and receive a Gemini Nano response — with the user's attached image thumbnail visible inline in the chat transcript. A flag banner is shown when `LanguageModel.create({ expectedInputs: [{ type: 'image' }] })` is not available.
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: MULTI-01, MULTI-02, MULTI-03, MULTI-06, MULTI-07
**Success Criteria** (what must be TRUE):
  1. Navigating to `/multimodal` from the main nav loads the Multimodal chat page styled with the site's Tailwind theme and dark-mode support; the nav link appears alongside the other shipped demo links
  2. When multimodal image input is unavailable (model not downloaded or API not present), a banner with the relevant flag URLs and a plain-text explanation is displayed; the docs tab remains accessible
  3. A user can drag an image file (JPEG, PNG, or WebP) onto the chat panel drop zone and see a thumbnail preview appear in the input area before sending; invalid file types are rejected with an inline error message
  4. A user can paste an image (Cmd+V / Ctrl+V) directly into the chat input and see the same thumbnail preview as drag-drop — no separate paste button required
  5. After attaching an image and typing a question, the user's chat bubble shows the thumbnail inline above the message text; the assistant bubble appears below with Gemini Nano's response text
  6. `MultimodalService.promptWithImage(text, imageBlob)` is the single point that calls `LanguageModel.create({ expectedInputs: [{ type: 'image' }, { type: 'text' }] })` and returns a response; no direct API calls from UI components
**Plans**: TBD
**UI hint**: yes

#### Phase 11: Webcam Capture
**Goal**: A visitor can click "Take photo" to grant camera permission, preview the live feed, capture a single frame, and immediately ask the model about it — OR toggle "Live mode" to have frames sent to the model automatically every ~3 seconds with a visible performance indicator showing the current interval and last prompt latency. Camera permission errors surface as actionable inline cards.
**Depends on**: Phase 10
**Requirements**: MULTI-04, MULTI-05, MULTI-08, POLISH-02
**Success Criteria** (what must be TRUE):
  1. Clicking the "Take photo" button prompts for camera permission on click (not on page mount); after permission is granted a live video preview appears and a "Capture" button lets the user snap a single frame which attaches as a Blob to the chat input
  2. When camera permission is denied the proofreader panel area shows a card reading "Camera blocked — enable in browser settings" with a link to `chrome://settings/content/camera`; when no camera is detected an "No camera detected" card appears instead
  3. Toggling "Live mode" starts a loop that calls `ImageCapture.grabFrame()` every 3 seconds, downsamples each frame to 512x512 via `createImageBitmap`, and sends it to the model using the session reuse pattern from `MultimodalService`; toggling again stops the loop cleanly
  4. While live mode is active a small perf indicator (e.g. bottom-right badge) shows the current capture interval (e.g. "3 s interval") and the last prompt latency in milliseconds (e.g. "last: 840 ms"); both values update each frame cycle
  5. If a frame's prompt has not yet resolved, the next capture cycle is skipped (single-in-flight gating); no second `promptWithImage` call is issued while the first is pending, observable by the perf indicator not incrementing its latency during a slow frame
**Plans**: TBD
**UI hint**: yes

#### Phase 12: Docs + SEO + Demo Polish
**Goal**: Both `/proofreader/docs` and `/multimodal/docs` render markdown explainers through `DocsRenderer` with typed code samples from the real service files; all four routes (`/proofreader`, `/proofreader/docs`, `/multimodal`, `/multimodal/docs`) have SEO metadata byte-identical between `useSEOData.ts` and `prerender-react.js`; and a REHEARSAL.md template confirms both demos run cleanly across 5 cold runs.
**Depends on**: Phase 9, Phase 11
**Requirements**: DOC-01, DOC-02, DOC-03, POLISH-01
**Success Criteria** (what must be TRUE):
  1. Navigating to `/proofreader/docs` renders a markdown explainer through `DocsRenderer` covering: Proofreader API surface, `corrections` array shape with all `CorrectionType` values, LoRA adapter download behavior, language support (Chrome 149 set), and at least 2 typed code samples extracted from the real `ProofreaderService.ts`
  2. Navigating to `/multimodal/docs` renders a markdown explainer covering: `expectedInputs` syntax, accepted image input types (Blob, ImageBitmap, VideoFrame, etc.), the webcam-live performance pattern (downsample + single-in-flight + session reuse), and at least 2 typed code samples from the real `MultimodalService.ts`
  3. Both doc pages use the Tabs layout (Docs tab first, Workbench tab second) matching the v1.1 lesson — Docs is the default tab on `/proofreader/docs` and `/multimodal/docs`
  4. A `grep -F` cross-check confirms that `seoConfigs.proofreader`, `seoConfigs.proofreaderDocs`, `seoConfigs.multimodal`, and `seoConfigs.multimodalDocs` title/description strings are byte-identical between `useSEOData.ts` and `prerender-react.js`
  5. A REHEARSAL.md template exists in the Phase 12 plan directory with a 5-cold-run checklist covering: Proofreader (type -> fix -> render in each of the 3 output modes) and Multimodal (each of the 4 input modes: drag-drop, paste, webcam-snap, webcam-live)
**Plans**: TBD
**UI hint**: yes

### Progress (v1.2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Proofreader Foundation | 0/2 | Planned | — |
| 9. Proofreader Output Modes | 0/? | Not started | — |
| 10. Multimodal Foundation | 0/? | Not started | — |
| 11. Webcam Capture | 0/? | Not started | — |
| 12. Docs + SEO + Demo Polish | 0/? | Not started | — |

### Coverage Validation (v1.2)

**v1.2 Requirements:** 19 total, 19 mapped, 0 orphaned.

| Requirement | Phase | Description |
|-------------|-------|-------------|
| PROOF-01 | Phase 8 | `/proofreader` route + nav link + flag banner |
| PROOF-02 | Phase 8 | `ProofreaderService.ts` typed wrapper |
| PROOF-03 | Phase 8 | Text input area + Proofread button + result rendering |
| PROOF-05 | Phase 8 | Language selector (en/es/ja/de/fr) + localStorage persistence |
| PROOF-06 | Phase 8 | Graceful error handling (unavailable / downloading / throws) |
| PROOF-04 | Phase 9 | Three output modes + toggle UI |
| MULTI-01 | Phase 10 | `/multimodal` route + nav link + flag banner |
| MULTI-02 | Phase 10 | Drag-and-drop image input + thumbnail preview |
| MULTI-03 | Phase 10 | Clipboard paste image input |
| MULTI-06 | Phase 10 | `MultimodalService.ts` typed wrapper |
| MULTI-07 | Phase 10 | Chat transcript inline image thumbnails |
| MULTI-04 | Phase 11 | Webcam single-frame capture |
| MULTI-05 | Phase 11 | Webcam continuous live mode with gating + downsample + session reuse |
| MULTI-08 | Phase 11 | Camera permission UX (NotAllowedError / OverconstrainedError cards) |
| POLISH-02 | Phase 11 | Webcam-live perf indicator (interval + latency) |
| DOC-01 | Phase 12 | `/proofreader/docs` markdown explainer |
| DOC-02 | Phase 12 | `/multimodal/docs` markdown explainer |
| DOC-03 | Phase 12 | SEO config byte-identical mirrors for all 4 routes |
| POLISH-01 | Phase 12 | 5-cold-run REHEARSAL.md template |

### Notes (v1.2)

- **Brownfield discipline carries from v1.0 and v1.1**: No edits to `/webmcp`, `/generative-ui`, `RecipeWorkbench/*`, `mcp/`, `mcp-client/`, or `devops/awsweb/`. All new code is additive.
- **Proofreader is flag-gated (Canary-only)**: The Proofreader origin trial ended at Chrome 145. As of Chrome 148/149 no stable shipping is confirmed — the demo requires `chrome://flags/#proofreader-api-for-gemini-nano` on Chrome Canary. Banner copy must include exact, copy-pasteable flag URLs. Phase 8 must make this constraint unmissable to a first-time visitor.
- **Multimodal has lighter friction**: `LanguageModel` image input shipped stable in Chrome 148 — no flag required on Chrome 148+. The multimodal banner fires only when the API is truly unavailable (old Chrome or download not complete).
- **Parallel-execution friendly**: Phases 8-9 (Proofreader track) and Phases 10-11 (Multimodal track) have no dependency on each other. A planner may execute them in waves. Phase 12 depends on both tracks completing.
- **Definition of done**: 5-cold-run demo-able on Chrome Canary. Not reference-quality. Phase 12 REHEARSAL.md is the acceptance gate.
- **v1.1 lesson — Docs tab first**: Phase 7 (`/generative-ui/docs`) discovered the Docs tab must be the default selected tab. Phases 8 and 10 should wire the Docs tab as default from the start; Phase 12 verifies.

---
*v1.2 roadmap defined: 2026-05-19*
