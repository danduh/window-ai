# Generative UI API — MCP Apps SEP-1865 guide

This guide documents the **MCP Apps (SEP-1865)** pattern used by the `/generative-ui` demo page: how the in-page agent registers UI-returning tools, how the host renders interactive iframes inside chat bubbles, and how the bidirectional postMessage protocol lets iframe widgets call back into page-registered tools without re-entering the model.

> **Draft API.** MCP Apps / SEP-1865 is a working proposal layered on top of the [W3C WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/) (April 2026) and the [Model Context Protocol specification](https://github.com/modelcontextprotocol/specification). The API is moving; do not ship to production.

## What is MCP Apps (SEP-1865)?

MCP Apps extends the WebMCP tool-registration surface with a richer result wire format. A normal WebMCP tool returns plain data. An MCP Apps tool can return, alongside its text content, a `_meta['ui.resourceUri']` field — a URI the host resolves to a sandboxed iframe it renders directly inside the chat bubble.

The wire format is:

- Tools return `{ content: [...], _meta: { 'ui.resourceUri': string } }`.
- The host detects `_meta['ui.resourceUri']`, renders the referenced iframe, and feeds back **only** `{ content }` to `session.prompt()` — the `ui://` URI never leaks into model context.

This gives the model a way to produce interactive, visually rich results without understanding rendering details. The model calls `searchRecipes`, gets "Found 6 recipes" as its text result, and the user sees a pick-from-carousel card — all via a single JSON shape.

## Tool result wire format

Every MCP Apps UI-returning tool returns this TypeScript shape:

```typescript
interface ToolResultWithUIResource {
  content: Array<{ type: 'text'; text: string }>;
  _meta?: { 'ui.resourceUri'?: string; [key: string]: unknown };
}
```

The `_meta['ui.resourceUri']` value is a `ui://` scheme URI that the host resolves to an iframe `src` or `srcdoc`. The `content` array carries the model-readable summary that gets fed back to `session.prompt()`.

A real `searchRecipes` result looks like this:

```json
{
  "content": [{ "type": "text", "text": "Found 6 recipes" }],
  "_meta": {
    "ui.resourceUri": "ui://gen-ui/carousel/a7f3d9b2-...",
    "genUI.recipeCount": 6
  }
}
```

The host reads `_meta['ui.resourceUri']`, looks up the carousel HTML from `recipeCarouselRegistry` (keyed by the UUID token), and renders it in a sandboxed iframe. Only `{ "content": [...] }` is passed back to the model.

The `searchRecipes` tool that produces this result (from `chat/src/app/services/genUITools.ts`):

```typescript
{
  name: 'searchRecipes',
  description:
    'Search the recipe library by optional ingredient and optional max cooking time. Returns a recipe-card carousel UI resource for the user to pick from.',
  inputSchema: {
    type: 'object',
    properties: {
      ingredient: {
        type: 'string',
        description: 'Filter by ingredient name (case-insensitive partial match)',
      },
      maxMinutes: {
        type: 'number',
        description: 'Filter by maximum total cooking time in minutes',
      },
    },
    required: [],
  },
  // No annotations.visibility — this tool is visible to the LLM (GENUI-04).
  execute: async (input: unknown): Promise<unknown> => {
    const args = (input as Record<string, unknown>) ?? {};

    // Fetch full library from IndexedDB
    let filtered = await getRecipes();

    // Apply ingredient filter (case-insensitive contains against searchableIngredients)
    if (args['ingredient']) {
      const needle = (args['ingredient'] as string).toLowerCase();
      filtered = filtered.filter((r) =>
        r.searchableIngredients?.some((i) => i.toLowerCase().includes(needle)),
      );
    }

    // Apply maxMinutes filter (recipes without totalMinutes are treated as Infinity → excluded)
    if (args['maxMinutes'] != null) {
      const max = args['maxMinutes'] as number;
      filtered = filtered.filter((r) => (r.totalMinutes ?? Infinity) <= max);
    }

    // Store results in registry so ChatBox can look them up by token
    const token = crypto.randomUUID();
    recipeCarouselRegistry.setRecipes(token, filtered);

    // Return MCP-Apps shape: content for model + _meta for the host UI layer
    return {
      content: [{ type: 'text', text: `Found ${filtered.length} recipes` }],
      _meta: {
        'ui.resourceUri': `ui://gen-ui/carousel/${token}`,
        'genUI.recipeCount': filtered.length,
      },
    };
  },
}
```

The host-side `_meta` interceptor in `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` enforces the GENUI-10 invariant — `ui://` never reaches the model:

