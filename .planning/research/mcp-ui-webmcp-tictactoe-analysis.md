# Reverse-engineering WebMCP-org/mcp-ui-webmcp Tic-Tac-Toe — Implementation Guide for Recipe Workbench

Date: 2026-05-18
Branch: feature/mcp-preview
Author: research agent

This document maps the upstream demo at https://github.com/WebMCP-org/mcp-ui-webmcp and the supporting npm packages at https://github.com/WebMCP-org/npm-packages to a concrete plan for our `/webmcp` Recipe Workbench page.

> Note on naming: the README at the upstream root says "tic-tac-toe", but the actual app under `apps/mcp-server/src/` is now refactored into `App.tsx` + `components/` + `hooks/` + `lib/tictactoe/`. References in `ARCHITECTURE.md` to `TicTacToe.tsx` / `TicTacToeWithWebMCP.tsx` are stale.

---

## 1. Architecture diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ HOST CHAT UI  (apps/chat-ui, react)                              │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │ assistant-ui chat thread                               │    │
│   │  ↳ renders an MCPUIResource component for any tool     │    │
│   │    result that carries a ui://… resource               │    │
│   └─────────────────────────┬──────────────────────────────┘    │
│                             │ onLoad / onMount                  │
│   ┌─────────────────────────▼──────────────────────────────┐    │
│   │ <iframe src="https://app-url/" sandbox="…">            │    │
│   │   (the WebMCP-enabled embedded app)                    │    │
│   └─────┬───────────────────────────────────────────┬──────┘    │
│         │ ① postMessage 'parent-ready'              │           │
│         │ ② IframeParentTransport JSON-RPC          │           │
│         │ ③ 'ui-size-change' / 'notify'             │           │
│         │                                            │           │
│   useIframeLifecycle:                                            │
│     • new IframeParentTransport({ iframe, targetOrigin })       │
│     • new Client(...).connect(transport)                        │
│     • client.listTools() → registerWebMcpTools(sourceId)        │
│     • subscribe to ToolListChangedNotification                  │
│                                                                  │
│   useIframeResize: listens for {type:'ui-size-change'} →         │
│     sets iframe.style.{width,height}, optional scale             │
│                                                                  │
│   useWebMCPIntegration: keeps Map<sourceId, Client> +            │
│     flattened tools list; callTool(name, args, sourceId) routes  │
│     to the right iframe-resident MCP server                      │
└──────────────────────────────────────────────────────────────────┘
                              ▲                       │
                              │ postMessage           │ postMessage
                              │                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ EMBEDDED APP  (apps/mcp-server src/, served at APP_URL/)         │
│                                                                  │
│   main.tsx                                                       │
│     ① installPartialNativeApiShims()                             │
│     ② initializeWebModelContext({ transport:{ tabServer:…} })    │
│        ↳ inside an iframe this resolves to IframeChildTransport  │
│     ③ createRoot(<App/>)                                         │
│                                                                  │
│   App.tsx                                                        │
│     • useGameState()         (pure state machine)                │
│     • useParentCommunication() (postMessage + readiness)         │
│     • useGameStats()                                             │
│     • useWebMCP({ name:'tictactoe_get_state', handler:… })       │
│     • useWebMCP({ name:'tictactoe_ai_move',  handler:… })        │
│     • useWebMCP({ name:'tictactoe_reset',    handler:… })        │
│     • <GameBoard/> renders the same state                        │
│                                                                  │
│   Tools registered into navigator.modelContext from inside the   │
│   iframe; @mcp-b/global wraps them in a BrowserMcpServer that    │
│   speaks JSON-RPC over IframeChildTransport ↔ IframeParentTransport│
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP  /mcp  (Cloudflare worker)
                              │
