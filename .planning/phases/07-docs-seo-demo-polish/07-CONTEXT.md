# Phase 7: Docs + SEO + Demo Polish — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 closes the v1.1 milestone with documentation, SEO, and demo-day polish:
1. `/generative-ui/docs` route + markdown explainer (`Generative-UI-API.md`) with the MCP Apps SEP-1865 wire format, sandbox model, postMessage protocol, bidirectional pattern, and 4 real-source code samples
2. `seoConfigs.generativeUIDocs` entry added byte-identically to `useSEOData.ts` and `prerender-react.js`
3. Tabs component on `/generative-ui` toggling between Workbench (chat panel) and Docs (DocsRenderer)
4. Fix Phase 5 Pick button visual clipping (carried known issue)
5. Polish items: loading state in chat ("Thinking..."), gate dev `console.debug` logs behind `import.meta.env.DEV`, show recipe titles instead of recipe IDs in MealPlanColumn, add a "Clear plan" button
6. Manual demo rehearsal — 5 cold runs on speaker's laptop with `REHEARSAL.md` log
7. DevTools-friendly Network kicker — a small visible marker the speaker can point to on stage

Out of scope: live deployment (v2), CI rehearsal automation (v2), accessibility audit (v2), production-grade error states (v2).

</domain>

<decisions>
## Implementation Decisions

### Docs structure + content
- **Location:** `chat/src/app/docs/Generative-UI-API.md` (matches v1.0 demo pattern — `Chat-API.md`, `Writer-ReWriter-API.md`, etc.)
- **Structure:** 6 sections — (1) What is MCP Apps SEP-1865 (one paragraph + spec link), (2) Tool result wire format (TS interface + example), (3) Sandbox model (double-iframe + CSP), (4) postMessage protocol (JSON-RPC `ui/initialize`, `ui/notifications/size-changed`, `host-context-changed`, `tools/call`), (5) Bidirectional pattern (page registers `searchRecipes` + hidden `commitRecipeToPlan`, iframe calls helper via `tools/call`), (6) Try it section — link to `/generative-ui` demo
- **Code samples (≥4):** all drawn from the real `GENUI_TOOLS` and `bridge.ts` source:
  1. `searchRecipes` tool registration shape (from `genUITools.ts`)
  2. MCP Apps result shape (`{ content: [...], _meta: { 'ui.resourceUri': ... } }`)
  3. iframe-side `tools/call` JSON-RPC payload (from `iframeBridgeScript.ts`)
  4. Host bridge `_meta` interceptor (from `GenUIChatPanel.tsx` lines 323–360)
- **Tabs component:** clone the v1.0 `RecipeWorkbenchPage`'s Tabs pattern — Docs tab FIRST in array (matches v1.0 lesson — `currentPath.includes('')` matches everything if Workbench is first), Workbench tab second. Route `/generative-ui/docs` renders `<GenerativeUIPage>` which switches to Docs tab based on `location.pathname.endsWith('/docs')`.

### SEO + routing
- Phase 4 already established `seoConfigs.generativeUI`. Phase 7 adds matching `seoConfigs.generativeUIDocs` entry:
  - title: "Generative UI Docs — MCP Apps wire format + bidirectional pattern | Chrome AI APIs"
  - description: "How to register UI-returning tools and hidden helpers with navigator.modelContext, sandboxed iframes, and JSON-RPC postMessage bridge — SEP-1865 reference."
- Both entries must be byte-identical between `chat/src/app/hooks/useSEOData.ts` and `chat/scripts/prerender-react.js` (verifiable with `grep -F`)
- **Register `/generative-ui/docs` route** in `AppRouter.tsx`, pointing to the same `GenerativeUIPage` component (which switches based on pathname). Mirror the v1.0 `/webmcp/docs` registration block. NO separate top-nav link — the Tabs component on `/generative-ui` is the discovery surface.

### Pick button clipping fix (Phase 5 carried issue)
- **Root cause:** inner iframe's ResizeObserver observes `document.documentElement` which doesn't expand for overflow children (the horizontal-scroll carousel). The measured 150px height clipped the Pick button at card bottom.
- **Fix in `iframeBridgeScript.ts`:**
  1. Observe `document.body` instead of `document.documentElement`
  2. Read `Math.max(body.scrollHeight, body.offsetHeight)` to capture overflow content
  3. Add `min-height: 200px` to the inner `<body>` in `carouselTemplate.ts` as a safety net (Pick button is at bottom of cards which need ≥180px; 200px gives breathing room)
  4. Send the height value through the existing `ui/notifications/size-changed` notification unchanged

### Polish items
- **Chat loading state:** while LanguageModel is processing, show a "Thinking…" message in the transcript (system-styled, italicized, removed when assistant reply arrives). Implementation: add a transient Message with `id: -1, text: 'Thinking…', sender: 'System'` before each `session.prompt()` call, remove on response received. Already a UI-SPEC-compliant pattern (no new styling needed).
- **`console.debug` DEV-gating:** replace every `console.debug(...)` in `bridge.ts`, `iframeBridgeScript.ts`, `carouselTemplate.ts`, `GenUIChatPanel.tsx` with a small helper `function debug(...args) { if (import.meta.env.DEV) console.debug(...args); }`. Production build is quiet on demo day if/when deployed.
- **Recipe titles in MealPlanColumn:** currently entries render as `lemon-garlic-chicken-skillet` (the recipeId). Modify `MealPlanColumn.tsx` to resolve `recipeId → recipe.title` via `RecipePersistence.getRecipe(id)` and render the human-readable title. Show recipeId as a smaller meta line for debug/uniqueness.
- **Clear plan button:** add a small "Clear plan" button to `MealPlanColumn` (visible only when `plan.length > 0`). Calls `MealPlanStore.clearPlan()`. Useful for resetting between cold demo runs without DevTools surgery.