```typescript
const meta = resultObj?._meta as Record<string, unknown> | undefined;

// Only treat as a string value — guard against non-string values in _meta.
const uiResourceUri =
  typeof meta?.['ui.resourceUri'] === 'string'
    ? (meta['ui.resourceUri'] as string)
    : undefined;

if (uiResourceUri !== undefined) {
  // Extract caption from content[0].text, fallback to 'Recipes'.
  const captionText =
    (resultObj?.content as Array<{ text?: string }> | undefined)?.[0]?.text ?? 'Recipes';

  // Append the iframe-carousel bubble to the transcript.
  // ChatBox renders a UIResourceFrame when message.uiResourceUri is set.
  addMessage(captionText, 'Bot', uiResourceUri);

  // Feed back ONLY { content } to the model — _meta is intentionally stripped.
  // This is the GENUI-10 invariant: ui:// NEVER appears in session.prompt() input.
  toolResultForModel = JSON.stringify({ content: resultObj?.content });
} else {
  // No ui.resourceUri — plain text or JSON result, safe to pass back as-is.
  toolResultForModel =
    typeof result === 'string' ? result : JSON.stringify(result);
}
```

The `console.assert` variant in earlier builds made the invariant explicit: `console.assert(!promptText.includes('ui://'), 'GENUI-10 violated — ui:// in model prompt')`.

## Sandbox model

The demo uses a **double-iframe** sandbox:

- **Outer iframe** — `sandbox="allow-scripts allow-same-origin"`, disposable null origin (served as `srcdoc`). Acts as a relay between the inner iframe and the React host. The outer iframe's only jobs are: (1) relay `postMessage` in both directions, and (2) hold the inner iframe's DOM at arm's length from the host page.
- **Inner iframe** — `sandbox="allow-scripts"` only (no `allow-same-origin`). Serves the carousel HTML from an inline `srcdoc` string. CSP baseline: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:`. This prevents a malicious tool result from loading external scripts, fetching remote resources, or breaking out into the host origin.

Why two iframes instead of one? `allow-same-origin` is required for `srcdoc` iframes to receive `postMessage` from the same-origin host, but granting `allow-same-origin` to the carousel iframe would allow carousel scripts to access `localStorage`, `IndexedDB`, and `document.cookie` on the host origin. The outer iframe acts as a relay that can hold `allow-same-origin` (needed for postMessage routing) while keeping the inner carousel script at null-origin with only `allow-scripts`.

The `carouselTemplate.ts` file embeds the CSP as a `<meta>` tag inside the inner iframe's `srcdoc`, providing defense-in-depth alongside the `sandbox` attribute. The inline CSS avoids any external stylesheet loading, and all images use `data:` URIs if needed.

## postMessage protocol (JSON-RPC 2.0)

All communication between the React host and the inner iframe travels as JSON-RPC 2.0 messages routed through the outer shell's relay script. The outer shell forwards transparently — the host and inner iframe see only these method names:

| Direction | Method | Payload (`params`) | Response |
|---|---|---|---|
| iframe → host (request) | `ui/initialize` | `{ protocolVersion, clientInfo }` | `{ protocolVersion, hostInfo, hostContext }` |
| iframe → host (notification) | `ui/notifications/initialized` | `{}` | — |
| iframe → host (notification) | `ui/notifications/size-changed` | `{ height }` | — |
| host → iframe (notification) | `ui/notifications/host-context-changed` | `{ theme, displayMode?, containerDimensions? }` | — |
| iframe → host (request) | `tools/call` | `{ name, arguments }` | result of `tool.execute(arguments)` |

The host queues outbound messages in a `pendingOutbound` array until the outer iframe's `load` event fires. This pre-load queue (visible in `bridge.ts` as `pendingOutbound`) ensures messages sent before the iframe has fully loaded are not lost. Once `load` fires, the queue is flushed FIFO and all subsequent messages are sent immediately.

The host accepts only messages where `event.source === outerIframe.contentWindow` — a source-equality guard that prevents spoofed messages from other frames on the page. Because sandboxed `srcdoc` iframes have `event.origin === "null"`, origin string comparison is insufficient; source-object equality is the correct check.

The iframe-side `tools/call` request from the Pick button click handler in `chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts`:

```typescript
// Delegated click handler for Pick buttons
document.addEventListener('click', function(event) {
  var target = event.target;
  if (!target || !target.matches || !target.matches('.pick-btn[data-recipe-id]')) return;
  var button = target;
  var recipeId = button.getAttribute('data-recipe-id');
  if (!recipeId) return;

  button.disabled = true;
  button.style.opacity = '0.6';

  sendRequest('tools/call', { name: 'commitRecipeToPlan', arguments: { recipeId: recipeId } })
    .then(function() {
      button.textContent = 'Added!';
      setTimeout(function() {
        button.textContent = 'Pick';
        button.disabled = false;
        button.style.opacity = '';
      }, 2000);
    })
    .catch(function() {
      button.textContent = 'Tools unavailable';
      button.style.background = '#6b7280';
    });
});
```

The wire-level JSON-RPC payload for a `tools/call` request looks like this:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": { "name": "commitRecipeToPlan", "arguments": { "recipeId": "lemon-garlic-chicken-skillet" } }
}
```