┌──────────────────────────────────────────────────────────────────┐
│ OUT-OF-PROCESS MCP SERVER  (apps/mcp-server worker/)             │
│   tool 'showTicTacToeGame'  →  returns createUIResource({         │
│       uri:'ui://tictactoe-game',                                 │
│       content:{ type:'externalUrl', iframeUrl:`${APP_URL}/` },    │
│       encoding:'blob'                                             │
│   }) plus a text card with instructions                          │
└──────────────────────────────────────────────────────────────────┘
```

Key insight: the **iframe URL points back to the same origin that served the embedded React app**. The MCP server's only job is to ship the UI resource pointing to that URL. All tool registration happens client-side in the iframe via `useWebMCP` → `navigator.modelContext.registerTool`.

For our setup we have **no external MCP server**. The agent is the page itself. The "host" and "embedded app" both live in the same SPA, separated by an iframe boundary. The bridge stays the same.

---

## 2. File-by-file walkthrough

Upstream repo: `github.com/WebMCP-org/mcp-ui-webmcp`. All paths below are relative to that repo root.

### 2a. Worker / MCP server (the part we do NOT replicate)

| Path | Purpose |
|------|---------|
| `apps/mcp-server/worker/index.ts` | Hono router, exposes `/mcp` (MCP protocol), `/sse`, `/api/stats*`, and serves the static React app from `/`. |
| `apps/mcp-server/worker/mcpServer.ts` | `McpAgent` subclass. Registers 7 tools (`showExternalUrl`, `showRawHtml`, `showRemoteDom`, `showTicTacToeGame`, `tictactoe_get_stats`, `chooseColor`, `testElicitation`) + 1 prompt `PlayTicTacToe`. `showTicTacToeGame` is the one that returns the iframe UI resource. |
| `apps/mcp-server/worker/gameStatsStorage.ts` | Durable Object holding game stats. Irrelevant for us. |
| `apps/mcp-server/worker/elicitation-types.ts` | Types for the elicitation demo. Irrelevant for us. |
| `apps/mcp-server/wrangler.jsonc`, `deploy.sh` | Cloudflare deploy plumbing. Irrelevant. |

### 2b. Embedded app (this is the model for our `/webmcp` UI **inside** the iframe)

| Path | Purpose |
|------|---------|
| `apps/mcp-server/index.html` | Boring Vite HTML shell — single `<div id="root">` and `<script type="module" src="/src/main.tsx">`. No special markup. |
| `apps/mcp-server/src/main.tsx` | **Entry point.** Calls `installPartialNativeApiShims()`, then `initializeWebModelContext({ transport:{ tabServer:{ allowedOrigins:['*'] } } })` **before** `createRoot`. The shim layer (Chrome Beta 147 vs polyfill) is the only non-obvious bit. |
| `apps/mcp-server/src/App.tsx` | **Main component.** Owns `useGameState` + 3 × `useWebMCP` calls. Renders the board. Drives parent communication via `useParentCommunication`. |
| `apps/mcp-server/src/components/GameBoard.tsx`, `GameHeader.tsx`, `GameStatus.tsx`, `ResetButton.tsx`, `RoleSelectionModal.tsx`, `index.ts` | Pure presentational React components. |
| `apps/mcp-server/src/hooks/useGameState.ts` | The state machine: board, current player, winner, `makeMove`, `reset`. **Same hook is the source of truth for both UI click handlers and `useWebMCP` handlers.** |
| `apps/mcp-server/src/hooks/useParentCommunication.ts` | Owns the readiness handshake (`ui-lifecycle-iframe-ready` → `parent-ready` / `ui-lifecycle-iframe-render-data` / `ui-message-response`), and the `ui-size-change` size notification. Also exposes `postNotifyMarkdown` for `{type:'notify', payload:{message}}`. |
| `apps/mcp-server/src/hooks/useGameStats.ts` | WebSocket stats — irrelevant for us. |
| `apps/mcp-server/src/hooks/index.ts` | Barrel. |
| `apps/mcp-server/src/lib/tictactoe/{types,gameLogic,constants,formatters}.ts` | Pure game logic, no React. `formatters.ts` returns markdown for tool responses. |
| `apps/mcp-server/src/ErrorBoundary.tsx` | Standard React error boundary. |
| `apps/mcp-server/src/index.css` | Tailwind v4 entry (`@import "tailwindcss"` plus a few custom classes). The iframe ships its own Tailwind bundle — it does **not** inherit from the host. |
| `apps/mcp-server/vite.config.ts` | Vite with `@vitejs/plugin-react` (+ babel-plugin-react-compiler), `@tailwindcss/vite`, `@cloudflare/vite-plugin`. `resolve.dedupe: ['react','react-dom','zod']`. |
| `apps/mcp-server/color-picker.html` + `src/color-picker-main.tsx` + `src/ColorPickerApp.tsx` | A **second iframe entry point** — separate HTML file at the root, separate Vite multi-page input. This is the pattern for shipping a second mini-app from the same Vite project. |

### 2c. Host / chat-ui (the model for our outer page surface that renders the iframe and consumes registered tools)

| Path | Purpose |
|------|---------|
| `apps/chat-ui/src/hooks/useIframeLifecycle.ts` | Returns `setupIframe(iframe, sourceId)`. Listens for `ui-lifecycle-iframe-ready`, posts `parent-ready`, then constructs an MCP `Client` + `IframeParentTransport({ iframe, targetOrigin })`, calls `client.listTools()`, hands the tools to `registerWebMcpTools`, subscribes to `ToolListChangedNotificationSchema`. |
| `apps/chat-ui/src/hooks/useIframeResize.ts` | Listens for `{type:'ui-size-change', payload:{width,height}}` and sets `iframe.style.{width,height}` plus an optional scale to fit container. |
| `apps/chat-ui/src/hooks/useWebMCPIntegration.ts` | Reducer-ish hook holding `Map<sourceId, Client>` and a flattened `MCPTool[]` list with each tool tagged `_sourceId`. Provides `callTool(request, sourceId)` for routing. |
| `apps/chat-ui/src/hooks/useMCPConnection.ts`, `useMCP.tsx`, `useElicitationProtocol.ts` | Plumbing for the upstream's remote MCP server connection. Irrelevant for us (we have no remote MCP). |
| `apps/chat-ui/src/contexts/MCPContext.tsx`, `UIResourceContext.tsx` | React contexts. `UIResourceContext` stores cleanup functions per sourceId — `useIframeLifecycle` registers a cleanup that calls `client.close()` and `unregisterWebMcpClient(sourceId)`. |
| `apps/chat-ui/src/components/assistant-ui/*` | Chat thread / message rendering. Wherever it sees a `ui://…` resource it renders an `<iframe>` and calls `setupIframe(...)` on load. |

### 2d. npm-packages support (the runtime glue)

Repo: `github.com/WebMCP-org/npm-packages`.

| Path | Purpose |
|------|---------|
| `packages/transports/src/IframeChildTransport.ts` | Server-side transport used **inside** the iframe. Posts `{channel:'mcp-iframe', type:'mcp', direction:'server-to-client', payload:'mcp-server-ready'}` to parent on start, then replays JSON-RPC messages from `direction:'client-to-server'`. Origin-checks against `allowedOrigins`. |
| `packages/transports/src/IframeParentTransport.ts` | Client-side transport used by the **host**. Posts `payload:'mcp-check-ready'` to `iframe.contentWindow`; resolves a `serverReadyPromise` when it sees `mcp-server-ready`; thereafter ships JSON-RPC. |
| `packages/transports/src/{TabServer,TabClient}Transport.ts` | Same protocol but using `window.postMessage(message, '*')` on `window` itself (for same-tab non-iframe scenarios — e.g., extension contexts). |
| `packages/react-webmcp/src/useWebMCP.ts` | The React hook the iframe app uses. Wraps `navigator.modelContext.registerTool({...descriptor, execute}, { signal })` with effect cleanup via `AbortController.abort()`. Converts Zod schemas to JSON Schema via `zod-utils`. |
| `packages/global/src/global.ts` | `initializeWebModelContext` — installs the polyfill, instantiates `BrowserMcpServer`, picks the right transport (`IframeChildTransport` if `window.parent !== window`, otherwise `TabServerTransport`), replaces `navigator.modelContext` with the server, calls `server.connect(transport)`. |
| `packages/webmcp-polyfill` | Provides `navigator.modelContext` shim if the browser doesn't have it natively. |
| `packages/webmcp-ts-sdk` | Defines the `BrowserMcpServer`, `Transport` interface, `JSONRPCMessage` types. |
| `packages/usewebmcp` | A leaner alternative to `react-webmcp` that bypasses the polyfill — talks directly to the native `navigator.modelContext`. |

---

## 3. Verbatim code excerpts — the five load-bearing pieces

### 3.1 On-mount tool registration (inside the iframe)

`apps/mcp-server/src/main.tsx`:

```typescript
import { initializeWebModelContext } from '@mcp-b/global';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';

// ... installPartialNativeApiShims() omitted (Chrome Beta 147 fix-up)

installPartialNativeApiShims();

initializeWebModelContext({
  transport: {
    tabServer: {
      allowedOrigins: ['*'], // Allow any origin for iframe communication
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
```

Note: even though the option says `tabServer`, `initializeWebModelContext` checks `window.parent !== window` and silently swaps to `IframeChildTransport` when embedded. You pass the same config either way.

`apps/mcp-server/src/App.tsx` — the three tool registrations (inside the React component body, identical pattern for each):

```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

useWebMCP({
  name: 'tictactoe_get_state',
  description: 'Get the current Tic-Tac-Toe state including board layout, roles, and game status.',
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async () =>
    formatGameStateMarkdown(game.board, game.currentPlayer, game.winner, game.humanPlayer, game.aiPlayer),
});

useWebMCP({
  name: 'tictactoe_ai_move',
  description: `Play as Player ${game.aiPlayer} (Clankers 🤖). Provide a board position (0-8) to place your ${game.aiPlayer}.`,
  inputSchema: {
    position: z.number().int().min(0).max(8)
      .describe('Cell position (0-8) in row-major order where Clankers 🤖 should move.'),
  },
  annotations: { idempotentHint: false },
  handler: async ({ position }) => {
    if (showRoleModal) {
      throw new Error('Cannot move yet: waiting for the human to start a new game.');
    }
    const result = game.makeMove(position, game.aiPlayer);
    if (!result.success) {
      throw new Error(result.error);
    }
    setIsAIThinking(false);
    return formatMoveMarkdown(game.aiPlayer, position, result.board, result.status, result.nextPlayer, game.humanPlayer, game.aiPlayer);
  },
});

useWebMCP({
  name: 'tictactoe_reset',
  description: 'Reset the board and keep the current human/AI role assignments.',
  annotations: { destructiveHint: true, idempotentHint: true },
  handler: async () => {
    game.reset();
    setIsAIThinking(false);
    setShowRoleModal(true);
    return formatResetMarkdown(game.board, game.humanPlayer, game.aiPlayer);
  },
});
```

Lifecycle: every `useWebMCP` effect calls `modelContext.registerTool(descriptor, { signal })` once on mount. On unmount it aborts the signal, which the polyfill / `BrowserMcpServer` treats as "remove this tool" and fires a `ToolListChangedNotification` to the host.

### 3.2 Tool handler that returns the UI resource (out-of-process MCP worker)

`apps/mcp-server/worker/mcpServer.ts` (the `showTicTacToeGame` registration). This is what an external MCP server-style adapter would do; for us the agent is in-page and we don't need it, but the **content shape** maps directly to what our card carousel returns.

```typescript
this.server.registerTool(
  'showTicTacToeGame',
  {
    description: `Displays an interactive Tic-Tac-Toe game ...`,
    inputSchema: {},
  },
  async () => {
    const iframeUrl = `${this.env.APP_URL}/`;
    const uiResource = createUIResource({
      uri: 'ui://tictactoe-game',
      content: { type: 'externalUrl', iframeUrl },
      encoding: 'blob',
    });

    return {
      content: [
        { type: 'text', text: '# Tic-Tac-Toe Game Started\n\n...instructions...' },
        uiResource,
      ],
    };
  }
);
```

`createUIResource` from `@mcp-ui/server` returns:

```json
{
  "type": "resource",
  "resource": {
    "uri": "ui://tictactoe-game",
    "mimeType": "text/uri-list",   // for externalUrl encoded as blob
    "blob": "<base64 of the iframe URL>"
  }
}
```

The host (chat-ui) detects `uri` starts with `ui://` and renders the resource as an iframe. **This is the only contract.** No magic.

### 3.3 Iframe HTML — how is the iframe "built"?

There is **no inline HTML string and no blob URL** in this demo. The iframe simply points at a same-origin URL served as a static asset. The Cloudflare worker `worker/index.ts` returns the Vite-built `dist/client/index.html` for `/`.

`apps/mcp-server/index.html` (the source the host iframe loads after Vite build):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The colour-picker demo demonstrates a second entry point: `color-picker.html` at the same root, with `src/color-picker-main.tsx` referenced from it. Vite handles multi-page input automatically when both HTML files exist at the project root.

### 3.4 Iframe-side bridge (postMessage)

From `packages/transports/src/IframeChildTransport.ts`:

```typescript
async start(): Promise<void> {
  this._messageHandler = (event: MessageEvent) => {
    if (!this._allowedOrigins.includes(event.origin) && !this._allowedOrigins.includes('*')) return;
    if (event.data?.channel !== this._channelId || event.data?.type !== 'mcp') return;
    if (event.data?.direction !== 'client-to-server') return;

    this._clientOrigin = event.origin;
    const payload = event.data.payload;

    if (typeof payload === 'string' && payload === 'mcp-check-ready') {
      this.broadcastServerReady();
      return;
    }

    try {
      const message = JSONRPCMessageSchema.parse(payload);
      this.onmessage?.(message);
    } catch (error) { /* … */ }
  };

  window.addEventListener('message', this._messageHandler);
  this._started = true;
  this.broadcastServerReady();
}

