---
phase: "05"
plan: "01"
subsystem: generative-ui/iframe
tags: [mcp-apps, iframe, sandbox, json-rpc, postmessage, sep-1865, webmcp, brownfield]
dependency_graph:
  requires:
    - "04-01: MealPlanStore.addToPlan (PlanEntry API)"
    - "04-01: RecipePersistence.Recipe interface"
    - "chat/src/app/services/toolAdapter.ts: wrapToolsWithEvents"
    - "chat/src/app/types/webmcp.d.ts: ModelContextTool ambient types"
  provides:
    - "chat/src/app/components/GenerativeUI/iframe/bridge.ts: createUIResourceBridge + JSON-RPC types"
    - "chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts: outerShellHTML + innerIframeBridgeScript"
    - "chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts: renderCarouselHTML"
    - "chat/src/app/services/genUITools.ts: GEN_UI_TOOLS + registerGenUITools"
  affects:
    - "05-02: UIResourceFrame.tsx imports createUIResourceBridge, GEN_UI_TOOLS"
    - "05-02: GenerativeUIPage.tsx imports registerGenUITools"
    - "05-02: ChatPlaceholder.tsx imports renderCarouselHTML"
tech_stack:
  added: []
  patterns:
    - "Factory function pattern for bridge (not class — avoids this binding issues in React)"
    - "Pre-load outbound queue (pendingOutbound[]) for srcdoc+postMessage race mitigation"
    - "Module-scope AbortController guard (previousGenUIRegistrationController) for StrictMode safety"
    - "Double-iframe relay via outer shell srcdoc JS (inner→host + host→inner mutually exclusive)"
    - "HTML entity escaping (escapeHtml/escapeAttr) for XSS prevention in carousel srcdoc"
key_files:
  created:
    - "chat/src/app/components/GenerativeUI/iframe/bridge.ts"
    - "chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts"
    - "chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts"
    - "chat/src/app/services/genUITools.ts"
  modified: []
decisions:
  - "Factory function used for createUIResourceBridge (not class) — easier React consumption without this binding"
  - "handleMessage not wired inside factory — component owns window listener lifecycle to avoid StrictMode leaks"
  - "tools/call proxy timer stored in pendingRequests Map so destroy() can clean up in-flight calls"
  - "escapeAttr reused for both HTML attributes and srcdoc double-quote encoding (single-pass, double-quoted attributes)"
  - "innerIframeBridgeScript ResizeObserver attached AFTER handshake completes to avoid spurious size-changed during init"
metrics:
  duration: "9m 42s"
  completed: "2026-05-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
notes_for_plan_05_02:
  imports:
    - from: "chat/src/app/components/GenerativeUI/iframe/bridge.ts"
      identifiers: ["createUIResourceBridge", "UIResourceBridgeOptions", "HostInfo", "HostContext", "HostContextChangedParams"]
      consumer: "UIResourceFrame.tsx"
    - from: "chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts"
      identifiers: ["renderCarouselHTML"]
      consumer: "ChatPlaceholder.tsx (triggers renderCarouselHTML to generate the srcdoc)"
    - from: "chat/src/app/services/genUITools.ts"
      identifiers: ["GEN_UI_TOOLS", "registerGenUITools"]
      consumers:
        - "UIResourceFrame.tsx (passes GEN_UI_TOOLS as tools prop to createUIResourceBridge)"
        - "GenerativeUIPage.tsx (calls registerGenUITools() in useEffect)"
  notes:
    - "UIResourceFrame receives GEN_UI_TOOLS as a tools prop (not imported directly) to stay reusable for Phase 6 searchRecipes"
    - "registerGenUITools returns AbortController | null — caller pattern: const ctrl = registerGenUITools(); return () => ctrl?.abort();"
    - "bridge factory does NOT register window message listener — UIResourceFrame owns: window.addEventListener('message', bridge.handleMessage)"
    - "bridge factory DOES register outerIframe 'load' listener via attachLoadListener() — call this after assigning srcdoc"
---

# Phase 05 Plan 01: MCP Apps Host Foundation — JSON-RPC Bridge Core Summary

**One-liner:** JSON-RPC 2.0 bridge factory, double-iframe relay scripts, carousel HTML generator, and commitRecipeToPlan stub tool — the complete foundational layer for the SEP-1865 MCP Apps host runtime.

## What Was Built

Four new files providing the foundational non-visual layer for Plan 05-02's React component wiring:

### `bridge.ts` — JSON-RPC types + host-side bridge factory

Exports the full SEP-1865 type surface (12 interfaces: `JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcNotification`, `JsonRpcError`, `UIInitializeParams`, `UIInitializeResult`, `HostInfo`, `HostContext`, `HostContextChangedParams`, `SizeChangedParams`, `ToolsCallParams`, `ToolsCallResult`) plus `RPC_ERROR` const and `createUIResourceBridge` factory.

