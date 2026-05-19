# Phase 5: MCP Apps Host — Sandboxed iframe + postMessage bridge — Research

**Researched:** 2026-05-19
**Domain:** Browser sandboxing, JSON-RPC 2.0 over postMessage, SEP-1865 MCP Apps wire format, React iframe lifecycle
**Confidence:** HIGH (all key decisions are locked in CONTEXT.md; research verifies implementation specifics from the codebase and spec documents)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sandbox + iframe rendering strategy**
- Resource scheme: `srcdoc` (synchronous inline HTML). No blob URLs, no data URIs, no external fetches.
- Double-iframe pattern: React renders OUTER `<iframe sandbox="allow-scripts allow-same-origin">` whose srcdoc contains a shell HTML document that renders INNER `<iframe sandbox="allow-scripts">` carrying the recipe-card content via its own srcdoc.
- CSP baseline for the inner iframe: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">`
- Height sync: ResizeObserver on `document.documentElement`, debounces 50ms, posts `{ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: <px> } }`. Host writes `outerIframe.style.height` directly. No feedback loop.
- Default initial height: 320px.

**JSON-RPC bridge protocol**
- Wire format: JSON-RPC 2.0. Requests carry `id`, responses match by `id`, notifications omit `id`.
- Host maintains `Map<id, { resolve, reject, timer }>` for outstanding requests. Default request timeout 5s.
- Origin validation: strict `event.source === innerIframe.contentWindow` check on every inbound message. `event.origin` is `"null"` for sandboxed iframes — skipping origin allowlist is correct.
- Pre-`load` outbound queue: host queues all outbound posts until iframe fires `load`, then flushes FIFO.
- Handshake: within 1s of iframe `load`, iframe MUST send `ui/initialize` (request). Host responds with hostInfo + hostContext. Iframe sends `ui/notifications/initialized`. 1000ms handshake timeout → error UI.
- Inbound message types: `ui/initialize`, `ui/notifications/initialized`, `ui/notifications/size-changed`, `tools/call`.
- Outbound message types: `ui/notifications/host-context-changed`, responses to `ui/initialize` and `tools/call`.

**Phase 5 scope boundaries**
- Debug trigger: "Show demo carousel" button in `ChatPlaceholder.tsx` calls `searchRecipesLocal()` (page-side, NOT via `navigator.modelContext`) → mounts `<UIResourceFrame>` with `renderCarouselHTML(recipes)`.
- Tool registration: stub `commitRecipeToPlan` registered via `navigator.modelContext.registerTool` on page mount. Handler calls `MealPlanStore.addToPlan`. No `visibility:["app"]` annotation yet (Phase 6 GENUI-05 adds that).
- One UIResourceFrame slot at a time (single-slot policy, button disables while frame is mounted).

**Module/file layout (locked)**
- `chat/src/app/components/GenerativeUI/UIResourceFrame.tsx`
- `chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx`
- `chat/src/app/components/GenerativeUI/iframe/bridge.ts`
- `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts`
- `chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts`
- `chat/src/app/services/genUITools.ts`
- Modify `chat/src/app/components/GenerativeUIPage.tsx`
- Modify `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx`

### Claude's Discretion
- Exact button copy: locked to "Show demo carousel" (UI-SPEC copywriting contract).
- Card layout: horizontal scroll-snap row desktop, vertical stack mobile (locked by UI-SPEC specifics section).
- Tailwind utilities for iframe: locked by UI-SPEC's Inline CSS Subset table.
- Error UI styling: locked by UI-SPEC's error state spec.
- `genUITools.ts` location: `services/genUITools.ts` (CONTEXT.md locked).
- No BroadcastChannel for theme propagation.

### Deferred Ideas (OUT OF SCOPE)
- In-page chat panel → Phase 6 (GENUI-09)
- `searchRecipes` tool registration → Phase 6 (GENUI-04)
- `visibility:["app"]` annotation on `commitRecipeToPlan` → Phase 6 (GENUI-05)
- `_meta.ui.resourceUri` interception → Phase 6 (GENUI-10)
- `/generative-ui/docs` markdown explainer → Phase 7 (GENUI-13)
- External-resource CSP allowlist support
- `_meta.ui.permissions.*` enforcement
- Multi-iframe one-at-a-time (beyond single-slot) enforcement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GENUI-06 | Sandboxed iframe renderer following SEP-1865 double-iframe pattern — outer `sandbox="allow-scripts allow-same-origin"`, inner `sandbox="allow-scripts"` only; CSP `default-src 'none'` baseline | Findings 1, 2, 3, 4, 9 |
| GENUI-07 | JSON-RPC over postMessage bridge: `ui/initialize` handshake, `ui/notifications/size-changed`, `ui/notifications/host-context-changed`, proxy iframe→page `tools/call` to local WebMCP surface | Findings 4, 5, 7, 8, 10 |
| GENUI-08 | Recipe-card carousel UI inside iframe — styled, dark-mode-compatible, each card has "Pick" button that triggers `commitRecipeToPlan` via postMessage bridge | Findings 6, 7, 10 |
</phase_requirements>

---

## Summary

Phase 5 builds the MCP Apps host runtime in isolation — no chat panel. The deliverable is a working end-to-end round-trip observable without any AI model: click "Show demo carousel" → iframe renders → click "Pick" in the carousel → `commitRecipeToPlan` runs via JSON-RPC bridge → `MealPlanColumn` updates live. This is the whole verification story for Phase 5.

The codebase already has everything Phase 5 needs except the iframe stack. `GenerativeUIPage.tsx`, `ChatPlaceholder.tsx`, `MealPlanStore.ts`, `useMealPlan.ts`, and `RecipePersistence.ts` are fully shipped from Phase 4. `RecipeWorkbenchPage.tsx:164–228` is the exact template for `registerGenUITools()`. `toolAdapter.ts`'s `wrapToolsWithEvents` is reusable as-is.