private broadcastServerReady() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      channel: this._channelId,        // default 'mcp-iframe'
      type: 'mcp',
      direction: 'server-to-client',
      payload: 'mcp-server-ready',
    }, '*');
  }
}

async send(message: JSONRPCMessage): Promise<void> {
  // Server pushes JSON-RPC responses + notifications back through:
  window.parent.postMessage({
    channel: this._channelId,
    type: 'mcp',
    direction: 'server-to-client',
    payload: message,                   // a JSON-RPC envelope
  }, this._clientOrigin);
}
```

So **registering a tool** inside the iframe ultimately becomes a JSON-RPC `notifications/tools/list_changed` message posted to the parent — emitted by `BrowserMcpServer` whenever its tool registry mutates. The host then calls `client.listTools()` to refresh.

The user-visible `ui-size-change` / `notify` messages are a **separate channel** posted directly by `useParentCommunication`, not part of the MCP JSON-RPC stream:

```typescript
// useParentCommunication.ts
window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');   // on mount
window.parent.postMessage({ type: 'ui-size-change', payload: { height, width } }, '*');
window.parent.postMessage({ type: 'notify',         payload: { message: '...md...' } }, '*');
```

### 3.5 Host-side bridge (`apps/chat-ui/src/hooks/useIframeLifecycle.ts`)

```typescript
import { IframeParentTransport } from '@mcp-b/transports';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

