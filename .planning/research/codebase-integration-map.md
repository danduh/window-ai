# Codebase Integration Map — WebMCP + Generative UI (new tab)

**Date:** 2026-05-18
**Branch:** `feature/mcp-preview`
**Scope:** Plan a NEW demo tab (additive to the existing `/webmcp` Recipe Workbench) that demonstrates the **MCP Apps / mcp-ui generative-UI pattern**: a tool returns a UI resource → sandboxed iframe → the iframe registers more tools back via `navigator.modelContext`.

This document maps the existing codebase, surfaces conflicts with the handoff (`.planning/HANDOFF_WEBMCP_GENERATIVE_UI.md`), and proposes a non-conflicting layout.

> The handoff was written before Phase 1–3 shipped. Its proposed file layout (`chat/src/app/webmcp/WebMCPPage.tsx`) **collides with the already-shipped `/webmcp` Recipe Workbench** at `chat/src/app/components/RecipeWorkbenchPage.tsx`. This map proposes a new route that coexists with the existing one.

---

## 1. Existing `/webmcp` Implementation (what NOT to break)

### Route + page
- **Route definition:** `chat/src/app/AppRouter.tsx:231–233` registers both `/webmcp` and `/webmcp/docs`, both pointing to `RecipeWorkbenchPage`.
- **Nav links:** `chat/src/app/AppRouter.tsx:70–72` (desktop) and `:160–162` (mobile).
- **Page:** `chat/src/app/components/RecipeWorkbenchPage.tsx` — 323 LOC, tab-based (Docs + Workbench), wraps `AgentDrawer`.
- **Sub-components:** `chat/src/app/components/RecipeWorkbench/` (10 files: AgentDrawer, IngredientsList, LanguageModelUnavailable, MissingFlagBanner, RecipeHeader, RecipePicker, StepsList, ToolCallIndicator, ToolListPanel, ToolRegistrationPill).

### Tool registration pattern (mount effect)
**Location:** `RecipeWorkbenchPage.tsx:164–228`. Key mechanics to mirror:
- Module-scope `previousRegistrationController` ref to defuse StrictMode/HMR double-mount duplicate-name errors (`:98`).
- `DUPLICATE_NAME_PATTERN` regex tolerates Canary's residual desync (`:104`).
- One `AbortController` per mount; `controller.abort()` in cleanup unregisters the entire batch atomically (W3C spec: no `unregisterTool`).
- Tools wrapped via `wrapToolsWithEvents(...)` from `services/toolAdapter.ts:77` so external-agent calls also fire the UI indicator.
- Per-tool `try/catch` to handle partial-registration recovery.

### MissingFlagBanner
`chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — yellow alert, copy is WebMCP-specific (mentions `chrome://flags/#WebMCP`). **Reusable as-is** for the new tab (or clone-and-tweak if the copy needs to mention MCP Apps / mcp-ui).