The only novel work is: (1) the double-iframe HTML structure in `carouselTemplate.ts` + `iframeBridgeScript.ts`, (2) the JSON-RPC bridge class in `bridge.ts`, (3) the `UIResourceFrame` React component that owns the iframe lifecycle, (4) the `ChatBubbleContainer` visual wrapper, (5) `genUITools.ts` with the stub `commitRecipeToPlan`, and (6) wiring updates to `GenerativeUIPage.tsx` and `ChatPlaceholder.tsx`.

**Primary recommendation:** Implement in the order persistence → bridge types → iframe template → UIResourceFrame → ChatBubbleContainer → genUITools → page wiring. Commit each unit separately so TypeScript compile gate runs incrementally.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tool registration (`commitRecipeToPlan`) | React Host Page | — | `navigator.modelContext.registerTool` is a page-level API; iframe cannot call it directly (null origin) |
| postMessage bridge — host side | React Host Page (`UIResourceFrame`) | — | Owns the outer iframe DOM element; manages outbound queue and inbound routing |
| postMessage bridge — relay layer | Outer iframe shell (srcdoc JS) | — | Inner iframe is `sandbox="allow-scripts"` only — cannot post to `window.parent` of the host directly; outer shell relays |
| postMessage bridge — client side | Inner iframe (iframeBridgeScript) | — | Initiates `ui/initialize`, listens for `tools/call` response, posts `ui/notifications/*` |
| Recipe carousel HTML + CSS | Inner iframe (carouselTemplate) | — | Pure HTML/CSS generated by the host page and injected via srcdoc |
| Dark-mode theme propagation | React Host (`UIResourceFrame`) → outer shell → inner iframe | — | `useTheme()` fires on React side; notification queued and relayed down through both iframe layers |
| Height sync | Inner iframe (ResizeObserver script) → outer shell relay → host | — | Inner iframe observes its own documentElement; sends up through relay chain |
| Meal plan mutation | `MealPlanStore.addToPlan` in host page context | — | IndexedDB only accessible in same-origin page JS |
| MealPlanColumn re-render | React Host (`useMealPlan` subscription) | — | Pub-sub already wired from Phase 4; no Phase 5 changes needed |
| Visual container (chat bubble) | `ChatBubbleContainer` React component | — | Purely presentational; hosts `UIResourceFrame` |

---

## Standard Stack

### Core (all verified in codebase — no new npm deps for Phase 5)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | (existing) | Component tree, state, effects | Project standard |
| TypeScript strict | (existing) | All new files; no `any` at API boundaries | Project standard |
| Tailwind CSS 3.4.3 | (existing) | React host components only | Project standard |
| idb | (existing) | IndexedDB via `MealPlanStore` | Already imported via shared `getDB()` |

**No new npm packages are required for Phase 5.** The bridge is implemented as ~150 LOC native JS. This was the explicit decision in STATE.md: "native local bridge (~200 LOC), no `@mcp-b/transports`".

### Not Used (justified)

| Package | Why Not Used |
|---------|-------------|
| `@mcp-b/transports` | Carries native-only constraint; adds React polyfill machinery; not needed for single-iframe-at-a-time scope |
| `@mcp-ui/client` | React-heavy, designed for full MCP server integration; excess for this demo |
| `@modelcontextprotocol/ext-apps` | Server-side SDK; this demo has no MCP server |

---

## Architecture Patterns

### System Architecture Diagram

```
[GenerativeUIPage.tsx]
  │
  ├── useEffect (tool registration)
  │     └── navigator.modelContext.registerTool('commitRecipeToPlan', handler)
  │           handler → MealPlanStore.addToPlan() → notifyMealPlanStore()
  │
  ├── <ChatPlaceholder>
  │     ├── [button "Show demo carousel"]
  │     │     onClick → searchRecipesLocal() → setShowFrame(true)
  │     │
  │     └── {showFrame && <ChatBubbleContainer>}
  │                         └── <UIResourceFrame srcdoc={renderCarouselHTML(recipes)}>
  │
  ├── <MealPlanColumn> ← useMealPlan() auto-subscribes ← notifyMealPlanStore()
  │
  └── [UIResourceFrame owns:]
        ├── outerIframe DOM element
        │     srcdoc = outerShellHTML (bridge relay + innerIframe)
        │         └── innerIframe srcdoc = carouselHTML + iframeBridgeScript
        ├── pendingOutbound[] queue (flushed on 'load' event)
        ├── pendingRequests Map<id, {resolve, reject, timer}>
        ├── handshakeTimer (1000ms, → error state)
        ├── ResizeObserver height sync (receives 'size-changed' notification)
        └── useTheme() → on theme change → postMessage 'host-context-changed'

Message routing:
  innerIframe → window.parent (outer shell) → window.parent (React host)
  React host → outerIframe.contentWindow → forward → innerIframe.contentWindow
```

### Recommended Project Structure (Phase 5 additions only)

```
chat/src/app/
├── components/
│   └── GenerativeUI/
│       ├── ChatPlaceholder.tsx      (MODIFY — add button + UIResourceFrame slot)
│       ├── ChatBubbleContainer.tsx  (NEW)
│       ├── UIResourceFrame.tsx      (NEW)
│       └── iframe/
│           ├── bridge.ts            (NEW — JSON-RPC types + host-side bridge class)
│           ├── iframeBridgeScript.ts (NEW — iframe-side JS as a string export)
│           └── carouselTemplate.ts  (NEW — renderCarouselHTML(recipes): string)
├── components/
│   └── GenerativeUIPage.tsx         (MODIFY — add registerGenUITools() mount effect)
└── services/
    └── genUITools.ts                (NEW — commitRecipeToPlan tool + registerGenUITools())
```

### Pattern 1: navigator.modelContext.registerTool invocation (VERIFIED)

The exact contract from `RecipeWorkbenchPage.tsx:164–228` [VERIFIED: codebase]:

