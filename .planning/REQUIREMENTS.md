# Requirements: window-ai — WebMCP Recipe Workbench

**Defined:** 2026-04-26
**Core Value:** A Chrome 146 Canary visitor can in under 2 minutes open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector.

## v1 Requirements

Requirements for the WebMCP Recipe Workbench milestone. Each maps to a roadmap phase.

### Routing & Navigation

- [x] **NAV-01**: A new `/webmcp` route is registered in `chat/src/app/AppRouter.tsx` and renders the Recipe Workbench page
- [x] **NAV-02
**: A new `/webmcp/docs` route is registered and renders the WebMCP markdown explainer via `DocsRenderer`, matching the structure of the existing `/writer` and `/summary` doc tabs
- [x] **NAV-03**: A nav link to `/webmcp` is added to the main site navigation, placed alongside `/writer` and `/summary` and matching their styling

### Recipe Workbench UI

- [x] **UI-01**: The page renders an active recipe with title, servings count, ingredients (name + quantity + unit), and ordered steps using the existing site's Tailwind theme and dark-mode toggle
- [x] **UI-02**: When `navigator.modelContext` is unavailable (flag off / wrong browser), a banner explains how to enable it (Chrome 146+ Canary, `chrome://flags/#WebMCP for testing`); the rest of the page remains usable for read-only browsing
- [x] **UI-03**: A list/picker shows the available recipes (1–2 seeded entries) and lets the user switch the active recipe; UI updates reflect the active recipe in real time

### Persistence

- [x] **DATA-01**: Recipe state persists to IndexedDB and survives page reloads
- [x] **DATA-02**: On first load, 1–2 sample recipes are seeded (e.g. pancakes, tomato pasta) so the demo flow works immediately
- [x] **DATA-03**: A persistence layer module exposes typed `getRecipes`, `getRecipe`, `saveRecipe`, `deleteRecipe` functions used by both UI and tool handlers (single source of truth for recipe state)

### WebMCP Tool Registration

- [x] **MCP-01**: Type declarations for `navigator.modelContext`, `ModelContext`, `registerTool`, `provideContext`, and tool descriptor shapes are added (in `chrome-llm-ts/src/` or `chat/src/app/types/`) so the integration is type-safe
- [x] **MCP-02
**: On Recipe Workbench page mount, the page registers its tools via the native `navigator.modelContext` API; on unmount, all registered tools are unregistered
- [ ] **MCP-03**: At minimum the following tools are registered with descriptions and JSON Schema input schemas: `listRecipes`, `getRecipe(id)`, `selectRecipe(id)`, `scaleRecipe(servings)`, `swapIngredient(ingredientName, replacement)`, `addIngredient(name, quantity, unit)`, `removeIngredient(ingredientName)`, `generateShoppingList()`
- [x] **MCP-04
**: Tool handlers operate on the persistence layer (DATA-03), so changes propagate to UI state and survive reloads
- [x] **MCP-05
**: Registered tools are discoverable + invokable by an external agent — verified using the WebMCP Tool Inspector extension on Chrome 146 Canary; the tools' names, descriptions, and input schemas appear correctly

### In-Page Chat Agent

- [x] **AGENT-01
**: A chat panel on the Recipe Workbench page accepts user messages and displays streamed assistant responses, using `chrome-llm-ts` `LanguageModel` typing and the same UI patterns as the existing `/chat` and `/tool-calling` pages
- [x] **AGENT-02
**: The chat agent uses `LanguageModel` tool-calling to invoke the same WebMCP tools registered on the page (single tool-definition source of truth, two consumers — in-page agent and external agent)
- [x] **AGENT-03
**: The 2-minute demo flow works end-to-end: user types "scale to 6 and swap milk for oat milk" (or equivalent) → chat agent calls `scaleRecipe` and `swapIngredient` → recipe UI updates live with new servings + replaced ingredient

### Documentation