### Demo rehearsal (criterion 3 + 4)
- **Manual on speaker's laptop** — Chrome 146 Canary with WebMCP flag enabled
- **Log file:** `.planning/phases/07-docs-seo-demo-polish/REHEARSAL.md` (created in Phase 7 execution). One section per cold run with timestamps, observations, any failures. Iterate fixes until 5 consecutive clean runs.
- **Cold run definition:** fresh Chrome profile OR DevTools → Application → Storage → Clear site data → reload. Each run starts from empty IDB + cleared LanguageModel session.
- **Zero outbound network kicker:** add a small text marker at the bottom of `/generative-ui` reading "🔒 Zero network during demo — open DevTools → Network tab" (only visible in DEV or as a permanent demo affordance — planner picks). The speaker shows the empty Network tab on stage at the conclusion of the demo.

### Module/file changes
- New: `chat/src/app/docs/Generative-UI-API.md` (markdown explainer)
- Modified: `chat/src/app/components/GenerativeUIPage.tsx` (add Tabs, switch on `location.pathname`)
- Modified: `chat/src/app/components/GenerativeUI/MealPlanColumn.tsx` (resolve titles + clear plan button)
- Modified: `chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts` (ResizeObserver fix)
- Modified: `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts` (body min-height)
- Modified: `chat/src/app/components/GenerativeUI/bridge.ts` (debug helper)
- Modified: `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` (Thinking… loading state + DEV-gate debug)
- Modified: `chat/src/app/AppRouter.tsx` (register `/generative-ui/docs` route)
- Modified: `chat/src/app/hooks/useSEOData.ts` (add `seoConfigs.generativeUIDocs`)
- Modified: `chat/scripts/prerender-react.js` (mirror entry — byte-identical)
- New (Phase 7 execution side artifact): `.planning/phases/07-docs-seo-demo-polish/REHEARSAL.md`

### Claude's Discretion
- Markdown styling, headers, exact wording inside `Generative-UI-API.md` — author with technical precision; aim for the v1.0 `Writer-ReWriter-API.md` density
- Exact title/description copy for `seoConfigs.generativeUIDocs` — planner authors
- Whether the "Zero network" marker is DEV-only or always visible — planner picks (recommendation: small text always-visible, low key, planner can lean toward subtle)
- Whether to add a "Hide Thinking…" timeout (e.g., 10s safety) — planner picks
- "Clear plan" button copy — planner picks ("Clear", "Reset plan", etc.)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/tools/DocsRenderer.tsx` (v1.0) — renders markdown via shadow-DOM; no changes needed
- `chat/src/app/components/RecipeWorkbenchPage.tsx` (v1.0) — Tabs pattern + path-aware tab selection. Mirror for `GenerativeUIPage`
- `chat/src/app/components/Tabs.tsx` (v1.0) — reusable Tabs component
- `chat/src/app/docs/WebMCP-API.md` (v1.0) — closest analog; structure + style template
- `chat/src/app/services/RecipePersistence.ts` (Phase 4 — `getRecipe(id)` for title resolution)
- `chat/src/app/services/MealPlanStore.ts` (Phase 4 — `clearPlan()` already exists)
- `chat/src/app/components/GenerativeUI/iframe/*` (Phase 5 outputs — need patches per the clipping fix)
- `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` (Phase 6 — extend with Thinking… loading state)

### Established Patterns
- Tabs ordering — Docs tab FIRST in the array (lesson from v1.0)
- SEO byte-identical mirror — `grep -F` cross-check
- DocsRenderer shadow-DOM isolates docs CSS from page styles
- `import.meta.env.DEV` is the standard Vite env flag for dev-only logic

### Integration Points
- `AppRouter.tsx` — add `<Route path="/generative-ui/docs" element={<GenerativeUIPage />} />` after the existing `/generative-ui` route
- `GenerativeUIPage.tsx` — read `location.pathname`; if ends with `/docs`, render `<DocsRenderer markdownPath="docs/Generative-UI-API.md" />`; else render the existing Workbench (chat panel + meal plan)
- `useSEOData.ts` — `seoConfigs.generativeUIDocs` entry mirrored in `prerender-react.js`
- `MealPlanColumn.tsx` — uses `useMealPlan()` + adds title resolution via `RecipePersistence.getRecipe(id)`

</code_context>

<specifics>
## Specific Ideas

- **The doc explainer is what makes the v1.1 milestone *educational*** — not just demo-able. The 4 real-source code samples make it a reference engineers can use. Keep prose tight; let the code do the talking.
- **Pick button clipping fix is THE polish item** that determines whether the live demo works end-to-end. Test it on Chrome 146 Canary AS PART OF THE EXECUTION (in addition to the rehearsal phase).
- **The "Zero network" marker is the talk's kicker** — Daniel will use it as the final reveal: "And look — DevTools Network tab is empty. All local." Make it visible enough to point to but not loud enough to compete with the carousel/meal-plan visuals.

</specifics>

<deferred>
## Deferred Ideas

- Live deployment to `windowai.danduh.me` → v2 milestone
- Automated end-to-end Playwright test for the 90s demo → v2 (requires Canary in CI)
- Accessibility audit (ARIA labels, keyboard nav inside iframe) → v2
- Multi-language docs translation → v2
- Production-grade error states (network failure, model unavailable, malformed tool input) → v2
- LRU/TTL on `recipeCarouselRegistry` → v2 (single-page-session in v1.1 is fine)

</deferred>