```typescript
// Module scope — survives React StrictMode double-mount
let previousRegistrationController: AbortController | null = null;
const DUPLICATE_NAME_PATTERN = /duplicate tool name|already registered/i;

// Inside useEffect(() => { ... }, []):
if (typeof navigator === 'undefined' || !navigator.modelContext) {
  setRegistration({ status: 'unavailable', count: 0 });
  return;
}
if (previousRegistrationController && !previousRegistrationController.signal.aborted) {
  previousRegistrationController.abort();
}
const controller = new AbortController();
previousRegistrationController = controller;

for (const tool of wrappedTools) {
  try {
    navigator.modelContext.registerTool(tool, { signal: controller.signal });
    registered.push(tool.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (DUPLICATE_NAME_PATTERN.test(message)) {
      registered.push(tool.name); // StrictMode residual — treat as success
      continue;
    }
    fatalError = err;
    break;
  }
}

return () => {
  controller.abort();
  if (previousRegistrationController === controller) {
    previousRegistrationController = null;
  }
};
```

Key facts [VERIFIED: webmcp.d.ts]:
- `registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): void` — returns `void`, not an AbortController.
- The caller passes an `AbortSignal`; there is no separate `unregisterTool`.
- Handler is `execute: (input: any, client?: ModelContextClient) => Promise<unknown> | unknown`. Can be async.
- `genUITools.ts` must use a SEPARATE module-scope `previousRegistrationController` variable (distinct from `RecipeWorkbenchPage.tsx`'s module-scope guard — each module has its own).

### Pattern 2: Double-iframe HTML structure

The outer iframe `srcdoc` is a minimal HTML shell that:
1. Creates the inner iframe with `sandbox="allow-scripts"` and injects carouselHTML via its `srcdoc`.
2. Contains the relay bridge JS that forwards messages between the inner iframe and `window.parent` (the React host).

Outer shell structure [DERIVED from CONTEXT.md locked decisions + SEP-1865 sandboxing recipe]:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>html,body{margin:0;padding:0;overflow:hidden;}iframe{width:100%;border:0;display:block;}</style>
</head>
<body>
<iframe id="inner"
  sandbox="allow-scripts"
  srcdoc="<!-- INNER_SRCDOC_PLACEHOLDER -->"
></iframe>
<script>
(function() {
  const inner = document.getElementById('inner');
  // Relay inner→host: inner iframe sends to its parent (outer shell),
  // outer shell relays to ITS parent (React host)
  window.addEventListener('message', function(event) {
    if (event.source !== inner.contentWindow) return;
    // Forward up to the React host
    window.parent.postMessage(event.data, '*');
  });
  // Relay host→inner: React host posts to outer shell's contentWindow;
  // outer shell forwards down to the inner iframe
  // NOTE: React host sends { __relay: true, payload: ... } to distinguish from
  // the inner iframe's own messages that get echoed back during relay setup.
  // Simpler approach: all messages from window.parent get forwarded to inner.
  window.addEventListener('message', function(event) {
    if (event.source === window.parent) {
      inner.contentWindow.postMessage(event.data, '*');
    }
  });
})();
</script>
</body>
</html>
```

**Critical insight:** The React host communicates with `outerIframe.contentWindow.postMessage(msg, '*')`. The outer shell's relay JS fires `window.addEventListener('message', ...)` for messages from `event.source === window.parent` and forwards them to `inner.contentWindow.postMessage(msg, '*')`. The inner iframe's script posts to `window.parent` (its parent = outer shell) and the outer shell's other listener sees `event.source === inner.contentWindow` and relays to `window.parent` (its parent = React host).

**Origin validation in the React host** [VERIFIED: CONTEXT.md locked decision]: `event.source === outerIframe.contentWindow`. The outer shell's relay means ALL messages the React host receives actually arrive from `outerIframe.contentWindow`, not from the inner iframe directly. The `event.source` check validates this correctly.

**Relay echo problem:** When the outer shell's host-listener forwards a message, the inner-listener should NOT re-relay it back (would create echo). Solution: the two listeners in the outer shell are mutually exclusive by source: one checks `event.source === inner.contentWindow` (upward relay), the other checks `event.source === window.parent` (downward relay). These won't overlap unless an echo occurs. Adding a `__direction` flag to messages is optional but improves debuggability.

### Pattern 3: JSON-RPC Types

Full TypeScript interfaces for `bridge.ts` [DERIVED from SEP-1865 spec + CONTEXT.md]:

```typescript
// ── Core JSON-RPC 2.0 types ──────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  // No 'id' field — distinguishes from request
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ── MCP Apps / SEP-1865 message shapes ───────────────────────────────────────

// iframe → host request
export interface UIInitializeParams {
  protocolVersion: string;           // '2026-01-26'
  clientInfo: { name: string; version: string };
  appCapabilities?: {
    availableDisplayModes?: string[];
    tools?: { listChanged?: boolean };
  };
}

// host → iframe response to ui/initialize
export interface UIInitializeResult {
  protocolVersion: string;           // '2026-01-26'
  hostInfo: HostInfo;
  hostContext: HostContext;
  hostCapabilities?: Record<string, unknown>;
}

export interface HostInfo {
  name: string;           // e.g. 'window-ai-generative-ui'
  version: string;        // e.g. '1.1.0'
  mcpVersion: string;     // '2026-01-26'
}

export interface HostContext {
  theme: 'dark' | 'light';
  displayMode: 'inline';
  dimensions: {
    maxWidth: number;
    maxHeight: number;
  };
}

// host → iframe notification (theme change)
export interface HostContextChangedParams {
  theme: 'dark' | 'light';
  displayMode?: 'inline';
  containerDimensions?: { width: number; maxHeight: number };
}

// iframe → host notification (height sync)
export interface SizeChangedParams {
  height: number;
  width?: number;
}

// iframe → host request (tool proxy)
export interface ToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// host → iframe response to tools/call
export interface ToolsCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

// Standard JSON-RPC error codes
export const RPC_ERROR = {
  PARSE_ERROR:      -32700,
  INVALID_REQUEST:  -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS:   -32602,
  INTERNAL_ERROR:   -32603,
  TOOL_ERROR:       -32000,
  DENIED:           -32000,  // user denied
} as const;
```

### Pattern 4: UIResourceFrame state machine

Three mutually exclusive visual states [VERIFIED: CONTEXT.md + UI-SPEC]:

```typescript
type FrameState = 'mounting' | 'ready' | 'error';
```

State transitions:
- `mounting` → `ready`: `ui/notifications/initialized` received within 1000ms of `load`
- `mounting` → `error`: 1000ms handshake timer fires before `ui/initialize` received
- `error` → `mounting`: user clicks "Try again" (destroys iframe, increments `key` to remount)

React implementation approach:

```typescript
const [frameState, setFrameState] = useState<FrameState>('mounting');
const [iframeKey, setIframeKey] = useState(0); // increment to remount

const handleRetry = () => {
  setFrameState('mounting');
  setIframeKey(k => k + 1);
};
```

The `iframeKey` triggers React to destroy and re-create the `<iframe>` DOM element, which creates a fresh bridge instance. The outer iframe `srcdoc` gets re-assigned, triggering a new `load` event and fresh handshake.

### Pattern 5: ResizeObserver script for inner iframe

Exact script to embed in `iframeBridgeScript.ts` [DERIVED from CONTEXT.md + SEP-1865 spec]:

```javascript
(function() {
  var debounceTimer = null;
  var ro = new ResizeObserver(function(entries) {
    var entry = entries[0];
    if (!entry) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      var height = Math.ceil(entry.contentRect.height);
      window.parent.postMessage({
        jsonrpc: '2.0',
        method: 'ui/notifications/size-changed',
        params: { height: height }
      }, '*');
    }, 50);
  });
  ro.observe(document.documentElement);
})();
```

Note: `window.parent` from inside the inner iframe = outer shell. The outer shell's relay forwards this up to the React host. The React host's inbound handler sees `event.source === outerIframe.contentWindow` and recognises `method: 'ui/notifications/size-changed'`.

### Pattern 6: Handshake from the inner iframe's perspective

The inner iframe's `iframeBridgeScript.ts` must:
1. On DOMContentLoaded (or immediately, since srcdoc is inline): send `ui/initialize` request.
2. Listen for `ui/initialize` response → fire `ui/notifications/initialized` notification.
3. Listen for `ui/notifications/host-context-changed` → apply `data-theme` to `<html>`.
4. Listen for delegated "Pick" button click → send `tools/call` request (with in-flight state on the button).
5. On `tools/call` response → update button to "Added!" for 2s.

The iframe-side "pending requests" map is simpler: just `Map<id, callback>` since the iframe only sends requests (no responses to send except for `ui/initialize` reply from host perspective — actually the iframe is the REQUESTER of `ui/initialize` and RECEIVER of responses).

```javascript
// Iframe-side request correlator
var pendingIframeRequests = {};
var nextId = 1;

