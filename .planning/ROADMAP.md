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
| 6. v1.1 In-Page Chat + Tool Wiring: searchRecipes + commitRecipeToPlan + live meal plan | 0/? | Not started | — |
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

## Milestone v1.1: Generative UI on WebMCP

**Defined:** 2026-05-18
**Granularity:** coarse (4 phases — continues v1.0 numbering at Phase 4)
**Coverage:** 15/15 GENUI requirements mapped

### Core Value (v1.1)

A Chrome 146 Canary visitor opens `/generative-ui`, asks the in-page chat for a recipe, sees an interactive recipe-card carousel render *inside the chat bubble* (sandboxed iframe + JSON-RPC postMessage bridge), clicks "Pick", and watches the page's meal-plan column update live — all in under 90 seconds, zero outbound network requests.

### Phases (v1.1)

- [ ] **Phase 4: v1.1 Foundation — Page shell, store, seed** - `/generative-ui` route, banner, nav, empty meal-plan column, `MealPlanStore` (IDB), additive 12-recipe seed that doesn't clobber the existing 2 recipes
- [ ] **Phase 5: MCP Apps Host — Sandboxed iframe + postMessage bridge** - Double-iframe sandbox renderer with CSP, JSON-RPC `ui/initialize` handshake, size + host-context sync, iframe→host `tools/call` proxying, recipe-card carousel HTML drives the bridge end-to-end through a test trigger button
- [ ] **Phase 6: In-Page Chat + Tool Wiring** - LanguageModel JSON-dispatch chat panel on `/generative-ui`, `searchRecipes` returning a `_meta.ui.resourceUri`, hidden `commitRecipeToPlan` helper (visibility: app), `_meta.ui.resourceUri` intercepted so the URI never leaks into model context, meal-plan column updates live from `commitRecipeToPlan` effects
- [ ] **Phase 7: Docs + SEO + Demo Polish** - `/generative-ui/docs` markdown explainer with ≥2 typed code samples, SEO config + prerender entry byte-identical across sources, 5-cold-run repeatability validation, zero-outbound-network verification (the "all local" kicker)

### Phase Details (v1.1)

### Phase 4: v1.1 Foundation — Page shell, store, seed
**Goal**: A visitor can navigate to `/generative-ui`, see the page chrome (header, empty meal-plan column on the right, search/chat placeholder area), and the persistence groundwork is in place — `MealPlanStore` (IDB) is wired to a React state hook and a 12-recipe library is available for the Phase 6 `searchRecipes` tool. No MCP wiring, no iframe, no chat yet.
**Depends on**: v1.0 Phase 1 (RecipePersistence), v1.0 Phase 3 (SEO + prerender pattern)
**Requirements**: GENUI-01, GENUI-02, GENUI-03
**Success Criteria** (what must be TRUE):
  1. Clicking the new "Generative UI" nav link loads `/generative-ui` styled with the existing site's Tailwind theme and dark-mode toggle; the link sits alongside the shipped `/webmcp` link in both desktop and mobile nav without disturbing the existing order
  2. The page renders its empty-state shell (header, search/chat placeholder area, empty meal-plan column on the right) and survives a hard reload without console errors
  3. When `navigator.modelContext` is undefined the `MissingFlagBanner` renders at the top of the page while the rest of the layout (including the meal-plan column) remains usable for read-only browsing
  4. A user inspecting IndexedDB sees ≥12 recipes available for `searchRecipes` (the existing 2 from v1.0 are preserved — additive seed), and the meal-plan IDB store exists with the documented schema
  5. A typed `MealPlanStore` module exposes `getPlan` / `addToPlan` / `removeFromPlan` / `clearPlan` and is the only path the page reads or writes meal-plan state — plan entries survive a hard reload
**Plans**: 2 plans
- [ ] 04-01-PLAN.md — Persistence foundation (RecipePersistence v2 schema + seedIfMissing + 12-recipe seed + MealPlanStore + useMealPlan)
- [ ] 04-02-PLAN.md — Page shell + routing (GenerativeUIPage + 3 subcomponents + AppRouter route/nav + useSEOData + prerender drift mirror)
**UI hint**: yes

