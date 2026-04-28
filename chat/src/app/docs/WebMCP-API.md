# WebMCP API — Recipe Workbench guide

WebMCP gives a web page a way to expose its in-page actions as discoverable, callable tools to AI agents — both an in-page LanguageModel agent and an external browser-resident agent (e.g. the Chrome 146 Canary Tool Inspector extension). The page calls `navigator.modelContext.registerTool(...)` once per tool it wants to expose; agents see those tools, call them, and the page's handler runs in the user's browser context with the user's session state.

This guide documents WebMCP as of the **W3C Draft Community Group Report dated April 23, 2026**. WebMCP is **not** a W3C Recommendation — the API is moving. See https://webmachinelearning.github.io/webmcp/ for the current spec.

> **Spec history.** Earlier drafts (≤ February 2026) defined `provideContext`, `unregisterTool`, and `clearContext` on the `ModelContext` interface. All three were removed in March 2026; the current IDL exposes a single method, `registerTool`. Unregistration is performed by aborting the `AbortSignal` passed at registration time.

## Overview

WebMCP is a browser-mediated alternative to running a local Model Context Protocol (MCP) server: the page itself IS the tool surface. Every tool is registered against the live page, runs with the user's signed-in session and DOM, and disappears when the page navigates away.

The shipped surface (Chrome 146+ Canary) is small:

- One global: `navigator.modelContext` (a `ModelContext` instance, available in secure contexts).
- One method: `registerTool(tool, options?)`.
- One descriptor shape: `{ name, description, inputSchema, execute, annotations? }`.

That's it. Tools are unregistered by aborting the `AbortSignal` passed at registration time — the current IDL exposes only one method, full stop. The history note above explains what was there in earlier drafts.

The page is the trust boundary. Anything the page's JavaScript can do — read IndexedDB, mutate DOM, hit a same-origin API with the user's cookies — a registered tool can do, because the tool's `execute` runs in the page's context. That's the whole value proposition: agents get to drive the page the user is already signed into, without any separate auth handshake.

## Browser Support

WebMCP is available behind a flag in:

- **Chrome 146+ Canary** — enable `chrome://flags/#WebMCP for testing` and set it to "For testing".
- **Microsoft Edge 147+** (added March 2026).

Other browsers do not implement `navigator.modelContext` as of April 2026. On those browsers, the Recipe Workbench page in this site shows a yellow banner (see `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx`) explaining how to enable the flag; the recipe browser itself stays usable for read-only browsing.

The page checks `'modelContext' in navigator` at mount time and falls back to the banner if absent. Tools registered against an undefined `navigator.modelContext` would throw, so the registration effect is guarded with the same check.

**Production readiness.** WebMCP is a Draft Community Group Report — not a W3C standard, not a stable API. The shape is expected to change before stabilization (targeted mid-to-late 2026). Don't ship to production yet.

## API Surface

The current IDL exposes exactly one method on `ModelContext`:

### `navigator.modelContext.registerTool(tool, options?)`

Registers a tool descriptor. The page becomes the handler — when an agent calls the tool, the descriptor's `execute` function runs in the page's JavaScript context.

**Parameters:**

- `tool: ModelContextTool` — the tool descriptor (see "Descriptor shape" below).
- `options?: { signal?: AbortSignal }` — when the signal aborts, the tool is unregistered.

**Returns:** `void`. Throws if a tool with the same `name` is already registered (Chrome 146 Canary surfaces this as a `DOMException` whose message contains "duplicate tool name" or "already registered").

**Lifetime.** A registered tool stays available until either (a) the page navigates away, or (b) the `AbortSignal` passed via `options.signal` aborts. There is no separate unregistration method on the IDL — abort the signal instead. In a React component, this maps cleanly onto a `useEffect` cleanup that calls `controller.abort()`.

### Descriptor shape

```ts
interface ModelContextTool {
  name: string;                 // unique within the page; agents address tools by this name
  description: string;          // free-form; agents use this for tool selection
  inputSchema?: object;         // JSON Schema for the input object
  annotations?: { readOnlyHint?: boolean };  // hints for agents (UX, caching)
  execute(input: Record<string, unknown>): Promise<unknown>;
}
```