function sendRequest(method, params) {
  var id = nextId++;
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      delete pendingIframeRequests[id];
      reject(new Error('timeout'));
    }, 5000);
    pendingIframeRequests[id] = { resolve: resolve, reject: reject, timer: timer };
    window.parent.postMessage({ jsonrpc: '2.0', id: id, method: method, params: params }, '*');
  });
}

function sendNotification(method, params) {
  window.parent.postMessage({ jsonrpc: '2.0', method: method, params: params }, '*');
}

window.addEventListener('message', function(event) {
  var data = event.data;
  if (!data || data.jsonrpc !== '2.0') return;
  if (data.id !== undefined && pendingIframeRequests[data.id]) {
    var pending = pendingIframeRequests[data.id];
    clearTimeout(pending.timer);
    delete pendingIframeRequests[data.id];
    if (data.error) pending.reject(new Error(data.error.message));
    else pending.resolve(data.result);
  }
  if (data.method === 'ui/notifications/host-context-changed' && data.params) {
    document.documentElement.setAttribute('data-theme', data.params.theme || 'light');
  }
});
```

### Pattern 7: wrapToolsWithEvents contract [VERIFIED: codebase]

`toolAdapter.ts:77` exports `wrapToolsWithEvents(tools: ModelContextTool[], onEvent: (e: ToolCallEvent) => void): ModelContextTool[]`.

Contract:
- Returns `ModelContextTool[]` (same shape as input, NOT stringified).
- Each wrapped `execute` fires `{ kind: 'pending', toolName, args }` before running, `{ kind: 'done', toolName }` on success, `{ kind: 'error', toolName, message }` on failure.
- On error: returns `{ error: message }` instead of re-throwing (keeps external agent protocol intact).
- The result is returned unchanged when it's not a string (so `commitRecipeToPlan`'s `{ content: [{ type: 'text', text: 'Added to plan' }] }` passes through unmodified).

Usage in `genUITools.ts`:

```typescript
import { wrapToolsWithEvents, type ToolCallEvent } from '../services/toolAdapter';
// wrapToolsWithEvents(GEN_UI_TOOLS, onToolEvent) before passing to registerTool loop
```

The Phase 5 stub tool does NOT need a UI indicator (no `ToolCallIndicator` on this page yet). Using `wrapToolsWithEvents` is still recommended for consistency and console debug logging — the `onToolEvent` callback can simply `console.debug('[genUI:tool]', e)`.

### Pattern 8: Theme propagation wiring

`useTheme()` from `ThemeContext.tsx` [VERIFIED: codebase] returns `{ theme: 'light' | 'dark', toggleTheme: () => void }`.

In `UIResourceFrame.tsx`:

```typescript
const { theme } = useTheme();

// Fires on every theme change (including initial mount):
useEffect(() => {
  bridge.sendHostContextChanged({ theme });
  // bridge.sendHostContextChanged checks: if iframe not loaded yet, push to pendingOutbound[]
  // if loaded, post immediately
}, [theme, bridge]); // bridge is stable ref (created once per mount, lives in a ref)
```

The initial theme is sent via the pre-load outbound queue (queued before the `load` event fires), so the iframe receives the correct theme as part of handshake before first paint. No flash-of-wrong-theme.

### Pattern 9: Pre-load outbound queue implementation

```typescript
// In UIResourceFrame.tsx, inside the effect that sets up the iframe:
const pendingOutbound: unknown[] = [];
let iframeLoaded = false;