const setupIframe = useCallback(async (iframe: HTMLIFrameElement, sourceId: string) => {

  // ① Readiness handshake — answer the iframe's ui-lifecycle-iframe-ready
  const handleIframeLifecycleMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    if (event.data?.type === 'ui-lifecycle-iframe-ready') {
      iframe.contentWindow?.postMessage({ type: 'parent-ready', payload: {} }, '*');
    }
  };
  window.addEventListener('message', handleIframeLifecycleMessage);

  // ② Stand up an MCP client over the postMessage transport
  const client = new Client({ name: 'WebMCP Client', version: '1.0.0' });
  const transport = new IframeParentTransport({
    targetOrigin: new URL(getStoredServerUrl()).origin,
    iframe,
  });
  await client.connect(transport);

  // ③ Register the client + initial tool list
  registerWebMcpClient(sourceId, client);
  const toolsResponse = await client.listTools();
  registerWebMcpTools(toolsResponse.tools, sourceId);

  // ④ Refresh on tool registry changes (this is what fires when a useWebMCP
  //    component mounts/unmounts inside the iframe)
  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    const updated = await client.listTools();
    registerWebMcpTools(updated.tools, sourceId);
  });

  // ⑤ Cleanup — invoked when the chat thread tears down the resource
  setResourceCleanup(sourceId, async () => {
    window.removeEventListener('message', handleIframeLifecycleMessage);
    await client.close();
    await transport.close();
    unregisterWebMcpClient(sourceId);
  });
}, [...]);
```

And the size handler (`apps/chat-ui/src/hooks/useIframeResize.ts`):

```typescript
const handleMessage = (event: MessageEvent) => {
  if (event.data?.type !== 'ui-size-change') return;
  const payload = event.data.payload as { height?: number; width?: number };
  const iframe = iframeRef?.current;
  if (!iframe || !payload.height) return;

  iframe.style.width  = `${payload.width}px`;
  iframe.style.height = `${payload.height}px`;

  // optional: scale-down if wider than container
  const container = iframe.parentElement;
  if (container && payload.width) {
    const targetWidth = container.clientWidth * 0.95;
    const scale = Math.min(targetWidth / payload.width, 1);
    if (scale < 1) {
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top center';
      iframe.style.marginBottom = `${payload.height * (scale - 1)}px`;
    }
  }
};
```

The iframe app fires `ui-size-change` once after layout (inside a `requestAnimationFrame` once the parent is ready). The upstream doc says a `ResizeObserver` is "optional" — the demo opts out and only notifies once.

---

## 4. Mapping to our Recipe Workbench

| Upstream concept                                              | Recipe Workbench equivalent |
|---|---|
| MCP worker tool `showTicTacToeGame` returning a `ui://` resource | A page-level handler we register as `searchRecipes` via `navigator.modelContext.registerTool`. Its return value is a **UI resource** describing a recipe-card carousel. |
| `createUIResource({ uri:'ui://tictactoe-game', content:{type:'externalUrl', iframeUrl} })` | We choose between two encodings. The simplest: `content: { type: 'rawHtml', htmlString: <ourCarouselHTML> }`. We don't have an external worker, so we don't need `externalUrl`. |
| Same-origin iframe served from `APP_URL/` | Our SPA already has the carousel React tree. We can either (a) serve it via a second Vite entry like `webmcp-iframe.html` and point at `${origin}/webmcp-iframe.html?sessionId=...`, or (b) serve raw HTML + an inline `<script type="module" src="/webmcp-iframe.js">` if we want zero extra routes. Recommended: **option (a)** — a second Nx target builds a thin iframe bundle next to the chat bundle. |
| `tictactoe_make_move(position)` registered from inside the iframe | `commitRecipeToPlan({ recipeId, day, slot })` registered from inside the carousel iframe when the user clicks "Pick". |
| `tictactoe_reset` | `clearRecipeSelection` (or a `resetCarousel` tool) — useful for demo polish but not on the critical path. |
| `tictactoe_get_state` (read-only) | `getCarouselSelection` — returns currently picked recipe IDs in JSON. Optional. |
| Game state in `useGameState` hook | Recipe list state in a `useRecipeCarousel` hook backed by IndexedDB (per CLAUDE.md). |
| "Render the game UI" | "Render the recipe-card carousel" (`<RecipeCard/>` × N inside a horizontal scroller). Tailwind dark mode mirrors the parent's `ThemeProvider` because each iframe ships its own CSS. |
| `useParentCommunication` (readiness + size) | Identical hook; we can copy it verbatim and rename. |
| Cloudflare worker plumbing | **Delete entirely.** We have no backend. |
| `@mcp-b/transports`, `@mcp-b/global`, `@mcp-b/react-webmcp` | These are the only npm deps we adopt. They are framework-agnostic and ship as ESM. |
| `useIframeLifecycle` + `useWebMCPIntegration` + `useIframeResize` in chat-ui | A single `useWebMCPIframe` hook on our `/webmcp` page. Because we have only one iframe at a time (just the carousel), `Map<sourceId, Client>` collapses to a single optional `Client | null`. |

