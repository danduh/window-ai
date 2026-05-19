# Phase 5: MCP Apps Host — Sandboxed iframe + postMessage bridge — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 lands the SEP-1865 MCP Apps host runtime on `/generative-ui` in standalone (no-chat) form. Deliverables:
1. A double-iframe sandbox renderer in a chat-bubble container
2. A JSON-RPC over postMessage bridge implementing `ui/initialize`, `ui/notifications/size-changed`, `ui/notifications/host-context-changed`, and `tools/call` proxy
3. A developer "Show demo carousel" trigger button in the left column that generates carousel HTML server-side (page-side, not iframe-side) and renders it through the host stack
4. A stub `commitRecipeToPlan` tool registered via `navigator.modelContext.registerTool` so the tool-call round-trip is real and observable end-to-end (clicking "Pick" inside the iframe mutates the `MealPlanStore` and the right-column MealPlanColumn re-renders)

Out of scope for this phase: in-page chat panel (Phase 6), `searchRecipes` tool registration (Phase 6), `visibility:["app"]` annotation on `commitRecipeToPlan` (Phase 6 GENUI-05), MissingFlagBanner already exists from Phase 4, MissingChromeAI distinction (not in scope), docs route + markdown (Phase 7), 90s demo polish + zero-network kicker (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Sandbox + iframe rendering strategy
- **Resource scheme:** `srcdoc` (synchronous inline HTML). The host generates the full HTML document and assigns it to `<iframe srcdoc="...">`. No blob URLs, no data URIs, no external fetches.
- **Double-iframe pattern per SEP-1865:** the React component renders an OUTER `<iframe sandbox="allow-scripts allow-same-origin">` whose `srcdoc` contains a minimal shell HTML document that itself renders an INNER `<iframe sandbox="allow-scripts">` carrying the actual recipe-card content via its own `srcdoc`. The inner iframe lives in a null origin so user-content has no DOM access to the outer host; the outer iframe shell carries the bridge JS and relays messages.
- **CSP baseline:** the inner iframe's `srcdoc` document begins with `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">`. `'unsafe-inline'` is necessary because srcdoc has null origin (no nonce source available). When `_meta.ui.csp.*` allowlists are present in future phases, they are appended additively.
- **Height sync:** the iframe's inline script attaches a `ResizeObserver(document.documentElement)`, debounces 50ms, then posts `{ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: <px> } }`. The host receives this and writes `outerIframe.style.height = '<px>px'` directly. The host never posts back about height, so no feedback loop is possible.
- **Default initial height:** 320px (matches one card row); grows on first ResizeObserver fire after content paints.

### JSON-RPC bridge protocol
- **Wire format:** JSON-RPC 2.0. Requests carry `id`, responses match by `id`, notifications omit `id`. Host maintains `Map<id, { resolve, reject, timer }>` for outstanding requests; default request timeout 5s (configurable).
- **Origin validation:** strict `event.source === innerIframe.contentWindow` check on every inbound message. `event.origin` is `"null"` for sandboxed iframes — skipping origin allowlist is correct; the source-equality check is the canonical guard.
- **Pre-`load` outbound queue:** host maintains a `pendingOutbound: any[]` array. Until the iframe fires its `load` event, all outbound posts (`ui/notifications/host-context-changed`, future host-initiated messages) are pushed to the queue. On `load`, the host flushes the queue in FIFO order via `iframe.contentWindow.postMessage(msg, '*')`. Mitigates STATE.md risk: "Iframe `load` race in Chrome 146 Canary — `srcdoc` + immediate `postMessage` silently no-ops ~30% of the time".
- **Handshake protocol:** within 1s of iframe `load`, the iframe MUST send `ui/initialize` (a request). The host responds with `{ hostInfo: { name, version, mcpVersion: '2026-01-26' }, hostContext: { theme: 'dark'|'light', displayMode: 'inline', dimensions: { maxWidth, maxHeight } } }`. The iframe then sends `ui/notifications/initialized` (notification). If the host doesn't receive `ui/initialize` within 1000ms of `load`, it renders an inline "Couldn't load app — reload" error UI in the chat-bubble container and logs to console.
- **Inbound message types handled by the host:**
  - `ui/initialize` (request) → respond with hostInfo + hostContext
  - `ui/notifications/initialized` (notification) → record handshake complete
  - `ui/notifications/size-changed` (notification) → resize outer iframe
  - `tools/call` (request) → proxy to `navigator.modelContext` tool registry, return result
- **Outbound message types sent by the host:**
  - `ui/notifications/host-context-changed` (notification) → fired when `ThemeContext` toggles dark mode
  - Response to `ui/initialize` (response)
  - Response to `tools/call` (response or error)

### Phase 5 scope boundaries (debug trigger + tool wiring)
- **Debug trigger UI:** replace `ChatPlaceholder.tsx` from Phase 4 with a variant that adds a small button "Show demo carousel" beneath the existing empty-state copy. Clicking the button calls a local `searchRecipesLocal()` helper (page-side, not via `navigator.modelContext` yet) returning the 12 recipes from `RecipePersistence.getRecipes()`, then mounts a `<UIResourceFrame>` component with `renderCarouselHTML(recipes)` inline below the button. **No chat panel.** Phase 6 replaces this trigger with the chat-driven `searchRecipes` tool flow.
- **Tool registration for round-trip:** on `/generative-ui` page mount, register a stub `commitRecipeToPlan` tool via `navigator.modelContext.registerTool`. Signature: `{ name: 'commitRecipeToPlan', description: 'Add a recipe to the current meal plan', inputSchema: { type: 'object', properties: { recipeId: { type: 'string' }, servings: { type: 'number' } }, required: ['recipeId'] } }`. Handler calls `MealPlanStore.addToPlan({ id: crypto.randomUUID(), recipeId, addedAt: Date.now(), servings })` and returns `{ content: [{ type: 'text', text: 'Added to plan' }] }`. **No `visibility:["app"]` annotation yet** — Phase 6 (GENUI-05) adds that. Tools register on mount, abort on unmount via the existing `AbortController` pattern mirrored from `RecipeWorkbenchPage.tsx:164–228`.
- **Carousel HTML generation:** new helper `renderCarouselHTML(recipes: Recipe[]): string` in `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts`. Returns a complete self-contained HTML document with `<!DOCTYPE html>`, inline `<style>` (a small Tailwind utility subset extracted manually — flex, grid, padding, border, rounded, text colors, dark-mode media query), inline `<script>` containing the bridge JS, and the recipe data baked into the HTML as static `<div class="recipe-card" data-recipe-id="...">` elements. Each card has a "Pick" button with `data-recipe-id` attribute; the bridge JS attaches a delegated click handler that issues a JSON-RPC `tools/call` for `commitRecipeToPlan`.
- **Chat-bubble container:** new component `chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx`. Wraps children in a Tailwind card: `rounded-2xl`, `max-w-2xl`, `bg-white dark:bg-zinc-800`, `border border-gray-200 dark:border-zinc-700`, `shadow-sm`, `p-2`. Hosts the `UIResourceFrame` (which renders the iframe). Phase 6 reuses this component verbatim for chat-message-borne resources.
- **Theme propagation:** read `useTheme()` from `ThemeContext`; on theme change, fire `ui/notifications/host-context-changed` with the new theme value. The iframe's inline script listens and toggles a `data-theme` attribute on `<html>`; the inline `<style>` block uses `[data-theme="dark"]` selectors for dark variants (rather than `prefers-color-scheme` media query, since sandboxed iframes don't inherit the parent's color scheme).

### Module/file layout (under GenerativeUI/)
- `chat/src/app/components/GenerativeUI/UIResourceFrame.tsx` — React component that renders the outer iframe, manages the bridge lifecycle, exposes `onToolCallComplete` callback for Phase 6 to wire chat messages
- `chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx` — visual wrapper
- `chat/src/app/components/GenerativeUI/iframe/bridge.ts` — JSON-RPC protocol types + host-side bridge class (`createUIResourceBridge({ iframe, tools: navigator.modelContext })`)
- `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts` — `renderCarouselHTML(recipes): string` helper (with inline CSS + inline bridge JS for the iframe side)
- `chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts` — the iframe-side bridge JS as a string template (read by carouselTemplate.ts; kept separate for testability / readability)
- `chat/src/app/services/genUITools.ts` — `GEN_UI_TOOLS` array exporting the stub `commitRecipeToPlan` (will gain `searchRecipes` in Phase 6); registration helper `registerGenUITools(): AbortController` mirroring v1.0 `recipeTools.ts`
- Update `chat/src/app/components/GenerativeUIPage.tsx` — call `registerGenUITools()` on mount, abort on unmount (parallel to seedIfMissing effect)
- Update `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` — add "Show demo carousel" button + UIResourceFrame slot beneath the existing empty-state copy

### Claude's Discretion
- Exact button copy on the debug trigger ("Show demo carousel" or "Try the demo carousel" — planner picks; UI-SPEC may lock copy)
- Exact recipe card layout inside the iframe (horizontal scroll vs grid vs stacked) — the criterion just says "carousel"; planner picks something visually plausible (recommend horizontal scroll-snap row on desktop, vertical stack on mobile)
- Exact subset of Tailwind utilities extracted for the iframe `<style>` block — planner picks based on what the chosen card layout needs
- Error-UI styling when handshake times out — planner picks a minimal warning card (red border + retry button or just text)
- Whether `genUITools.ts` lives directly under `services/` or under a `services/genUI/` subdir — planner picks; aesthetics only
- Whether to use a `BroadcastChannel` for theme propagation (no — direct postMessage is simpler and the iframe is in-process)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/components/GenerativeUIPage.tsx` (Phase 4 output) — extend with `registerGenUITools()` mount effect; the existing seedIfMissing effect pattern is the template to mirror
- `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` (Phase 4 output) — extend with the demo trigger button + UIResourceFrame slot. The current empty-state copy stays as the upper portion.
- `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (v1.0) — the **wrapper hook** style for managing AbortController lifecycle; mirror its mount/unmount shape
- `chat/src/app/components/RecipeWorkbenchPage.tsx:164–228` (v1.0) — the canonical `navigator.modelContext.registerTool` mount effect: module-scope `previousRegistrationController`, `DUPLICATE_NAME_PATTERN` regex, per-tool try/catch, `wrapToolsWithEvents` from `toolAdapter.ts`. **Mirror this pattern for genUITools.ts.**
- `chat/src/app/services/toolAdapter.ts` (v1.0) — `wrapToolsWithEvents()` already exists; reuse to emit `ToolCallEvent`s when the stub tool fires (UI feedback bonus)
- `chat/src/app/services/MealPlanStore.ts` (Phase 4 output) — `addToPlan(entry)` is the side-effect target for the stub `commitRecipeToPlan` handler
- `chat/src/app/services/RecipePersistence.ts` (Phase 4 output) — `getRecipes()` for the debug trigger's local `searchRecipesLocal()` helper
- `chat/src/app/types/webmcp.d.ts` (v1.0) — ambient `navigator.modelContext` types; will need a small extension for the optional `_meta` on tool results (per `codebase-integration-map.md` §7) — though Phase 5's stub tool doesn't return `_meta` yet, Phase 6 does
- `chat/src/app/context/ThemeContext.tsx` (v1.0) — `useTheme()` exposes `theme` and `setTheme`; the host bridge reads `theme` and posts `host-context-changed` when it changes

### Established Patterns
- Module-scope pub-sub for cross-component reactivity (`recipeStore.ts`, `MealPlanStore.ts`) — used by `useMealPlan()` which the MealPlanColumn already consumes. The stub `commitRecipeToPlan` handler hits `MealPlanStore.addToPlan` and the column re-renders automatically.
- `AbortController` for batched tool registration cleanup (W3C spec has no `unregisterTool`; the controller's `abort()` unregisters the whole batch atomically)
- TS strict, no `any`, no `as any` at API boundaries — the bridge types live in `chat/src/app/components/GenerativeUI/iframe/bridge.ts` as `JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcNotification`, `UIInitializeParams`, `UIInitializeResult`, etc.
- Tailwind v4 with `dark:` variants throughout. The OUTER React component uses Tailwind normally; the INNER iframe needs its own inlined CSS subset because srcdoc can't load `tailwind.css`.
- StrictMode-safe useEffect via `cancelled` flag — already used in GenerativeUIPage's seedIfMissing effect; mirror for the tool registration effect.

### Integration Points
- `GenerativeUIPage.tsx` mount → call `registerGenUITools()` (parallel to existing `seedIfMissing` effect). On unmount → controller.abort().
- `ChatPlaceholder.tsx` → embeds `<UIResourceFrame>` after the user clicks "Show demo carousel"; the frame component owns the iframe DOM element and bridge instance.
- `MealPlanColumn.tsx` (unchanged from Phase 4) — automatically picks up new entries via its existing `useMealPlan()` subscription
- `ThemeContext.tsx` → `useTheme()` consumed by `UIResourceFrame` so it can fire `host-context-changed`
- `webmcp.d.ts` → may need an additive `ModelContextToolResult` interface for Phase 6; Phase 5 itself doesn't need it because the stub tool returns plain text content. If the planner finds compile errors due to `_meta` typing, add the interface per `codebase-integration-map.md` §7.

</code_context>

<specifics>
## Specific Ideas

- **Verifiable kicker for criterion 5:** after the user clicks "Pick" in the iframe, the meal-plan column on the right of the same page updates within ~100ms (sync IDB write + pub-sub notify). This is what proves end-to-end tool-call round-trip works BEFORE chat is wired — make sure the planner explicitly covers this in must_haves.
- **Console-log breadcrumbs:** every JSON-RPC message in the bridge gets a `console.debug('[mcp-apps:host]', ...)` or `[mcp-apps:iframe]` log so the talk can be dry-run from DevTools. Keep these in dev mode at minimum; final polish in Phase 7 may strip them.
- **Recipe-card carousel layout in iframe:** horizontal scroll-snap row of 3-card-wide cards on desktop (`scroll-snap-type: x mandatory`); vertical stack on mobile (via `@media (max-width: 640px)`). Each card: title, totalMinutes badge, 2-3 ingredient names, "Pick" button.
- **Edge-case to handle:** if `navigator.modelContext` is undefined (no Chrome Canary flag), the `tools/call` proxy must return a JSON-RPC error response so the iframe can show "Tools unavailable" inside the card. The MissingFlagBanner already surfaces this at the page level, but the iframe needs its own graceful handling.
- **Two-tab safety carries from Phase 4:** if user has `/webmcp` and `/generative-ui` open simultaneously, both register tools on the same `navigator.modelContext`. The names are disjoint (`commitRecipeToPlan` vs `scaleRecipe` etc) — no collision. The `previousRegistrationController` guard handles HMR/StrictMode double-mount.
- **The phase is verifiable WITHOUT the chat panel** — that's the whole point of the debug trigger. Phase 6 reuses the same `UIResourceFrame` + `ChatBubbleContainer` + bridge components in a chat-message-borne context.

</specifics>

<deferred>
## Deferred Ideas

- In-page chat panel (Chrome `LanguageModel` responseFormat JSON-dispatch) → Phase 6 (GENUI-09)
- `searchRecipes` tool registration → Phase 6 (GENUI-04)
- `visibility:["app"]` annotation on `commitRecipeToPlan` → Phase 6 (GENUI-05)
- `_meta.ui.resourceUri` interception before model feedback → Phase 6 (GENUI-10)
- `/generative-ui/docs` markdown explainer → Phase 7 (GENUI-13)
- SEO entry update if the page chrome changes meaningfully → Phase 7 if needed
- 90-second demo rehearsal + zero-network kicker → Phase 7 (GENUI-14, GENUI-15)
- External-resource CSP allowlist support (`_meta.ui.csp.connectDomains`, etc.) — not needed for self-contained recipe carousel; future phases if external resources land
- `_meta.ui.permissions.*` enforcement (camera, microphone, geolocation, clipboardWrite) — not needed for recipe demo
- Multi-iframe one-at-a-time policy (carries from STATE.md decision: "one-iframe-at-a-time scope") — Phase 5 should ensure only one UIResourceFrame is mounted at a time; the planner can take a single-slot approach in ChatPlaceholder

</deferred>