function queueOrSend(msg: unknown) {
  if (!iframeLoaded) {
    pendingOutbound.push(msg);
  } else {
    outerIframeRef.current?.contentWindow?.postMessage(msg, '*');
  }
}

outerIframeRef.current.addEventListener('load', () => {
  iframeLoaded = true;
  // Flush FIFO
  while (pendingOutbound.length > 0) {
    const msg = pendingOutbound.shift();
    outerIframeRef.current?.contentWindow?.postMessage(msg, '*');
  }
  // Start handshake timer — 1000ms to receive ui/initialize
  handshakeTimer = setTimeout(() => {
    setFrameState('error');
  }, 1000);
});
```

### Pattern 10: commitRecipeToPlan tool definition

```typescript
// In genUITools.ts
import * as MealPlanStore from './MealPlanStore';

export const GEN_UI_TOOLS: ModelContextTool[] = [
  {
    name: 'commitRecipeToPlan',
    description: 'Add a recipe to the current meal plan',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: 'The ID of the recipe to add' },
        servings: { type: 'number', description: 'Number of servings (optional, defaults to recipe default)' },
      },
      required: ['recipeId'],
    },
    execute: async (input: { recipeId: string; servings?: number }): Promise<unknown> => {
      const { recipeId, servings } = input;
      await MealPlanStore.addToPlan({
        id: crypto.randomUUID(),
        recipeId,
        addedAt: Date.now(),
        servings,
      });
      return { content: [{ type: 'text', text: 'Added to plan' }] };
    },
  },
];

export function registerGenUITools(): AbortController {
  // mirrors RecipeWorkbenchPage.tsx:164-228 pattern exactly
  // Returns a new AbortController; caller calls .abort() on unmount
  // ... (see Pattern 1 above for full implementation template)
}
```

### Anti-Patterns to Avoid

- **Posting to `outerIframe.contentWindow` before `load`:** silently no-ops ~30% of the time in Chrome 146 Canary. Always queue via `pendingOutbound`.
- **Checking `event.origin` for null-origin sandboxed iframes:** `event.origin` is `"null"` (string). Do not allowlist `"null"` — use `event.source === outerIframe.contentWindow` instead.
- **Granting `allow-same-origin` to the inner iframe:** defeats the entire sandbox; the guest can break CSP and access host cookies.
- **Using `blob:` or `data:` URIs for the carousel content:** `data:` URIs have a navigation-replacement quirk in Chrome that complicates ResizeObserver wiring; `blob:` introduces URL lifecycle management complexity. Use `srcdoc`.
- **Measuring the host container size inside the inner iframe's ResizeObserver:** causes a feedback loop. Only measure `document.documentElement` (content-driven).
- **Forgetting to debounce the ResizeObserver:** synchronous resize events cause a flood of postMessage calls.
- **Passing `theme` as a `useEffect` dep without a stable bridge ref:** causes re-registration on every render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IDB CRUD for meal plan | Custom IDB wrapper | `MealPlanStore.addToPlan` (Phase 4) | Already exists, tested, uses shared `getDB()` |
| Tool registration lifecycle | Custom unregister mechanism | `AbortController` + `registerTool(tool, { signal })` | W3C spec; no `unregisterTool` exists |
| Tool event UI feedback | Custom event bus | `wrapToolsWithEvents` from `toolAdapter.ts` | Already ships `ToolCallEvent` lifecycle |
| Recipe data for carousel | Custom fetch | `RecipePersistence.getRecipes()` | Phase 4 already exposes this |
| Dark mode detection | CSS `prefers-color-scheme` in iframe | `[data-theme]` attribute via `host-context-changed` | Sandboxed iframes do not inherit parent's color scheme |

**Key insight:** The inner iframe CSS cannot use `@media (prefers-color-scheme: dark)` — sandboxed iframes inherit nothing from the parent. All dark-mode CSS must be driven by the `data-theme` attribute set via postMessage.

---

## Inline CSS Subset (inner iframe)

Locked by UI-SPEC. Complete CSS that `carouselTemplate.ts` must emit in its `<style>` block:

**CSS custom properties on `:root` and `[data-theme="dark"]`:**

```css
:root {
  --c-bg: #ffffff;
  --c-surface: #f9fafb;
  --c-border: #e5e7eb;
  --c-text-primary: #111827;
  --c-text-secondary: #6b7280;
  --c-badge-bg: #dbeafe;
  --c-badge-text: #1e40af;
  --c-btn-bg: #2563eb;
  --c-btn-hover: #1d4ed8;
  --c-btn-text: #ffffff;
}
[data-theme="dark"] {
  --c-bg: #1f2937;
  --c-surface: #374151;
  --c-border: #4b5563;
  --c-text-primary: #f9fafb;
  --c-text-secondary: #9ca3af;
  --c-badge-bg: #1e3a8a;
  --c-badge-text: #93c5fd;
  --c-btn-bg: #3b82f6;
  --c-btn-hover: #2563eb;
  --c-btn-text: #ffffff;
}
```

**Body reset:**

```css
html, body { margin:0; padding:0; background:var(--c-bg); color:var(--c-text-primary);
  font-family:system-ui,-apple-system,sans-serif; box-sizing:border-box; }
*, *::before, *::after { box-sizing:inherit; }
```

**Component classes (per UI-SPEC Inline CSS Subset table):**

```css
.carousel { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:0.5rem;
            padding:0.5rem; scrollbar-width:thin; scrollbar-color:var(--c-border) transparent; }
.card     { flex-shrink:0; width:220px; scroll-snap-align:start; background:var(--c-surface);
            border:1px solid var(--c-border); border-radius:0.75rem; padding:1rem;
            display:flex; flex-direction:column; gap:0.5rem; }