The `inputSchema` is a standard JSON Schema object describing the parameters the agent must pass when invoking the tool. Keep it tight: only `type: 'object'` schemas are practical, with `properties`, `required`, and `additionalProperties: false` for safety. Agents that ship JSON-Schema-aware tool routers (most do) will reject mis-shaped inputs before `execute` ever runs.

The `execute` handler runs in the page's main thread. It receives the agent-supplied input as `Record<string, unknown>` (you must validate or narrow before use), and returns a `Promise<unknown>`. The agent receives the resolved value (the browser serializes it). Tools that surface to a `LanguageModel` chat session need their result coerced to a `Promise<string>` — see Sample 2.

### Field-by-field

- **`name`** (required) — the identifier the agent uses to address the tool. Per the W3C IDL, the regex is `[A-Za-z0-9_\-.]{1,128}` — alphanumerics, underscore, dash, dot, up to 128 characters. The agent prompt sees this string verbatim, so short, descriptive camelCase reads best (`scaleRecipe`, `swapIngredient`, `generateShoppingList`).
- **`description`** (required) — a free-form natural-language sentence that the agent uses to decide *when* to call this tool. Lead with the verb ("Scale a recipe to a new serving count..."), spell out side effects, and call out optional parameters. The model treats this as the primary documentation.
- **`inputSchema`** (optional) — JSON Schema for the input object. Always pass `type: 'object'`; agents that emit non-object inputs are not what this API was designed for. Set `additionalProperties: false` to reject typos. List `required` fields explicitly so the agent can't omit them.
- **`annotations`** (optional) — hints for agents about how to treat the tool. Currently the only widely-honored field is `readOnlyHint: boolean`; setting it to `true` lets agents reorder or cache the call. Setting it to `false` (or omitting it) tells the agent the tool mutates state.
- **`execute`** (required) — the handler. Async; receives the parsed input as `Record<string, unknown>` (you must validate it inside the function); returns `Promise<unknown>` whose resolved value is what the agent receives.

### Input schema example

A typical `inputSchema` for a single-required-parameter tool looks like this — the same shape Sample 1 uses for the real `scaleRecipe` descriptor:

```json
{
  "type": "object",
  "properties": {
    "servings": {
      "type": "integer",
      "minimum": 1,
      "description": "Target servings count"
    },
    "recipeId": {
      "type": "string",
      "description": "(optional) recipe id; defaults to active recipe"
    }
  },
  "required": ["servings"],
  "additionalProperties": false
}
```

Use plain JSON Schema types (`string`, `number`, `integer`, `boolean`, `array`, `object`, `null`). Nested objects are allowed but discouraged — agents do better with flat input shapes. Each property's `description` is a hint to the agent about what value to fill in; treat it as documentation, not a UI label.

### Registration patterns

Single mount-time registration is the simplest case (see Sample 1 below). For pages that register multiple tools, loop the array (Sample 2). Prefer one shared `AbortController` across all the tools registered by a single component — that way, the component's cleanup callback aborts every registration in one call. The full mounted pattern looks like the one in Sample 2; both consumers there share a single `controller`.

A registration call against an undefined `navigator.modelContext` (browser without the flag) throws synchronously. Always feature-detect with `'modelContext' in navigator` before calling, or wrap the loop in a try/catch and surface a fallback UI on failure.

### Lifecycle, in summary

1. **Mount** — page loads; React effect (or `DOMContentLoaded` handler) creates an `AbortController` and calls `registerTool` once per tool.
2. **Visibility** — agents (in-page or external) discover tools by reading from `navigator.modelContext`; Chrome's Tool Inspector extension surfaces them in DevTools.
3. **Invocation** — agent calls a tool by name with a JSON-Schema-shaped input; the browser routes the call to the registered descriptor's `execute`.
4. **Result** — `execute` resolves; the browser serializes the resolved value back to the agent. Errors thrown inside `execute` reject the call.
5. **Unmount** — page navigates away (implicit), or the component's cleanup calls `controller.abort()` (explicit). All registrations under that controller are torn down atomically.

There is no separate "connect" or "handshake" phase — registration IS the handshake. The agent doesn't ask the page for permission; the page advertises tools and the agent decides whether to call them.