Factory behavior:
- Pre-load outbound queue (`pendingOutbound[]`) — flushes FIFO on iframe `load` event
- 1000ms handshake timer (`handshakeTimeoutMs`) — fires `onHandshakeTimeout` if no `ui/initialize` received
- Strict origin guard: `event.source === outerIframe.contentWindow` on every inbound message
- Handles: `ui/initialize` (responds with hostInfo + hostContext), `ui/notifications/initialized` (clears timer), `ui/notifications/size-changed` (calls `onSizeChanged`), `tools/call` (async proxy via injected `tools` option)
- `sendHostContextChanged`: queues or sends `ui/notifications/host-context-changed` notification
- `destroy()`: idempotent cleanup of timers, pending requests, and queue
- No React imports, no DOM mutation outside `postMessage`, no `any` at API surface

### `iframeBridgeScript.ts` — outer shell + inner iframe bridge as string exports

`outerShellHTML`: complete outer iframe srcdoc with two mutually exclusive relay listeners (inner→host, host→inner). Inner iframe has `sandbox="allow-scripts"` only (no `allow-same-origin`). Contains `__INNER_SRCDOC__` placeholder for substitution by `carouselTemplate.ts`.

`innerIframeBridgeScript`: IIFE covering:
- `sendRequest`/`sendNotification` helpers with pending-request map and 5s timeouts
- `ui/initialize` sent on DOMContentLoaded → response sets `data-theme` → `ui/notifications/initialized` sent
- `ui/notifications/host-context-changed` listener sets `data-theme` on `<html>`
- `ResizeObserver(document.documentElement)` with 50ms debounce → `ui/notifications/size-changed`
- Delegated click on `.pick-btn[data-recipe-id]` → `tools/call` for `commitRecipeToPlan` → "Added!" / "Tools unavailable" states

### `carouselTemplate.ts` — double-iframe HTML generator

`renderCarouselHTML(recipes: Recipe[]): string` — builds inner HTML with:
- CSP meta: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:`
- Complete locked CSS subset from 05-UI-SPEC.md: CSS custom properties (`:root`/`[data-theme="dark"]`), body reset, `.carousel`/`.card`/`.card-title`/`.badge`/`.ingredients`/`.pick-btn` (+ pseudo variants), mobile `@media (max-width:639px)` stack
- HTML-escaped recipe cards via `escapeHtml`/`escapeAttr` helpers
- Injects `innerIframeBridgeScript` inline
- Substitutes inner HTML into `outerShellHTML.__INNER_SRCDOC__` with `escapeAttr` encoding

### `genUITools.ts` — stub tool + lifecycle registration helper

`GEN_UI_TOOLS`: single `commitRecipeToPlan` entry. No `visibility:["app"]` (Phase 6). No `searchRecipes` (Phase 6). Handler calls `MealPlanStore.addToPlan({ id: crypto.randomUUID(), recipeId, addedAt: Date.now(), servings })`.

`registerGenUITools()`: mirrors `RecipeWorkbenchPage.tsx:164-228` with its OWN module-scope `previousGenUIRegistrationController` guard (different name prevents cross-page collision with `/webmcp`'s guard). Returns `AbortController | null` (null if `navigator.modelContext` unavailable).

## Deviations from Plan

None - plan executed exactly as written.

Minor implementation choices within Claude's discretion:
- **[Planner discretion] Factory function vs class for bridge**: chose factory function per plan guidance ("factory function returning a stateful object rather than a class — easier to consume from React without `this` binding")
- **[Planner discretion] tools/call timer in pendingRequests Map**: after posting the async response, the timer reference is stored in `pendingRequests` so `destroy()` can clean it up. This was needed to handle cleanup of in-flight tool calls on unmount.
- **[Planner discretion] ResizeObserver after handshake**: inner iframe attaches ResizeObserver inside the `ui/initialize` `.then()` handler (after handshake completes) to avoid spurious size-changed notifications during initialization.

## Known Stubs

`commitRecipeToPlan` in `genUITools.ts` is intentionally a stub per the plan:
- No `visibility:["app"]` annotation — Phase 6 GENUI-05 adds this
- Returns a fixed text payload `{ content: [{ type: 'text', text: 'Added to plan' }] }` rather than a rich response
- These are expected stubs per 05-CONTEXT.md scope boundary; Phase 6 resolves them

## Threat Flags

No new threat surface beyond what was planned. The security controls are in place:
- Inner iframe `sandbox="allow-scripts"` only (no `allow-same-origin`)
- `event.source === outerIframe.contentWindow` origin guard
- HTML entity escaping in `renderCarouselHTML` for recipe title/ingredient data

## Self-Check

**Commits exist:**
- 3e930a5: bridge.ts (JSON-RPC types + factory)
- 7a64368: iframeBridgeScript.ts + carouselTemplate.ts
- b289b02: genUITools.ts

**Files exist:**
- chat/src/app/components/GenerativeUI/iframe/bridge.ts ✓
- chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts ✓
- chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts ✓
- chat/src/app/services/genUITools.ts ✓

**Quality gates:**
- npx nx typecheck chat: PASSED
- npx eslint (all 4 files): PASSED (0 errors)
- No `: any` at API surface in any file: PASSED
- No `as any` in any file: PASSED

## Self-Check: PASSED