.card-title { font-size:0.9375rem; font-weight:600; color:var(--c-text-primary); line-height:1.3; margin:0; }
.badge    { font-size:0.8125rem; color:var(--c-badge-text); background:var(--c-badge-bg);
            border-radius:9999px; padding:0.25rem 0.5rem; display:inline-block; width:fit-content; }
.ingredients { font-size:0.8125rem; color:var(--c-text-secondary); list-style:none;
               margin:0; padding:0; display:flex; flex-direction:column; gap:0.25rem; }
.pick-btn { margin-top:auto; background:var(--c-btn-bg); color:var(--c-btn-text); border:none;
            border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.9375rem; font-weight:600;
            cursor:pointer; width:100%; transition:background 0.15s; line-height:1; }
.pick-btn:hover { background:var(--c-btn-hover); }
.pick-btn:focus { outline:2px solid var(--c-btn-bg); outline-offset:2px; }
.pick-btn:disabled { opacity:0.6; cursor:not-allowed; }
@media (max-width:639px) {
  .carousel { flex-direction:column; overflow-x:visible; scroll-snap-type:none; }
  .card { width:100%; }
}
```

---

## Common Pitfalls

### Pitfall 1: StrictMode double-mount iframe re-creation race

**What goes wrong:** React StrictMode mounts, unmounts, remounts in development. The cleanup aborts the bridge and destroys the iframe. The second mount creates a new iframe. If the SAME module-scope `previousRegistrationController` is shared between `useEffect` for tool registration AND the iframe bridge effect, abort calls can cross-contaminate.

**Why it happens:** Module-scope refs persist across React remounts; React-scoped refs do not.

**How to avoid:** Use the module-scope `previousRegistrationController` ONLY for the `navigator.modelContext.registerTool` effect (mirrors `RecipeWorkbenchPage.tsx` exactly). The bridge lifecycle (iframe setup/teardown) uses a React `useRef` inside `UIResourceFrame` — React destroys and recreates this ref with the component, so no cross-contamination.

**Warning signs:** Console shows "Duplicate tool name" error on first load in dev mode (handled by `DUPLICATE_NAME_PATTERN` catch).

### Pitfall 2: Inner iframe postMessage routing confusion

**What goes wrong:** Developer posts from React host directly to the outer iframe and expects the inner iframe's script to receive it. But `outerIframe.contentWindow.postMessage(msg, '*')` lands in the outer shell's JS context, not the inner iframe's JS context. The outer shell must explicitly forward it to `inner.contentWindow.postMessage(msg, '*')`.

**Why it happens:** Two iframe layers; the postMessage is NOT automatically forwarded.

**How to avoid:** Implement the relay listeners in the outer shell srcdoc JS explicitly. Test by logging in the outer shell script.

### Pitfall 3: Tailwind classes unavailable in iframe

**What goes wrong:** The carousel template references Tailwind utility class names that are not in the inline `<style>` block.

**Why it happens:** The inner iframe is `srcdoc` with `default-src 'none'` CSP — it cannot load `/tailwind.css` from the React app.

**How to avoid:** `carouselTemplate.ts` must use ONLY the classes defined in the inline CSS subset above. Do not add any class name to the carousel HTML that is not in the locked UI-SPEC Inline CSS Subset table.

### Pitfall 4: ThemeContext re-renders triggering redundant bridge notifications

**What goes wrong:** Every React re-render of `UIResourceFrame` (e.g., due to parent state changes) could cause the `useEffect([theme, bridge])` to re-fire even when theme hasn't changed.

**Why it happens:** Stale dependency arrays; bridge ref not stabilised.

**How to avoid:** Store the bridge in a `useRef` (stable reference). The theme `useEffect` dep array is `[theme]` only; `bridge` reference is accessed via the ref inside the effect (not as a dep). Theme changes are already debounced by the user's toggle interaction — no additional debounce needed.

### Pitfall 5: Navigator.modelContext unavailable during tools/call proxy

**What goes wrong:** User opens `/generative-ui` without the Chrome Canary flag. `MissingFlagBanner` shows but the page still renders. User clicks "Show demo carousel". Carousel loads. User clicks "Pick". The `tools/call` JSON-RPC proxy in `UIResourceFrame` tries to call `navigator.modelContext` and throws.

**Why it happens:** The bridge proxies `tools/call` by calling the tool handler directly (it owns the `GEN_UI_TOOLS` array or proxies via `navigator.modelContext`).

**How to avoid:** In the `tools/call` handler in `UIResourceFrame`, check if `navigator.modelContext` is available. If not, return a JSON-RPC error:
```json
{ "jsonrpc": "2.0", "id": 42, "error": { "code": -32000, "message": "navigator.modelContext is not available" } }
```
The iframe's Pick button then shows "Tools unavailable" (per UI-SPEC copy contract).

Note: The bridge proxies to the `GEN_UI_TOOLS` execute functions DIRECTLY (not via `navigator.modelContext`). The tools are already in scope. The `navigator.modelContext` check is for availability of the registration (for the banner); the `tools/call` proxy finds the tool by name in the `GEN_UI_TOOLS` array and calls `tool.execute(args)` directly. This is safer and simpler than re-routing through `navigator.modelContext`.

### Pitfall 6: Multiple UIResourceFrames mounted simultaneously

**What goes wrong:** User rapidly clicks "Show demo carousel" before the first frame is ready.

**Why it happens:** No single-slot enforcement in `ChatPlaceholder`.

**How to avoid:** The button disables (`disabled` attribute) while `showFrame === true` (i.e., while the frame is mounted in 'mounting' or 'ready' state). It re-enables only on 'error' state (so user can retry). State machine in `ChatPlaceholder`: `showFrame: boolean` — truthy while mounted, reset only if explicitly closed or on error-retry.

---

## Implementation Guide: `bridge.ts` Host-Side Class

The host-side bridge is a class instantiated once per `UIResourceFrame` mount:

```typescript
class UIResourceBridge {
  private iframeRef: React.RefObject<HTMLIFrameElement>;
  private pendingOutbound: unknown[] = [];
  private iframeLoaded = false;
  private pendingRequests = new Map<number, {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private nextRequestId = 1;
  private onInitialize: (params: UIInitializeParams) => UIInitializeResult;
  private onInitialized: () => void;
  private onSizeChanged: (params: SizeChangedParams) => void;
  private onToolsCall: (params: ToolsCallParams) => Promise<ToolsCallResult>;

  // Called on iframe 'load' event
  onLoad(): void { ... }

  // Called from window message listener (filtered to outerIframe.contentWindow)
  onMessage(event: MessageEvent): void { ... }

  // Send a notification to the iframe (queued if not loaded)
  sendNotification(method: string, params: unknown): void { ... }

  // Cleanup — call on unmount
  destroy(): void { ... }
}
```

The class is NOT exported as a React component. `UIResourceFrame.tsx` instantiates it in a `useRef` and manages its lifecycle.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is code-only with no external service dependencies. All required tools (Chrome Canary with `navigator.modelContext` flag) are pre-documented in the existing `MissingFlagBanner`. No CLI tools, databases, or build systems beyond the existing Nx/webpack workspace are required.

---

## Runtime State Inventory

Step 2.5: NOT APPLICABLE — Phase 5 is a greenfield feature addition. No rename, rebrand, or migration. No runtime state carries the old naming.

---

## Code Examples

### ChatBubbleContainer.tsx (complete — 12 lines)

```typescript
// Source: CONTEXT.md locked decision + UI-SPEC Tailwind class contract
import React from 'react';
export const ChatBubbleContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl max-w-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm p-2 mt-4 animate-fade-in">
    {children}
  </div>
);
```

### UIResourceFrame loading skeleton (from UI-SPEC)

```typescript
// 'mounting' state render:
<div
  aria-label="Loading recipe carousel…"
  className="h-[200px] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