### Phase 5: MCP Apps Host — Sandboxed iframe + postMessage bridge
**Goal**: A visitor can click a debug/test trigger on `/generative-ui` and see the recipe-card carousel render inside a sandboxed iframe in a chat-bubble-shaped container. The full MCP Apps SEP-1865 host runs: double-iframe sandbox with CSP, `ui/initialize` handshake, `ui/notifications/size-changed` height sync, `ui/notifications/host-context-changed` theme propagation, and iframe→host `tools/call` proxy that round-trips through `navigator.modelContext`. Chat-driven flow is **not yet** wired — this phase is verifiable standalone through a developer trigger button.
**Depends on**: Phase 4
**Requirements**: GENUI-06, GENUI-07, GENUI-08
**Success Criteria** (what must be TRUE):
  1. A developer test trigger on `/generative-ui` renders the recipe-card carousel inside a sandboxed iframe inside the page; the carousel is styled (Tailwind + dark-mode-compatible) and each card has a working "Pick" button
  2. The iframe is rendered via the double-iframe sandbox pattern — outer iframe with `sandbox="allow-scripts allow-same-origin"` on a disposable origin, inner iframe with `sandbox="allow-scripts"` only; the page applies a CSP `default-src 'none'` baseline plus any allowlists from `_meta.ui.csp.*`
  3. Within 1 second of iframe mount the JSON-RPC `ui/initialize` handshake completes (host responds with `hostInfo` + `hostContext` including theme, displayMode, dimensions); the iframe then sends `ui/notifications/initialized`
  4. When the iframe's content height changes, it posts `ui/notifications/size-changed` and the host iframe element resizes accordingly without a feedback loop; when the page toggles dark mode, the host posts `ui/notifications/host-context-changed` and the iframe re-themes its content
  5. Clicking "Pick" inside the iframe issues a JSON-RPC `tools/call` over postMessage targeting a registered WebMCP tool; the host bridge proxies the call into `navigator.modelContext` and returns the result through the JSON-RPC response — observable end-to-end via console logs even before chat is wired
**Plans**: 2 plans
- [ ] 05-01-PLAN.md — Bridge core + iframe templates + tool registration helper (bridge.ts, iframeBridgeScript.ts, carouselTemplate.ts, genUITools.ts)
- [ ] 05-02-PLAN.md — Frame component + page wiring (ChatBubbleContainer, UIResourceFrame, ChatPlaceholder update, GenerativeUIPage effect, browser smoke check)
**UI hint**: yes

### Phase 6: In-Page Chat + Tool Wiring
**Goal**: The full demo flow runs end-to-end through the chat surface. A user types a recipe request into the in-page chat, the assistant calls `searchRecipes`, the recipe-card carousel renders inside the chat bubble (via the Phase 5 host), clicking "Pick" calls the hidden `commitRecipeToPlan` helper through the iframe→host bridge, and the meal-plan column on the right updates live. The resource URI never leaks into the model's conversation context.
**Depends on**: Phase 5
**Requirements**: GENUI-04, GENUI-05, GENUI-09, GENUI-10, GENUI-11
**Success Criteria** (what must be TRUE):
  1. The chat panel on `/generative-ui` accepts user messages and streams assistant text responses via Chrome `LanguageModel` using the `responseFormat` JSON-dispatch pattern (mirrors the shipped `AgentDrawer.tsx`); messages render in the existing dark-mode-compatible chat styles
  2. On page mount the `searchRecipes` tool is registered via `navigator.modelContext.registerTool`; its handler returns `{ content: [...], _meta: { 'ui.resourceUri': ... } }` per MCP Apps SEP-1865; on unmount the tool unregisters cleanly without duplicate-name errors on remount (StrictMode/HMR safe)
  3. The page-side `commitRecipeToPlan(recipeId)` helper is registered with `visibility: ["app"]` so it does NOT appear in the chat agent's tool catalog; the iframe successfully invokes it via the `tools/call` JSON-RPC method, the meal-plan column re-renders within one animation frame, and the plan entry survives a hard reload
  4. When a tool result contains `_meta.ui.resourceUri`, the chat panel renders the iframe in the chat bubble and substitutes a short summary (e.g. "Showed N recipe cards") for the model's context — the literal resource URI never appears in any prompt sent back to `LanguageModel`
  5. The canonical 90-second demo flow runs once successfully on Chrome 146 Canary: user types a recipe query → carousel appears in chat → user clicks "Pick" → meal-plan column updates → chat agent confirms in text — no manual reloads, no console errors, no failed inferences
**Plans**: TBD
**UI hint**: yes