The host's `handleMessage` function in `bridge.ts` routes this to the registered tool's `execute` handler and posts the result back as a JSON-RPC response.

## Bidirectional pattern (UI-returning tools + hidden helpers)

The `/generative-ui` page registers two tools:

1. **`searchRecipes`** — visible to the LLM (no `annotations.visibility`). The model calls it when the user asks to search for recipes. It returns `_meta['ui.resourceUri']`, triggering the host to render a recipe-card carousel iframe.

2. **`commitRecipeToPlan`** — a hidden helper with `annotations: { visibility: ['app'] }`. The LLM cannot see or call this tool; it is invisible to the model's tool catalog. Only the iframe (via the `tools/call` JSON-RPC method) can invoke it.

The `commitRecipeToPlan` tool descriptor (from `chat/src/app/services/genUITools.ts`):

```typescript
{
  name: 'commitRecipeToPlan',
  description: 'Add a recipe to the current meal plan',
  inputSchema: {
    type: 'object',
    properties: {
      recipeId: { type: 'string', description: 'The ID of the recipe to add' },
      servings: {
        type: 'number',
        description: 'Number of servings (optional, defaults to recipe default)',
      },
    },
    required: ['recipeId'],
  },
  // GENUI-05: hidden from LLM; only the iframe Pick button calls this via the bridge.
  annotations: { visibility: ['app'] },
  // execute receives input as unknown and narrows internally (no any at public API surface).
  execute: async (input: unknown): Promise<unknown> => {
    const typedInput = input as { recipeId: string; servings?: number };
    const { recipeId, servings } = typedInput;
    await MealPlanStore.addToPlan({
      id: crypto.randomUUID(),
      recipeId,
      addedAt: Date.now(),
      servings,
    });
    // Fire-and-forget: notify the chat panel a recipe was committed. Do NOT await.
    onCommitCallback?.(recipeId);
    return { content: [{ type: 'text', text: 'Added to plan' }] };
  },
}
```

The `visibility: ['app']` annotation is a convention in this codebase's `ModelContextTool` type extension — it signals to the `GenUIChatPanel` dispatch loop that the tool should not appear in the model's prompt preamble. The model never sees `commitRecipeToPlan` in its context, so it cannot call it. Only the carousel iframe, via a direct `tools/call` JSON-RPC request over the postMessage bridge, reaches this handler.

This makes the carousel interactive without going back through the model: the user clicks Pick → the iframe sends `tools/call` → the host routes to `commitRecipeToPlan.execute` → the recipe appears in the meal-plan column → done. No LLM round-trip required.

## Try it

Navigate to [/generative-ui](/generative-ui) and ask the assistant: _"Find me something quick with chicken."_

> **WebMCP required (Chrome 149+ origin trial, or `chrome://flags/#enable-webmcp-testing` for local dev).** Without it, the page shows a banner (see `chat/src/app/components/MissingFlagBanner.tsx`). The carousel demo resolves the entry point via `getModelContext()` (`document.modelContext ?? navigator.modelContext` — the API moved to `document` in Chrome 150). The search and pick flow is native-only, no polyfill.

**Production readiness.** MCP Apps / SEP-1865 is a working draft, not a standard. The `_meta.ui.resourceUri` shape, the `visibility` annotation, and the JSON-RPC bridge protocol may all change before stabilization. This guide documents the implementation as of Chrome 150 (July 2026); `navigator.modelContext` is deprecated there in favor of `document.modelContext`. The `window.ai` / `LanguageModel` surface reached stable in Chrome 148.
