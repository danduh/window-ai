# Requirements: window-ai — WebMCP Recipe Workbench

**Defined:** 2026-04-26
**Core Value:** A Chrome 146 Canary visitor can in under 2 minutes open `/webmcp`, see a preloaded recipe, type "scale to 6 and swap milk for oat milk" into the in-page chat, watch the recipe state update live, and see the registered tools listed in the WebMCP Tool Inspector.

## v1 Requirements

Requirements for the WebMCP Recipe Workbench milestone. Each maps to a roadmap phase.

### Routing & Navigation

- [x] **NAV-01**: A new `/webmcp` route is registered in `chat/src/app/AppRouter.tsx` and renders the Recipe Workbench page
- [ ] **NAV-02**: A new `/webmcp/docs` route is registered and renders the WebMCP markdown explainer via `DocsRenderer`, matching the structure of the existing `/writer` and `/summary` doc tabs
- [x] **NAV-03**: A nav link to `/webmcp` is added to the main site navigation, placed alongside `/writer` and `/summary` and matching their styling

### Recipe Workbench UI

- [ ] **UI-01**: The page renders an active recipe with title, servings count, ingredients (name + quantity + unit), and ordered steps using the existing site's Tailwind theme and dark-mode toggle
- [ ] **UI-02**: When `navigator.modelContext` is unavailable (flag off / wrong browser), a banner explains how to enable it (Chrome 146+ Canary, `chrome://flags/#WebMCP for testing`); the rest of the page remains usable for read-only browsing
- [ ] **UI-03**: A list/picker shows the available recipes (1–2 seeded entries) and lets the user switch the active recipe; UI updates reflect the active recipe in real time

### Persistence

- [ ] **DATA-01**: Recipe state persists to IndexedDB and survives page reloads
- [ ] **DATA-02**: On first load, 1–2 sample recipes are seeded (e.g. pancakes, tomato pasta) so the demo flow works immediately
- [ ] **DATA-03**: A persistence layer module exposes typed `getRecipes`, `getRecipe`, `saveRecipe`, `deleteRecipe` functions used by both UI and tool handlers (single source of truth for recipe state)

### WebMCP Tool Registration

- [ ] **MCP-01**: Type declarations for `navigator.modelContext`, `ModelContext`, `registerTool`, `provideContext`, and tool descriptor shapes are added (in `chrome-llm-ts/src/` or `chat/src/app/types/`) so the integration is type-safe
- [ ] **MCP-02**: On Recipe Workbench page mount, the page registers its tools via the native `navigator.modelContext` API; on unmount, all registered tools are unregistered
- [ ] **MCP-03**: At minimum the following tools are registered with descriptions and JSON Schema input schemas: `listRecipes`, `getRecipe(id)`, `selectRecipe(id)`, `scaleRecipe(servings)`, `swapIngredient(ingredientName, replacement)`, `addIngredient(name, quantity, unit)`, `removeIngredient(ingredientName)`, `generateShoppingList()`
- [ ] **MCP-04**: Tool handlers operate on the persistence layer (DATA-03), so changes propagate to UI state and survive reloads
- [ ] **MCP-05**: Registered tools are discoverable + invokable by an external agent — verified using the WebMCP Tool Inspector extension on Chrome 146 Canary; the tools' names, descriptions, and input schemas appear correctly

### In-Page Chat Agent

- [ ] **AGENT-01**: A chat panel on the Recipe Workbench page accepts user messages and displays streamed assistant responses, using `chrome-llm-ts` `LanguageModel` typing and the same UI patterns as the existing `/chat` and `/tool-calling` pages
- [ ] **AGENT-02**: The chat agent uses `LanguageModel` tool-calling to invoke the same WebMCP tools registered on the page (single tool-definition source of truth, two consumers — in-page agent and external agent)
- [ ] **AGENT-03**: The 2-minute demo flow works end-to-end: user types "scale to 6 and swap milk for oat milk" (or equivalent) → chat agent calls `scaleRecipe` and `swapIngredient` → recipe UI updates live with new servings + replaced ingredient

### Documentation

- [ ] **DOCS-01**: A markdown explainer at `chat/src/app/docs/webmcp.md` (or equivalent location matching existing pattern) covers: what WebMCP is, the W3C spec status, the `navigator.modelContext.registerTool` API surface, the security/permission model, browser support (Chrome 146+ / Edge 147+), and at least 2 code samples
- [ ] **DOCS-02**: SEO metadata (title, description) is set for both `/webmcp` and `/webmcp/docs` routes via the existing `SEOProvider` pattern

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
