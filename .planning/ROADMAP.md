# Roadmap: window-ai — WebMCP Recipe Workbench

**Defined:** 2026-04-26
**Granularity:** coarse (3 phases)
**Coverage:** 19/19 v1 requirements mapped

## Core Value

A visitor with Chrome 146 Canary (WebMCP flag enabled) can, in under 2 minutes: open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector extension.

## Phases

- [x] **Phase 1: Foundation Skeleton** - `/webmcp` route mounts, recipe UI renders from IndexedDB-seeded data, type definitions for `navigator.modelContext` exist, missing-flag banner appears in unsupported browsers
- [ ] **Phase 2: WebMCP Tools + In-Page Agent** - All 8 tools registered via `navigator.modelContext`, in-page LanguageModel chat panel invokes them via tool-calling, external Tool Inspector verifies discoverability
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
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Skeleton | 3/3 | Complete | 2026-04-27 |
| 2. WebMCP Tools + In-Page Agent | 3/3 | Awaiting human UAT | - |
| 3. Documentation + SEO | 0/0 | Not started | - |

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