/>
```

### UIResourceFrame error card (from UI-SPEC)

```typescript
// 'error' state render:
<div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col gap-3">
  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Couldn't load app</p>
  <p className="text-sm text-red-600 dark:text-red-300">
    The recipe carousel didn't respond in time. This can happen if WebMCP isn't enabled in your browser.
  </p>
  <button
    onClick={handleRetry}
    className="self-start px-3 py-1.5 text-sm font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
  >
    Try again
  </button>
</div>
```

### "Show demo carousel" button (from UI-SPEC)

```typescript
<button
  onClick={handleShowCarousel}
  disabled={showFrame}
  className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Show demo carousel
</button>
```

### `tools/call` proxy handler (inside UIResourceFrame message listener)

```typescript
// When event.data.method === 'tools/call':
const { name, arguments: args } = event.data.params as ToolsCallParams;
const tool = GEN_UI_TOOLS.find(t => t.name === name);
if (!tool) {
  outerIframeRef.current?.contentWindow?.postMessage({
    jsonrpc: '2.0',
    id: event.data.id,
    error: { code: RPC_ERROR.METHOD_NOT_FOUND, message: `Unknown tool: ${name}` },
  }, '*');
  return;
}
try {
  const result = await tool.execute(args ?? {}) as ToolsCallResult;
  outerIframeRef.current?.contentWindow?.postMessage({
    jsonrpc: '2.0',
    id: event.data.id,
    result,
  }, '*');
} catch (err) {
  const message = err instanceof Error ? err.message : 'Tool execution failed';
  outerIframeRef.current?.contentWindow?.postMessage({
    jsonrpc: '2.0',
    id: event.data.id,
    error: { code: RPC_ERROR.TOOL_ERROR, message },
  }, '*');
}
```

---

## Validation Architecture

`workflow.nyquist_validation: false` — section omitted per config.

---

## Verification Flow (Browser-Executable, ~60 seconds)

The Phase 5 success criteria are browser-observable. The complete verification sequence:

1. `npx nx serve chat` — navigate to `http://localhost:4300/generative-ui`
2. Open DevTools Console, filter on `[mcp-apps:`
3. Click "Show demo carousel" button
4. Console shows: `[mcp-apps:host] ui/initialize received`, `[mcp-apps:host] handshake complete`
5. Carousel renders: 3 cards visible with horizontal scroll, titles + minute badges + "Pick" buttons
6. Toggle dark mode → console shows `[mcp-apps:host] host-context-changed sent`, carousel cards switch to dark palette within one animation frame
7. Click "Pick" on any card → console shows `[mcp-apps:iframe] tools/call sent { name: 'commitRecipeToPlan' }`, then `[mcp-apps:host] tools/call handled`
8. Right-column MealPlanColumn updates within ~100ms (IDB write + pub-sub notify)
9. "Pick" button shows "Added!" for 2s, reverts to "Pick"
10. Click "Pick" on a second card → second entry appears in MealPlanColumn

Failure detection:
- No carousel after click → check handshake timer (1000ms error UI would show)
- "Tools unavailable" in pick button → `navigator.modelContext` flag not enabled; check `chrome://flags/#WebMCP`
- MealPlanColumn does not update → `MealPlanStore.addToPlan` not called; check console for `[mcp-apps:host] tools/call handled`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The outer shell's relay JS in srcdoc can use `window.parent.postMessage` to reach the React host | Architecture Patterns, Pattern 2 | If Chrome sandboxes outer shell's `allow-same-origin` differently, relay may fail; mitigation: the outer iframe HAS `allow-same-origin` by spec decision so this should work | [ASSUMED — not experimentally verified in Chrome 146 Canary but consistent with CONTEXT.md decision rationale] |
| A2 | `crypto.randomUUID()` is available in `srcdoc` null-origin context for the inner iframe | Pattern 3 | If not available, use a counter-based ID instead | [ASSUMED — standard in secure contexts but srcdoc origin behaviour varies] |
| A3 | `animate-fade-in` is defined in `chat/tailwind.config.js` | ChatBubbleContainer code example | If missing, ChatBubbleContainer mount animation silently drops; no functional impact | [CITED: 05-UI-SPEC.md Source Traceability table — "Code scan — tailwind.config.js custom animations"] |