### Phase 7: Docs + SEO + Demo Polish
**Goal**: A visitor (and search engines) can discover and read a `/generative-ui/docs` markdown explainer that mirrors the shipped `/webmcp/docs` style, the SEO + prerender pipeline emits the new routes byte-identically across sources, and the 90-second demo runs reliably across 5 cold runs with zero outbound network requests — the talk's kicker is verifiable in DevTools.
**Depends on**: Phase 6
**Requirements**: GENUI-12, GENUI-13, GENUI-14, GENUI-15
**Success Criteria** (what must be TRUE):
  1. Navigating to `/generative-ui/docs` renders a markdown explainer through `DocsRenderer` covering the MCP Apps SEP-1865 wire format, the bidirectional pattern (page registers UI-returning tools + hidden helpers, iframe invokes helpers via `tools/call`), the sandbox model, and includes at least 2 typed code samples drawn from the real `GENUI_TOOLS` source
  2. Both `/generative-ui` and `/generative-ui/docs` set page-specific titles and meta descriptions through `SEOProvider`; the entries in `chat/src/app/hooks/useSEOData.ts` (`seoConfigs.generativeUI`) and in `chat/scripts/prerender-react.js` are byte-identical (verifiable via `grep -F` cross-check)
  3. The canonical 90-second demo flow completes successfully on 5 cold runs in a fresh Chrome 146 Canary profile with no failed inferences and no manual interventions; any flake observed in the 5 runs is fixed before the phase closes
  4. During the demo flow the DevTools Network tab shows zero outbound network requests (no fetch, no XHR, no resource loads beyond initial page paint) — verifiable by recording the demo with Network capture on
**Plans**: TBD

## Progress (v1.1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 4. v1.1 Foundation — Page shell, store, seed | 0/2 | Planned | — |
| 5. MCP Apps Host — Sandboxed iframe + bridge | 0/2 | Planned | — |
| 6. In-Page Chat + Tool Wiring | 0/? | Not started | — |
| 7. Docs + SEO + Demo Polish | 0/? | Not started | — |

## Coverage Validation (v1.1)

**GENUI Requirements:** 15 total, 15 mapped, 0 orphaned.

| Phase | Requirements Mapped | Count |
|-------|---------------------|-------|
| 4. v1.1 Foundation | GENUI-01, GENUI-02, GENUI-03 | 3 |
| 5. MCP Apps Host | GENUI-06, GENUI-07, GENUI-08 | 3 |
| 6. In-Page Chat + Tool Wiring | GENUI-04, GENUI-05, GENUI-09, GENUI-10, GENUI-11 | 5 |
| 7. Docs + SEO + Demo Polish | GENUI-12, GENUI-13, GENUI-14, GENUI-15 | 4 |
| **Total** | | **15** |

## Notes (v1.1)

- **Tracer-bullet shape**: Phase 4 ships the visible page shell + persistence layer without any MCP wiring so the skeleton is demo-able as soon as it lands. Phase 5 stands up the most novel work (sandboxed iframe + JSON-RPC bridge) in isolation behind a developer trigger — verifiable before chat exists. Phase 6 wires the full demo flow end-to-end through chat. Phase 7 is purely about repeatability and discoverability.
- **Why split Phase 5 from Phase 6**: The iframe + postMessage bridge is the largest unknown in this milestone (≈200 LOC of novel protocol code per the constraint brief, with subtle hazards around `_meta.uri` leaking, iframe `load` race, double-sandbox CSP). Decoupling it from the chat layer lets us harden the bridge with a developer trigger before we layer LanguageModel JSON-dispatch on top.
- **Definition of done (v1.1)**: 90-second demo on Chrome 146 Canary, 5 cold runs clean, zero outbound network. Not reference-quality, not production-polished. Phase boundaries are calibrated to the shortest path to that demo.
- **Brownfield discipline (v1.1)**: All shipped v1.0 demos (`/chat`, `/summary`, `/translate`, `/writer`, `/tool-calling`, `/webmcp`) are untouched. New files only for `/generative-ui` + minimal additive edits to `AppRouter.tsx`, nav, `useSEOData.ts`, and `prerender-react.js`. `mcp/`, `mcp-client/`, `devops/awsweb/` remain untouched.
- **Native-only carries from v1.0**: No `@mcp-b/global` polyfill. We write a minimal local postMessage bridge (the research recommended ~200 LOC). The `MissingFlagBanner` from v1.0 is reused as-is.
- **In-page chat carries from v1.0**: Chrome 147 native `LanguageModel.create({tools})` remains broken — Phase 6 reuses the proven `responseFormat` JSON-dispatch pattern from `AgentDrawer.tsx`.

---
*v1.1 roadmap defined: 2026-05-18*