### Suggested file layout under `chat/src/app/webmcp/`

```
chat/src/app/webmcp/
├── WebMcpPage.tsx              # /webmcp route — header, log panel, hosts the iframe
├── RecipeCarouselFrame.tsx     # the <iframe> + onLoad → setupIframe wiring
├── hooks/
│   ├── useWebMcpIframe.ts      # ports useIframeLifecycle + useWebMCPIntegration
│   └── useIframeResize.ts      # straight copy with style tweaks
├── tools/
│   └── searchRecipesTool.ts    # registers searchRecipes on navigator.modelContext at /webmcp mount
├── iframe/                     # this becomes the SECOND Vite bundle
│   ├── index.html              # standalone HTML shipped at /webmcp-iframe.html
│   ├── main.tsx                # initializeWebModelContext + createRoot
│   ├── CarouselApp.tsx         # the actual React tree the user sees in the iframe
│   ├── useParentCommunication.ts  # ported
│   └── index.css               # Tailwind bundle for the iframe
└── docs/webmcp.md              # explainer page (already exists per current milestone)
```

Outer page registers `searchRecipes`; that handler returns a `ui://recipe-carousel` resource (rawHtml or a URL to `/webmcp-iframe.html?session=…`). The host (the page itself) detects the resource and mounts `<RecipeCarouselFrame/>`. Once the iframe loads, it registers `commitRecipeToPlan` back. The agent (or the in-page demo runner) calls it.