**If table above is mostly empty:** All critical claims (registerTool signature, wrapToolsWithEvents contract, MealPlanStore API, postMessage routing) were verified directly from the codebase or from the locked CONTEXT.md decisions.

---

## Open Questions

1. **Outer shell relay and the echo problem**
   - What we know: the outer shell has two `window.addEventListener('message', ...)` handlers — one for upward relay (inner → host) and one for downward relay (host → inner).
   - What's unclear: if a message from `window.parent` (host) gets forwarded to `inner.contentWindow`, and then the inner iframe's script posts a response back to `window.parent` (outer shell), the outer shell's upward-relay listener sees `event.source === inner.contentWindow` and re-relays it back up. This is correct. No echo loop because the host's inbound listener checks `event.source === outerIframe.contentWindow` — which will not match the outer shell re-posting from inside. **This is safe by design.**
   - Recommendation: Add `console.debug` in both relay listeners tagged `[mcp-apps:relay]` to observe during dev; remove or gate behind `__DEV__` before Phase 7.

2. **`searchRecipesLocal()` definition in ChatPlaceholder**
   - What we know: CONTEXT.md says this calls `RecipePersistence.getRecipes()` (page-side, not via `navigator.modelContext`).
   - What's unclear: should it filter recipes, or return all 12? Phase 5 can return all 12 (the carousel handles display).
   - Recommendation: `const recipes = await getRecipes()` — return all. Phase 6 replaces this with the `searchRecipes` tool call.

3. **`UIResourceFrame` receives `GEN_UI_TOOLS` directly or via prop**
   - What we know: `UIResourceFrame` needs to proxy `tools/call` requests. The tool definitions live in `genUITools.ts`.
   - What's unclear: should `UIResourceFrame` import `GEN_UI_TOOLS` directly or receive a `tools` prop?
   - Recommendation: Pass as a `tools: ModelContextTool[]` prop. This makes `UIResourceFrame` reusable for Phase 6 (which adds `searchRecipes`). The prop defaults to `GEN_UI_TOOLS` in Phase 5 call sites.

---

## Security Domain

`security_enforcement` is absent from `.planning/config.json` — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in this demo |
| V3 Session Management | No | No sessions |
| V4 Access Control | Partial | Sandbox + origin check controls iframe capabilities |
| V5 Input Validation | Yes | JSON-RPC message parsing; tool `inputSchema` validates args |
| V6 Cryptography | No | No secrets, no encryption |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious iframe escaping sandbox via `allow-same-origin` on inner iframe | Elevation of privilege | Inner iframe has `sandbox="allow-scripts"` only — no `allow-same-origin`. Locked decision. |
| Spoofed postMessage from third-party scripts on the host page | Spoofing | `event.source === outerIframe.contentWindow` filter on all inbound messages. Locked decision. |
| Prototype pollution via JSON-RPC `params` | Tampering | `params` is parsed as typed interface; tool execute receives narrowed input. |
| Tool call to arbitrary method names | Elevation of privilege | `tools/call` handler looks up tool by name in `GEN_UI_TOOLS` array only; unknown names return `METHOD_NOT_FOUND` error. |
| CSS injection via carousel HTML | Spoofing | Carousel HTML is generated from `renderCarouselHTML(recipes)` in host page code, not from user input or server. Recipe data (title, ingredients) is sanitised by escaping HTML entities before interpolation. |

**HTML entity escaping is required** in `carouselTemplate.ts`:

```typescript
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Use escapeHtml(recipe.title), escapeHtml(ingredient.name), etc. when building carousel HTML
```

---

## Sources

### Primary (HIGH confidence)
- `chat/src/app/components/RecipeWorkbenchPage.tsx:164–228` — exact `registerTool` invocation pattern, module-scope guard, `DUPLICATE_NAME_PATTERN`
- `chat/src/app/services/toolAdapter.ts` — `wrapToolsWithEvents` contract
- `chat/src/app/types/webmcp.d.ts` — `ModelContext.registerTool` signature (void return, AbortSignal option)
- `chat/src/app/context/ThemeContext.tsx` — `useTheme()` returns `{ theme, toggleTheme }`
- `chat/src/app/services/MealPlanStore.ts` — `addToPlan(entry: PlanEntry): Promise<void>`
- `.planning/phases/05-mcp-apps-host-sandboxed-iframe-postmessage-bridge/05-CONTEXT.md` — all locked decisions
- `.planning/phases/05-mcp-apps-host-sandboxed-iframe-postmessage-bridge/05-UI-SPEC.md` — CSS class contracts, copy, interaction states

### Secondary (MEDIUM confidence)
- `.planning/research/mcp-apps-spec.md` — SEP-1865 wire format; `ui/initialize` + `ui/notifications/*` exact shapes
- `.planning/research/mcp-ui-webmcp-tictactoe-analysis.md` — reference impl patterns; iframe lifecycle hooks
- `.planning/research/codebase-integration-map.md` — file layout, conflict analysis, hazards
- `.planning/phases/04-v1-1-foundation-page-shell-store-seed/04-01-SUMMARY.md` — Phase 4 persistence API
- `.planning/phases/04-v1-1-foundation-page-shell-store-seed/04-02-SUMMARY.md` — Phase 4 UI shell
- `chat/src/app/components/GenerativeUIPage.tsx` — actual Phase 4 output to modify
- `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` — actual Phase 4 output to modify

### Tertiary (LOW confidence)
- None — all claims derive from codebase inspection or locked decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified in codebase, no new deps
- Architecture: HIGH — locked decisions from CONTEXT.md, verified against codebase patterns
- JSON-RPC types: HIGH — derived directly from SEP-1865 spec + CONTEXT.md locked shapes
- Pitfalls: HIGH — three are documented in STATE.md risks; one from SEP-1865 pitfalls list; one from codebase pattern analysis
- Inline CSS: HIGH — locked verbatim by 05-UI-SPEC.md

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (spec is finalized at 2026-01-26; Chrome 146 Canary API stable enough for this milestone)