- [x] **DOCS-01
**: A markdown explainer at `chat/src/app/docs/webmcp.md` (or equivalent location matching existing pattern) covers: what WebMCP is, the W3C spec status, the `navigator.modelContext.registerTool` API surface, the security/permission model, browser support (Chrome 146+ / Edge 147+), and at least 2 code samples
- [x] **DOCS-02
**: SEO metadata (title, description) is set for both `/webmcp` and `/webmcp/docs` routes via the existing `SEOProvider` pattern

## v1.1 Requirements

Generative UI on WebMCP milestone. Each maps to a roadmap phase via Traceability below. Builds additively on top of the shipped v1.0 — no v1.0 demo is modified.

### Routing & Navigation (v1.1)

- [ ] **GENUI-01**: A new `/generative-ui` route is registered in `chat/src/app/AppRouter.tsx`, a nav link added alongside `/webmcp` and the other shipped demos, and `MissingFlagBanner` renders when `navigator.modelContext` is undefined; the rest of the page remains usable for read-only browsing

### Persistence (v1.1)

- [ ] **GENUI-02**: 12 seeded recipes available for `searchRecipes` — additive seed that extends `RecipePersistence` without destroying any existing recipes in IDB
- [ ] **GENUI-03**: A typed `MealPlanStore` (IndexedDB) exposes `getPlan`, `addToPlan`, `removeFromPlan`, `clearPlan`; plan survives page reload

### WebMCP Tools (MCP Apps pattern)

- [ ] **GENUI-04**: `searchRecipes` tool is registered via `navigator.modelContext.registerTool` on `/generative-ui` page mount and unregistered on unmount; the handler returns `{ content: [{ type: 'text', text: ... }], _meta: { 'ui.resourceUri': ... } }` shape per MCP Apps SEP-1865
- [ ] **GENUI-05**: A page-side helper tool `commitRecipeToPlan(recipeId)` is registered with `visibility: ["app"]` annotation (hidden from the LLM in tool catalog); the iframe invokes it via the `tools/call` JSON-RPC method over postMessage

### Generative UI Rendering

- [ ] **GENUI-06**: A sandboxed iframe renderer in the chat bubble follows the SEP-1865 double-iframe pattern — outer `sandbox="allow-scripts allow-same-origin"` on a disposable origin, inner `sandbox="allow-scripts"` only; CSP `default-src 'none'` baseline with explicit allowlists from `_meta.ui.csp.*` if present
- [ ] **GENUI-07**: A JSON-RPC over postMessage bridge implements: `ui/initialize` handshake, `ui/notifications/size-changed` for height sync (ResizeObserver in iframe), `ui/notifications/host-context-changed`, and proxies iframe→page `tools/call` requests to the local WebMCP surface
- [ ] **GENUI-08**: A recipe-card carousel UI renders inside the iframe — styled, dark-mode-compatible, each card has a "Pick" button that triggers `commitRecipeToPlan` via the postMessage bridge

### In-Page Chat (v1.1)

- [ ] **GENUI-09**: A chat panel on `/generative-ui` uses Chrome `LanguageModel` with `responseFormat` JSON-dispatch (Phase 2 pattern; Chrome 147 native `tools` API remains broken per existing `AgentDrawer.tsx` workaround)
- [ ] **GENUI-10**: The chat panel intercepts `_meta.ui.resourceUri` from tool results BEFORE feeding back to the model — renders the iframe in the chat bubble; the resource URL never leaks into the model's conversation context

### Live Page Updates

- [ ] **GENUI-11**: A meal-plan column on the right side of `/generative-ui` re-renders when `commitRecipeToPlan` fires (subscribes to `MealPlanStore` via React state), without a full page reload

### Documentation & SEO (v1.1)