---

## 5. Build / bundling notes for our Nx + webpack setup

The upstream uses Vite. We use Nx with webpack (`@nx/react:application`). Two concrete options:

### Option A (recommended): second webpack entry point for the iframe

In `chat/project.json` the `build` target already points at `chat/webpack.config.js`. We can use webpack's multi-entry support:

```js
module.exports = {
  entry: {
    main: './src/main.tsx',
    'webmcp-iframe': './src/app/webmcp/iframe/main.tsx',
  },
  // ...HtmlWebpackPlugin for each entry
};
```

Pair with two `HtmlWebpackPlugin` instances — one outputs `index.html` (chunks: `['main']`), the other outputs `webmcp-iframe.html` (chunks: `['webmcp-iframe']`). The iframe entry calls `initializeWebModelContext({ transport: { tabServer: { allowedOrigins: ['*'] } } })` before React renders, then mounts `<CarouselApp/>`.

Pros: zero new tooling, both bundles share the same node_modules (deduped React, deduped zod), and we can deploy a single S3 prefix.

Pitfalls:
- React must be deduped. The chat bundle already includes React 19, the iframe bundle must use the **same** copy or you'll burn ~50KB twice. Webpack's `optimization.splitChunks` with `chunks: 'all'` plus `runtimeChunk: 'single'` handles this if both entries live in the same compilation. If we lazy-load the iframe bundle as a separate compilation we'll just accept the cost — it's still ~150KB gzipped.
- Tailwind must also bundle into both — confirm `chat/src/styles.css` is imported by both entry files or run Tailwind twice.