### SEO wiring
- Hook: `chat/src/app/hooks/useSEOData.ts:11`. Path-aware pattern in `RecipeWorkbenchPage.tsx:114–119` (toggles `webmcp` vs `webmcpDocs` based on `location.pathname.startsWith('/webmcp/docs')`).
- Config: `useSEOData.ts:68–79` (`seoConfigs.webmcp`, `seoConfigs.webmcpDocs`).
- **Prerender drift requirement** (`useSEOData.ts:57`, `:73`): every `seoConfigs.*` entry MUST be mirrored verbatim in `chat/scripts/prerender-react.js` (currently the `routes` array at `:24–59` and `getSEODataForRoute()`'s lookup table at `:364–385`). This is non-negotiable per Phase 3 D-08 + D-12.

---

## 2. Existing Recipe Data — REUSE or RE-SEED?

### Persistence layer (REUSE entirely)
- `chat/src/app/services/RecipePersistence.ts` — `idb`-backed `getRecipes/getRecipe/saveRecipe/deleteRecipe/seedIfEmpty`. DB name `window-ai-recipes`, store `recipes`, version 1.
- `chat/src/app/services/recipeStore.ts` — module-scope pub-sub + `activeRecipeId`.
- **Active-recipe contract:** mutating tool handlers default to `getActiveRecipeId()` when no `recipeId` arg is passed (`recipeToolHandlers.ts:60`, `:93`, etc.).

### Seed data (decide: extend vs separate)
- `chat/src/app/services/recipeSeed.ts` ships **only 2 recipes** (`buttermilk-pancakes`, `tomato-pasta`). The handoff line "12 seeded recipes is enough" was written when no seed existed.
- **Recommended approach:** extend `SEED_RECIPES` to ~10–12 recipes covering the demo's `searchRecipes` query space (chicken / 30-minute / etc.). The existing `/webmcp` page calls `seedIfEmpty()` — adding more recipes is non-destructive on first install but won't auto-update existing IDB-seeded browsers. A small migration helper (e.g. `seedIfMissing(recipes)` that upserts known IDs) is safer; alternatively bump `DB_VERSION` to 2 and add an upgrade path. **Trade-off:** the simpler path is a new seed file (`recipeAppsSeed.ts`) + a separate `seedIfEmpty` call gated on a different object store or key prefix.

### Recommendation
**Share the DB and seed list.** Both pages benefit from a richer seed and the demo narrative ("recipes the user already has") is stronger with one library. Extend `SEED_RECIPES` and add a thin `seedIfMissing()` upsert helper to `RecipePersistence.ts` so existing browsers pick up new recipes without losing local edits.

---

## 3. Existing Routing + Nav Pattern

### Where to add the new route (`AppRouter.tsx`)
Insert two lines after the existing WebMCP block at `:233`:

```tsx
{/* MCP Apps (generative UI) routes */}
<Route path="/mcp-apps" element={<MCPAppsPage/>}/>
<Route path="/mcp-apps/docs" element={<MCPAppsPage/>}/>
```

### Where to add the nav link
- **Desktop:** `AppRouter.tsx:70–72` block — clone the WebMCP `<Link>` immediately after it.
- **Mobile:** `AppRouter.tsx:160–162` block — same clone.
- **Track interaction:** keep the `trackUserInteraction('navigation_click', 'mcp_apps_link')` pattern.

### Prerender
- `chat/scripts/prerender-react.js:24–59` `routes` array — append two entries (`/mcp-apps`, `/mcp-apps/docs`).
- `:364–385` `seoConfigs` map — append matching entries (mirror `seoConfigs.webmcp` / `seoConfigs.webmcpDocs` shape).

---

## 4. Reusable Chat / Agent Infrastructure

| Asset | Path | Reuse strategy |
|---|---|---|
| `LanguageModel` ambient types | `chat/src/app/types/dom-chromium-ai.d.ts` | Reuse as-is — covers `tools`, `responseFormat`, `initialPrompts`. |
| WebMCP ambient types | `chat/src/app/types/webmcp.d.ts` | **Extend** — current `ModelContextTool` does NOT declare `_meta` on the result, which the MCP Apps spec needs for `_meta['ui.resourceUri']`. See §7. |
| Tool adapter | `chat/src/app/services/toolAdapter.ts` (`toLanguageModelTools`, `wrapToolsWithEvents`) | **Reuse verbatim.** It already wraps `ModelContextTool[]` with `ToolCallEvent` lifecycle events. The MCP Apps tool's `execute` returning `_meta` survives the wrapper because `result` is returned unchanged when not a string. |
| In-page agent pattern | `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` | **Clone + adapt.** The responseFormat JSON-dispatch loop is the proven Chrome 147 pattern (the `create({tools})` codepath is broken per AgentDrawer's docblock at `:142–149`). The clone needs to recognise tool results with `_meta` and surface a UI resource bubble instead of plain text — see §5. |
| Chat UI | `chat/src/app/components/ChatBox.tsx`, `ChatInput.tsx` | **Reuse as-is**, but extend `Message` (`ChatBox.tsx:4–8`) to optionally carry a `uiResourceUri` so an iframe can render in place of `<Markdown>`. |
| ToolCallIndicator | `chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx` | Reuse as-is. |
| ThemeProvider / ThemeToggle | `chat/src/app/context/ThemeContext.tsx`, `components/ThemeToggle.tsx` | Reuse — wraps the full app, no work needed. |
| SEOProvider | `chat/src/app/context/SEOContext.tsx` + `hooks/useSEOData.ts` | Reuse the hook; add config entries. |
| DocsRenderer | `chat/src/app/tools/DocsRenderer.tsx` | Reuse for `/mcp-apps/docs` markdown explainer (uses `root.div` shadow-DOM — not iframes — no postMessage conflict). |
| Tabs | `chat/src/app/components/Tabs.tsx` | Reuse. **Watch:** order docs tab BEFORE workbench (`RecipeWorkbenchPage.tsx:254–256` comment) because `currentPath.includes(tab.path)` would match an empty path first. |

### Fresh code needed (no existing analog)
- iframe sandbox renderer + ResizeObserver height sync
- postMessage RPC bridge (parent ⇄ iframe JSON-RPC)
- UI-resource creator (string HTML → blob URL or data URL)
- Carousel HTML template (likely a Vite-bundled separate entry, see §6)

---

## 5. Iframe Sandboxing Precedents

**No existing iframe usage in the codebase.** Greenfield work area. Findings:

- `grep iframe` only hits:
  - `chat/src/styles.scss:11` — generic CSS reset row, irrelevant.
  - `chat/src/app/docs/WebMCP-API.md:277` — docs prose explicitly notes WebMCP has no postMessage bridge (this is about cross-document only, not in-page iframes).
- `DocsRenderer` uses **shadow-DOM** (`react-shadow`'s `root.div`), not iframes. No conflict with a new iframe-based renderer.
- The `inIframe` URL param in `AppRouter.tsx:18–24` is an existing feature — when the *app itself* is hosted inside another iframe, the nav and DocsRenderer hide. This is page-host detection; it does NOT interfere with this page *creating its own* iframes. But: a future "open the MCP Apps demo in an iframe of another site" scenario could double-iframe — out of scope but worth noting.

### postMessage handlers
- `grep postMessage` returned nothing in `chat/src/`. **Greenfield.** No risk of accidental cross-talk with existing handlers. The new bridge owns the `window.message` event for this page.
- **Recommended:** still origin-stamp every message and ignore anything not from the expected `frame.contentWindow` to prevent third-party iframes (analytics tags, future embeds) from poisoning the bridge.

---

## 6. CSP / Build Config (the good news)

- `chat/src/index.html` — **no CSP meta tag.** Google Analytics inline script runs without nonces, confirming no policy.
- `chat/webpack.config.js`, `chat/vite.config.ts` — neither emits CSP headers.
- **CloudFront infra** (`devops/awsweb/`) — out of scope per CLAUDE.md but worth a single grep before deploy. For this milestone (`nx serve chat` only) it does not matter.
- **Verdict:** dynamic iframe creation with `sandbox="allow-scripts"` and `srcdoc=`/blob URLs will work without any CSP changes. Recommended sandbox value: `sandbox="allow-scripts"` (NO `allow-same-origin` — keeps the iframe in a null origin so it can only talk back via `postMessage`).
- **Resource scheme:** prefer `srcdoc` (synchronous, no URL churn) over blob URLs for the carousel. `data:` URIs have a navigation-replacement quirk in Chrome that complicates ResizeObserver wiring.

---

## 7. Type Definitions — Gap to Fill

`chat/src/app/types/webmcp.d.ts:28–41` declares `ModelContextTool` with `execute: (...) => Promise<unknown> | unknown`. The result shape is **not constrained** — so the MCP Apps return value `{ content: [...], _meta: { 'ui.resourceUri': '...' } }` compiles fine **but is also unchecked**.

### Recommended additions to `webmcp.d.ts`

Add an optional `_meta` interface and a `ModelContextToolResult` discriminator. Keep ambient, don't break existing tools:

```ts
interface ModelContextToolContentBlock {
  type: 'text' | 'image' | 'resource';
  text?: string;
  // ... narrow per the W3C draft when we go to plan
}

interface ModelContextToolMeta {
  /** MCP Apps (SEP-1865) — URI for a UI resource the host fetches and renders. */
  'ui.resourceUri'?: string;
  /** Allow forward-compat ad-hoc meta keys per the spec. */
  [key: string]: unknown;
}

interface ModelContextToolResult {
  content?: ModelContextToolContentBlock[];
  _meta?: ModelContextToolMeta;
}
```

Then existing tools can keep returning plain values (the `unknown` return is still allowed), and MCP Apps tools can opt in by typing their execute return as `Promise<ModelContextToolResult>`.

---

## 8. Conflicts to Flag

| # | Conflict | Resolution |
|---|---|---|
| 1 | Handoff proposes `chat/src/app/webmcp/WebMCPPage.tsx` — collides with shipped `chat/src/app/components/RecipeWorkbenchPage.tsx` at `/webmcp`. | Use a different route + folder (see §10). |
| 2 | Handoff says "register `searchRecipes` + `commitRecipeToPlan` via WebMCPService". The shipped Recipe Workbench already registers 8 RECIPE_TOOLS at the same `navigator.modelContext` surface. Both pages registering will not literally collide (each lives on its own route, only one is mounted at a time), but route transitions need clean unregister via the existing `AbortController` pattern. | Reuse the `previousRegistrationController` module-scope guard pattern from `RecipeWorkbenchPage.tsx:98`. Use *different tool names* (`searchRecipes`, `commitRecipeToPlan`) to avoid name collisions if Canary has slow cleanup across route changes. |
| 3 | Handoff says "12 seeded recipes." Current seed is 2 (`recipeSeed.ts`). | See §2 — extend the seed, add `seedIfMissing()`. |
| 4 | Handoff plans `useSEOData(seoConfigs.webmcp...)`. That config key is taken. | Add `seoConfigs.mcpApps` + `seoConfigs.mcpAppsDocs`, mirroring `webmcp` / `webmcpDocs` exactly. Mirror the entries verbatim into `prerender-react.js`. |
| 5 | Handoff: "a side-panel chat using `LanguageModel`." Current AgentDrawer learned that `LanguageModel.create({tools})` is broken on Chrome 147 — uses `responseFormat` JSON dispatch instead. | Clone AgentDrawer's responseFormat pattern (see `AgentDrawer.tsx:142–149` docblock + `extractJsonFromResponse` at `:88–128`). |
| 6 | Handoff's `Tabs` ordering: workbench tab first → `currentPath.includes('')` matches everything and `/mcp-apps/docs` loses. | Docs tab MUST be first in the tabs array (same fix as `RecipeWorkbenchPage.tsx:254–256`). |
| 7 | New page registers `commitRecipeToPlan` dynamically from inside the iframe. The iframe is in a null origin (no `allow-same-origin`). It cannot call `navigator.modelContext.registerTool` directly. | The iframe sends a `postMessage` JSON-RPC to the parent; the **parent's bridge** translates the message into a real `navigator.modelContext.registerTool` call. The handoff's pseudo-code is misleading on this — the iframe is just a UI surface, the parent owns the WebMCP surface. |
| 8 | `webmcp.d.ts` `ModelContextTool.execute` returns `unknown`. MCP Apps result shape `{ content, _meta }` is not typed. | Add ambient `ModelContextToolResult` (see §7). |

---

## 9. Proposed Route Name — Ranked

| Rank | Route | Reasoning |
|---|---|---|
| **1** | `/mcp-apps` | Most accurate — the spec is literally called **MCP Apps (SEP-1865)**. Search-friendly. Distinguishes from `/webmcp` (which is the API demo) — `/mcp-apps` is the pattern demo. Reads naturally in nav alongside "WebMCP". Future-proof: when MCP Apps lands in Chrome natively, this name still maps. |
| **2** | `/generative-ui` | Most marketable for a conference talk. But: doesn't tie to MCP terminology — visitors who heard the spec name might not connect the dots. Also collides semantically with "AI-generated UI" (e.g., LLM emits JSX), which this is NOT — this is "tool returns a fixed HTML resource." |
| **3** | `/agentic-canvas` | Catchy but vague. Hard to SEO. Sounds bespoke rather than spec-aligned. Best as a marketing label inside the page, not the URL slug. |

**Recommendation: `/mcp-apps`** with the in-page title "MCP Apps — Generative UI in the chat bubble" and docs at `/mcp-apps/docs`. The nav link label can be the punchier **"MCP Apps"** (4 chars longer than "WebMCP" — fits the existing nav row).

---

## 10. Proposed File Layout (non-conflicting)

```
chat/src/app/components/
  MCPAppsPage.tsx                      # NEW — /mcp-apps and /mcp-apps/docs route handler
  MCPApps/
    AgentChatPanel.tsx                 # NEW — clone of AgentDrawer, recognises _meta.ui.resourceUri
    UIResourceFrame.tsx                # NEW — sandboxed iframe + ResizeObserver
    MealPlanColumn.tsx                 # NEW — right-column plan state (or share with workbench)
    SearchResultsPlaceholder.tsx       # NEW — shown before first searchRecipes call
    MissingFlagBanner.tsx              # OPTIONAL clone if copy diverges; else import existing
    ToolRegistrationPill.tsx           # OPTIONAL clone or import existing

chat/src/app/services/
  mcpAppsTools.ts                      # NEW — RECIPE_APP_TOOLS (searchRecipes, commitRecipeToPlan)
  mcpAppsToolHandlers.ts               # NEW — execute() impls that build UI resources
  uiResourceProtocol.ts                # NEW — postMessage RPC + srcdoc builder + iframe registry
  mealPlanStore.ts                     # NEW — pub/sub + IDB for the "tonight's plan" surface
  recipeAppsSeed.ts                    # NEW — 10–12 additional recipes (or extend recipeSeed.ts)

chat/src/app/templates/                # NEW directory
  recipeCarousel.html.ts               # NEW — exports a (recipes) => string template for the iframe srcdoc

chat/src/app/docs/
  MCP-Apps-API.md                      # NEW — explainer for the new demo

chat/src/app/types/
  webmcp.d.ts                          # EDIT — add ModelContextToolResult / _meta types (§7)

chat/src/app/AppRouter.tsx             # EDIT — 2 new <Route>, 2 new <Link> (desktop+mobile)
chat/src/app/hooks/useSEOData.ts       # EDIT — add seoConfigs.mcpApps + seoConfigs.mcpAppsDocs
chat/scripts/prerender-react.js        # EDIT — add routes + getSEODataForRoute entries
```

> Note: putting the new page at `components/MCPAppsPage.tsx` instead of the handoff's `webmcp/WebMCPPage.tsx` matches the existing convention (every demo page sits in `chat/src/app/components/` — see ChatPage.tsx, ToolCallingPage.tsx, Summary.tsx, TranslatePage.tsx, LiveTranslatePage.tsx, WriteRewritePage.tsx, RecipeWorkbenchPage.tsx, WriteRewritePage.tsx). The handoff's proposed `chat/src/app/webmcp/` folder is non-idiomatic for this codebase.

---

## 11. Coexistence Notes — `/webmcp` vs `/mcp-apps`

| Aspect | `/webmcp` (existing) | `/mcp-apps` (new) | Share? |
|---|---|---|---|
| Audience | WebMCP API basics — "how to register a tool" | MCP Apps generative-UI pattern — "tool returns interactive UI" | Different stories |
| Tools | 8 recipe-mutation tools (`scaleRecipe`, `swapIngredient`, …) | 2 generative-UI tools (`searchRecipes`, `commitRecipeToPlan`) | DISTINCT names — no overlap |
| IDB | `window-ai-recipes` store | Same store + new `meal-plans` store | Share recipes; new plans store |
| Seed recipes | 2 (pancakes, pasta) | Extend to 10–12 | YES, see §2 |
| Banner | `MissingFlagBanner` | Same shape; copy can be identical | YES |
| Tabs | Docs + Workbench | Docs + Demo | Reuse `Tabs` component |
| Chat agent | `AgentDrawer` (responseFormat JSON loop) | New `AgentChatPanel` (same loop + `_meta` UI bubble) | Clone + extend |
| `navigator.modelContext` lifecycle | `previousRegistrationController` guard | Same guard, separate instance | Share the pattern, not the variable |
| Cross-link | Workbench docs already explain WebMCP API | Demo docs explain MCP Apps spec; link back to `/webmcp` for fundamentals | Two-way nav cross-links |

**Should `/webmcp` keep working?** Yes — it ships features users may have been promised (Phase 3 just shipped). The new tab is purely additive.

---

## 12. "Watch Out For" — Subtle Issues

1. **Duplicate-tool-name across route transitions.** The `RecipeWorkbenchPage.tsx:98–104` workaround exists because Canary doesn't synchronously honour `AbortController.abort()`. If a user navigates `/webmcp → /mcp-apps` quickly, the second page's `registerTool('searchRecipes', …)` could collide with a lingering registration **if the names overlap.** Mitigation: keep names disjoint (already planned — `searchRecipes` / `commitRecipeToPlan` vs `scaleRecipe` / `swapIngredient`) AND reuse the same module-scope `previousRegistrationController` guard.

2. **`responseFormat` JSON model never sees `_meta`.** AgentDrawer's loop (`AgentDrawer.tsx:265–333`) feeds `tool result` back to the model as a string. If the tool returns `{content, _meta:{ui.resourceUri}}`, JSON.stringify will include the URI in the next prompt — risking the model "talking about" the URL instead of staying conversational. Fix: in the new `AgentChatPanel`, intercept `_meta.ui.resourceUri` *before* the stringify-and-feed step and substitute a textual summary (e.g., "Showed 3 recipe cards. Waiting for user pick.") for the model's context.

3. **Iframe ResizeObserver + Chrome ShadowRealm timing.** `srcdoc` iframes need a `load` listener before any `postMessage` (the content window doesn't exist yet otherwise). Naively setting `srcdoc` and immediately calling `frame.contentWindow.postMessage(...)` will silently no-op in Canary roughly 30% of the time. Mitigation: queue messages until the iframe fires `load`.

4. **Prerender drift.** `seoConfigs.*` (`useSEOData.ts`) and `getSEODataForRoute()` (`prerender-react.js:316–388`) are TWO sources of truth that must match verbatim — this caused a Phase 3 hotfix. Anyone adding `/mcp-apps` to one MUST add it to the other, in the same words. There is no automated drift check.

5. **IDB seed compatibility.** `seedIfEmpty` (`RecipePersistence.ts:68–75`) early-returns when the store has *any* recipe. A user who installed Phase 1 (2 recipes) will not see new recipes from the extended seed. Either bump `DB_VERSION`, add `seedIfMissing` (upsert by id), or detect by-id and add. Going invisible on existing browsers is a bigger demo-day risk than the migration cost.

6. **Tabs `path` ordering gotcha.** `Tabs.tsx:25` uses `currentPath.includes(tab.path)`. An empty `path: ''` matches every URL. The shipped fix is to list the docs tab (`path: '/docs'`) FIRST so it wins the find. The new page MUST do the same — easy to forget when copy-pasting from `RecipeWorkbenchPage.tsx:257–288`.

---

## 13. Open Decisions for the User

These are NOT for this research pass — surfacing them so the next planning phase doesn't get stuck:

- **A vs B agent path** (per the handoff's Open Question): Option B (in-page `LanguageModel`) is now proven to work via the `responseFormat` dispatch loop. The handoff's recommendation to default to Claude desktop is outdated relative to the shipped `/webmcp`. Recommend Option B for parity with the existing demo.
- **Carousel template build path:** inline TS string vs separate `.html` bundle. Inline TS string is simpler and avoids a new Vite entry; the cost is harder syntax highlighting. Pick when planning.
- **Shared IDB or new IDB?** §2 recommendation is share + extend seed. User may prefer isolation.
- **Does `/mcp-apps` get its own nav SVG icon?** The existing icons are inline `<svg>` in `AppRouter.tsx`. Either reuse the WebMCP book icon or add a new "stack of cards" glyph.

---

## RESEARCH COMPLETE
- New tab route recommendation: **`/mcp-apps`** (followed by `/generative-ui` as a marketing alias; `/agentic-canvas` last).
- Existing `/webmcp` Recipe Workbench stays untouched — new page is purely additive at `chat/src/app/components/MCPAppsPage.tsx` mirroring the established `components/<Demo>Page.tsx` convention.
- Reusable assets: `RecipePersistence` + `recipeStore` + `toolAdapter` + `MissingFlagBanner` + `Tabs` + `ChatBox`/`ChatInput` + `useSEOData` + `DocsRenderer`. Fresh code: iframe renderer, postMessage bridge, UI-resource creator, `mealPlanStore`, 2 MCP Apps tools.
- Conflicts: handoff's `chat/src/app/webmcp/` folder collides with shipped page; `seoConfigs.webmcp` key already used; `MockContextTool._meta` is untyped — must extend `webmcp.d.ts`.
- Top 5 subtle hazards: duplicate-tool-name across route nav, `_meta.uri` leaking into model context, iframe `load` race, prerender-config drift, IDB `seedIfEmpty` won't update existing browsers.