- [ ] **GENUI-12**: SEO config `seoConfigs.generativeUI` added to `chat/src/app/hooks/useSEOData.ts` and matching entry in `chat/scripts/prerender-react.js` — byte-identical between the two sources (cross-file `grep -F` verification)
- [ ] **GENUI-13**: A markdown explainer at `chat/src/app/docs/Generative-UI-API.md` rendered via `DocsRenderer` covers: MCP Apps SEP-1865 wire format, the bidirectional pattern (page registers UI-returning tools + hidden helpers, iframe invokes helpers via `tools/call`), the sandbox model, and ≥2 typed code samples drawn from real `GENUI_TOOLS`

### Demo Quality (Definition of Done)

- [ ] **GENUI-14**: The 90-second end-to-end demo flow runs without failed inferences across 5 cold-runs on the speaker's laptop (search recipe → carousel renders in chat → Pick → meal plan updates)
- [ ] **GENUI-15**: Zero outbound network requests during the demo flow — verifiable in DevTools Network tab (this is the talk's kicker — "all local")

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Polish & Reach

- **V2-01**: Polyfill support via `@mcp-b/global` for browsers without native `navigator.modelContext`
- **V2-02**: Live deployment to `windowai.danduh.me` via existing Nx awsweb CDK pipeline
- **V2-03**: Production-quality error states (network failures, malformed tool inputs, agent failure modes)
- **V2-04**: Accessibility audit (ARIA, keyboard nav, screen reader walkthrough)
- **V2-05**: Google Analytics events for WebMCP demo interactions (page view, tool invocation, agent message)

### Demo Expansion

- **V2-06**: Larger recipe library (5–10 recipes) with browse/search UI
- **V2-07**: Recipe creation from blank state (full add/edit UX, not just chat-driven)
- **V2-08**: Additional tools: `convertToMetric` / `convertToImperial`, `simplifyInstructions` (chains to `Rewriter`), `findSubstitute` (chains to `LanguageModel`), `addStep` / `reorderSteps`

## Out of Scope

Explicitly excluded. Reasoning preserved to prevent re-adding.

| Feature | Reason |
|---------|--------|
| `@mcp-b/global` polyfill | User chose native-only — demo's purpose is to showcase the real Chrome API, not abstract it |
| External MCP server (`mcp/` workspace) integration | This is purely WebMCP (browser-mediated). The existing `mcp/` server is unrelated |
| Live deployment in this milestone | User chose local-only first; deployment is a low-risk follow-up |
| Authentication / multi-user | Single-user local demo; out of WebMCP scope |
| Server-side persistence / sync | IndexedDB only; no backend |
| Streaming tool responses | Tool handlers return synchronously; only the chat agent's text streams |
| Editing other existing demos (`/chat`, `/writer`, `/summary`, `/translate`, `/tool-calling`) | Brownfield discipline — don't refactor what isn't being touched |
| Touching `mcp/`, `mcp-client/`, `devops/awsweb/` workspaces | Out of milestone scope |

## Traceability

Which phases cover which requirements. Updated by gsd-roadmapper during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 1 | Mapped |
| NAV-02 | Phase 3 | Mapped |
| NAV-03 | Phase 1 | Mapped |
| UI-01 | Phase 1 | Mapped |
| UI-02 | Phase 1 | Mapped |
| UI-03 | Phase 1 | Mapped |
| DATA-01 | Phase 1 | Mapped |
| DATA-02 | Phase 1 | Mapped |
| DATA-03 | Phase 1 | Mapped |
| MCP-01 | Phase 1 | Mapped |
| MCP-02 | Phase 2 | Mapped |
| MCP-03 | Phase 2 | Mapped |
| MCP-04 | Phase 2 | Mapped |
| MCP-05 | Phase 2 | Mapped |
| AGENT-01 | Phase 2 | Mapped |
| AGENT-02 | Phase 2 | Mapped |
| AGENT-03 | Phase 2 | Mapped |
| DOCS-01 | Phase 3 | Mapped |
| DOCS-02 | Phase 3 | Mapped |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 after roadmap creation*