### Option B: inline `rawHtml` (no extra bundle)

`createUIResource({ uri:'ui://recipe-carousel', content: { type:'rawHtml', htmlString: '<…full HTML doc…>' } })`. The host renders this in a sandboxed `<iframe srcdoc=…>`. Inside the doc we inline a `<script type="module">` that imports `@mcp-b/global` + a tiny vanilla-JS carousel.

Pros: no second webpack entry.

Pitfalls:
- We lose React inside the iframe — must rewrite the carousel UI in vanilla JS (or ship Preact via CDN).
- `srcdoc` documents are same-origin but anonymous — `event.origin` is `"null"` from the parent's perspective. `IframeParentTransport`'s origin check (`event.origin !== this._targetOrigin`) will reject everything unless we pass `targetOrigin: 'null'` or pass `'*'`. The transport library does support `'*'`, but it weakens security.
- Long HTML strings ship inside a JSON-RPC envelope → ugly debugging.

**Recommendation: Option A.** It mirrors the upstream demo, keeps React + Tailwind, and the second bundle is a one-time webpack tweak.

### What our `searchRecipes` tool returns

Because we have no remote MCP transport, the outer page registers the tool directly:

```typescript
navigator.modelContext.registerTool({
  name: 'searchRecipes',
  description: 'Search the recipe library and return a card carousel UI.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'free-text search' },
      tags:  { type: 'array', items: { type: 'string' } },
    },
  },
  async execute({ query, tags }) {
    const results = await recipeStore.search({ query, tags });
    const iframeUrl = `${location.origin}/webmcp-iframe.html?session=${session}`;
    sessionResults.set(session, results); // hand-off so the iframe can fetch them on mount
    return {
      content: [
        { type: 'text', text: `Found ${results.length} recipes. Use commitRecipeToPlan to pick.` },
        {
          type: 'resource',
          resource: {
            uri: `ui://recipe-carousel/${session}`,
            mimeType: 'text/uri-list',
            text: iframeUrl,
          },
        },
      ],
    };
  },
});
```

The host (same page) listens for that resource and renders an `<iframe src={iframeUrl}>`. The session ID lets the iframe pull its dataset back via `postMessage({type:'ui-request-data', requestType:'recipes'})` or a simple `IndexedDB.get(session)`.

---

## 6. Known limitations / hacks in the upstream

Things we should be aware of, copied from the upstream code + ARCHITECTURE.md:

1. **Chrome Beta 147 native API gap.** The native `navigator.modelContext.registerTool` on Chrome Beta 147 ignores the `{ signal }` second argument, so abort-based unregistration is a no-op. The `useWebMCP` hook's cleanup function silently does nothing in that environment. Mitigation: ship `@mcp-b/global` (which installs the polyfill that respects signals). Our CLAUDE.md says native-only and Chrome 146 Canary; this is the polyfill-vs-native trade-off we already flagged.
2. **The `installPartialNativeApiShims()` block in `main.tsx`** patches `navigator.modelContextTesting.listTools`/`getRegisteredTools` symmetry — needed because different Chrome builds expose different testing-API names. We can copy this if we hit the same warnings, or skip it entirely.
3. **`allowedOrigins: ['*']`** is used everywhere in the demo. Fine for local-only milestone; for any future deploy we must tighten both directions.
4. **`useIframeResize` only handles one-shot resizes.** The upstream sends `ui-size-change` exactly once after first paint. If the carousel's content grows (e.g., user expands a card), the iframe won't resize until we wire up a `ResizeObserver` (EMBEDDING_PROTOCOL.md sketches this pattern but the demo skips it).
5. **`event.source !== iframe.contentWindow` filter in `setupIframe`.** Critical when the host page hosts multiple iframes — without it readiness messages from one iframe would trigger another's `parent-ready`. We only ever have one carousel, but copy the guard anyway.
6. **Stale docs.** `apps/mcp-server/ARCHITECTURE.md` still references `TicTacToe.tsx`/`TicTacToeWithWebMCP.tsx`, which no longer exist. The real entry is `src/App.tsx`. Don't be misled.
7. **`encoding: 'blob'`** in `createUIResource` base64-encodes the iframe URL. `'text'` works too and is easier to debug. Pick `'text'` for the demo.
8. **The `notify` channel and the MCP JSON-RPC channel are separate.** `useParentCommunication.postNotifyMarkdown` is a UX-only side channel for the chat thread to log "Move accepted at position 4" without polluting the tool-result content. It is **not** part of WebMCP. Our demo can skip it or use it for an in-page log panel.
9. **Tool descriptions are dynamic.** Look at `description: \`Play as Player ${game.aiPlayer}…\`` — the description string interpolates state. Because `useWebMCP`'s effect depends on `[name, description, …]`, every state change re-registers the tool. This is intentional (the agent always sees a fresh description) but means tool list churn is noisy. Our `commitRecipeToPlan` description probably wants to be **static** so we don't thrash.
10. **No origin-pinning by the polyfill.** When the iframe is hosted on a different origin than the parent (e.g., S3 prefix vs custom domain), `IframeParentTransport` requires the host to pass `targetOrigin` explicitly. The upstream pulls this from `getStoredServerUrl()`. For our same-origin demo we can pass `location.origin`.

---

## Sources

- [WebMCP-org/mcp-ui-webmcp (primary)](https://github.com/WebMCP-org/mcp-ui-webmcp)
- [apps/mcp-server/src/App.tsx](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/src/App.tsx)
- [apps/mcp-server/src/main.tsx](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/src/main.tsx)
- [apps/mcp-server/src/hooks/useParentCommunication.ts](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/src/hooks/useParentCommunication.ts)
- [apps/mcp-server/worker/mcpServer.ts](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/worker/mcpServer.ts)
- [apps/chat-ui/src/hooks/useIframeLifecycle.ts](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/chat-ui/src/hooks/useIframeLifecycle.ts)
- [apps/chat-ui/src/hooks/useIframeResize.ts](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/chat-ui/src/hooks/useIframeResize.ts)
- [apps/chat-ui/src/hooks/useWebMCPIntegration.ts](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/chat-ui/src/hooks/useWebMCPIntegration.ts)
- [apps/mcp-server/ARCHITECTURE.md](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/ARCHITECTURE.md)
- [apps/mcp-server/EMBEDDING_PROTOCOL.md](https://github.com/WebMCP-org/mcp-ui-webmcp/blob/main/apps/mcp-server/EMBEDDING_PROTOCOL.md)
- [WebMCP-org/npm-packages (transports + react-webmcp + global)](https://github.com/WebMCP-org/npm-packages)
- [packages/transports/src/IframeChildTransport.ts](https://github.com/WebMCP-org/npm-packages/blob/main/packages/transports/src/IframeChildTransport.ts)
- [packages/transports/src/IframeParentTransport.ts](https://github.com/WebMCP-org/npm-packages/blob/main/packages/transports/src/IframeParentTransport.ts)
- [packages/react-webmcp/src/useWebMCP.ts](https://github.com/WebMCP-org/npm-packages/blob/main/packages/react-webmcp/src/useWebMCP.ts)
- [packages/global/src/global.ts](https://github.com/WebMCP-org/npm-packages/blob/main/packages/global/src/global.ts)
- [Live demo](https://mcp-ui.mcp-b.ai)
