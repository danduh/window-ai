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

### Inspecting registered tools

Chrome 146 Canary ships an extension called the WebMCP Tool Inspector that surfaces every registered tool in the DevTools panel of the active page. To verify your registrations:

1. Open `chrome://extensions`, install the Tool Inspector extension (link in the W3C draft repository).
2. Open DevTools on the page, switch to the "WebMCP" panel.
3. The panel lists every registered tool with its `name`, `description`, schema, and `annotations`. Calling a tool from the panel routes through the same `execute` handler the agent would.

Pages without the extension can still spot-check via the DevTools console: in Chrome 146 Canary, `navigator.modelContext` exposes (non-standard) introspection helpers that vary by build. Treat these as debug-only — they are not part of the W3C draft and may disappear or change between releases.

### Errors and observability

A few error shapes worth handling explicitly:

- **`DOMException` on duplicate names.** Re-registering a tool with the same `name` (without first aborting the prior registration) throws synchronously. In a React effect, this typically means StrictMode is double-invoking your effect — abort the previous controller in the cleanup function.
- **`TypeError: Cannot read properties of undefined`.** The page is running outside a Secure Context (e.g. `http://`) or the user has not enabled the flag. Feature-detect via `'modelContext' in navigator` before calling.
- **Handler exceptions.** Anything thrown inside `execute` is propagated to the agent as a tool-call error. Wrap risky operations in try/catch and return a structured error shape (`{ ok: false, error: string }`) if you want the agent to recover gracefully rather than abort the conversation.

The browser does not surface tool-call telemetry to the page. If you need an audit trail (which tools were called, with what input, with what result), instrument it inside `execute` — log to your own backend or to a same-origin analytics endpoint.

## Code Sample 1: Single-Tool Registration

A single tool exposed via `navigator.modelContext.registerTool`. The descriptor below is a pruned version of the real `scaleRecipe` entry from `chat/src/app/services/recipeTools.ts` — same name, same description, same JSON Schema shape, with the handler inlined for self-contained reading.

```typescript
import type { Recipe } from '../models/recipe';
import { getRecipe, saveRecipe, getActiveRecipeId } from '../services/recipeStore';

const scaleRecipe: ModelContextTool = {
  name: 'scaleRecipe',
  description: 'Scale a recipe to a new serving count. All ingredient quantities are scaled proportionally.',
  inputSchema: {
    type: 'object',
    properties: {
      servings: { type: 'integer', minimum: 1, description: 'Target servings count' },
      recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
    },
    required: ['servings'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: async (input) => {
    const { servings, recipeId } = input as { servings: number; recipeId?: string };
    const recipe = await getRecipe(recipeId ?? getActiveRecipeId());
    const factor = servings / recipe.servings;
    const updated: Recipe = {
      ...recipe,
      servings,
      ingredients: recipe.ingredients.map(ing => ({ ...ing, quantity: ing.quantity * factor })),
    };
    await saveRecipe(updated);
    return { id: recipe.id, oldServings: recipe.servings, newServings: servings, factor };
  },
};

// Mount-time registration. Pass an AbortSignal — when aborted, the tool is
// torn down. The current IDL has no separate teardown method.
const controller = new AbortController();
navigator.modelContext.registerTool(scaleRecipe, { signal: controller.signal });

// Later (e.g. in a React effect cleanup):
controller.abort();  // tool is now gone
```

The descriptor compiles cleanly against the ambient `ModelContextTool` type declared in `chat/src/app/types/webmcp.d.ts`, with no boundary casts. The handler is plain async TypeScript; the agent's call serializes the return value back across the WebMCP boundary.

The narrow assertion `input as { servings: number; recipeId?: string }` is a type narrowing on the validated input shape, not a boundary cast — `input` has already been JSON-Schema-validated by the time it reaches the handler. In production code you'd add an explicit runtime guard (e.g. a tiny zod schema or a hand-rolled `isScaleInput(input)` predicate); for a single-file reading-order example the inline narrow is honest about what the schema guarantees.

### What the agent sees

When an agent (in-page or external) discovers `scaleRecipe`, it sees a description object roughly like this:

```json
{
  "name": "scaleRecipe",
  "description": "Scale a recipe to a new serving count. All ingredient quantities are scaled proportionally.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "servings": { "type": "integer", "minimum": 1, "description": "Target servings count" },
      "recipeId": { "type": "string", "description": "(optional) recipe id; defaults to active recipe" }
    },
    "required": ["servings"],
    "additionalProperties": false
  },
  "annotations": { "readOnlyHint": false }
}
```

The agent picks this tool when its planner concludes a serving-count adjustment is needed, fills out the input shape, and dispatches. The browser routes the dispatch to your `execute`. The resolved value comes back as a JSON-serializable object; the agent can read it directly or surface it to the user.

## Code Sample 2: One Definition, Two Consumers

This is the WebMCP value proposition in code: **a single tool definition feeds both an external agent (via `navigator.modelContext`) and an in-page agent (via `LanguageModel`).** Add a tool once, both consumers gain it.

```typescript
import { RECIPE_TOOLS } from '../services/recipeTools';

// Consumer 1: external Chrome agent (Tool Inspector extension, an OS-level
// agent reaching the page via WebMCP, etc.). Tools are discoverable via
// navigator.modelContext on the live page.
const controller = new AbortController();
for (const tool of RECIPE_TOOLS) {
  navigator.modelContext.registerTool(tool, { signal: controller.signal });
}

// Consumer 2: the in-page LanguageModel chat agent. Same RECIPE_TOOLS array,
// adapted to LanguageModel's tool shape — its `execute` must resolve to a
// string, while WebMCP's `execute` resolves to `unknown`. The hand-rolled
// adapter below shows the bridge explicitly.
const lmTools = RECIPE_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
  execute: async (input: Record<string, unknown>) => {
    const result = await t.execute(input);
    return typeof result === 'string' ? result : JSON.stringify(result);
  },
}));

const session = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'You are a recipe assistant.' }],
  tools: lmTools,
});

// One definition. Two consumers. Both see the same handler logic, the same
// JSON Schema, the same descriptions. Add a tool to RECIPE_TOOLS and both
// the external Tool Inspector and the in-page chat gain it for free.
```

> **In this demo specifically.** The Recipe Workbench's in-page agent (`chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx`) currently uses a `responseFormat`-driven JSON dispatch loop instead of `LanguageModel.create({ tools })`, because Chrome 147 Canary's `LanguageModel` tool-calling codepath was unreliable at the time of writing. The same `RECIPE_TOOLS` array still drives both surfaces — only the in-page invocation transport differs. Once the upstream codepath stabilizes, the dispatch loop will be replaced by the `lmTools` shape shown above. A reusable adapter exists at `chat/src/app/services/toolAdapter.ts` (export name `toLanguageModelTools`, plural) for exactly this purpose.

### Why hand-roll the adapter?

The hand-rolled adapter in Sample 2 deliberately avoids importing `toLanguageModelTools` from `chat/src/app/services/toolAdapter.ts`. The reusable helper in this codebase wraps each call with event-emit plumbing (used by the workbench's tool-call indicator UI) and a couple of dispatch-side concerns specific to this app. Inlining the conversion in the doc means:

- The reader sees exactly how `Promise<unknown>` (WebMCP's contract) becomes `Promise<string>` (LanguageModel's contract).
- The reader sees exactly which descriptor fields the in-page agent cares about (`name`, `description`, `inputSchema`, `execute`) and which it doesn't (`annotations` — LanguageModel doesn't have an annotations field today).
- The reader can copy the snippet straight into a fresh project that doesn't have this app's helper.

Production code in this repository imports `toLanguageModelTools` for the event-emit plumbing; the doc trades that integration for pedagogical clarity. Both shapes are correct.

### Lifecycle, recap

When you control both consumers in Sample 2 with the same `controller`:

- One `controller.abort()` tears down all WebMCP registrations atomically.
- The `LanguageModel` session has its own lifecycle — `session.destroy()` (when available) or simply letting the variable go out of scope ends it. The two consumers do not share a session lifecycle; they share a tool definition.
- If a tool's `execute` throws, the WebMCP consumer surfaces the exception to the calling agent; the LanguageModel consumer's wrapper catches it and surfaces an error string to the chat session. Same handler, two error transport channels.

## Security & Permission Model

WebMCP's permission model is "the user opened this page". There is no OAuth handshake, no consent prompt, no permission API. That's a feature, not an oversight — the page IS the trust boundary.

### What the agent can do

- **Inherits the user's browser session.** Tool handlers run with the user's cookies, IndexedDB, localStorage, and signed-in identity. The agent does not see those credentials directly; it sees only what the tool's `execute` function returns. If a registered tool calls a same-origin REST API, that call carries the user's auth automatically — exactly as if the user clicked a button.
- **No OAuth handshake.** There is no external authorization step, no scoped token, no API key exchange. The "permission" is the user's act of visiting the page and (optionally) the user explicitly using an agent on it.
- **User-mediated.** Tool calls happen inside the page the user has open. Closing the tab or navigating away ends every registration. The user retains control by virtue of the navigation surface — there is no background channel, no service worker registration path.
- **Same-origin scoped.** Tools registered on `https://example.com` are not visible on `https://other.example`. The `ModelContext` is per-document; the page that calls `registerTool` is the only handler. There is no cross-document discovery and no postMessage bridge.

### What the page is responsible for

The browser does not validate `inputSchema`, does not authenticate the agent, does not gate dangerous operations behind a confirmation dialog. All of that is the page's job. Concretely:

1. **Validate input inside `execute`.** Treat the input as untrusted. Even when the agent is JSON-Schema-aware, a malicious or buggy agent can still send the wrong shape. A 5-line runtime guard at the top of every handler catches this.
2. **Confirm destructive actions.** For tools that mutate state irreversibly (deleting accounts, transferring funds, sending email), the handler itself should require explicit user confirmation — a DOM modal, a native `confirm()`, anything that interrupts the flow. The descriptor should also set `annotations: { readOnlyHint: false }` so well-behaved agents know the call has side effects.
3. **Avoid leaking secrets in returned values.** The agent receives whatever `execute` resolves to. Don't return raw cookies, session tokens, or PII unless that's the literal point of the tool.
4. **Log tool calls server-side.** If the tool hits a backend, that backend should log the call. Browser-side logs disappear when the tab closes; server logs are the audit trail.

### Threat model in one paragraph

The realistic risk is a malicious page convincing the user to install or trust an agent that issues calls the user wouldn't make manually — a confused-deputy attack at the agent layer. WebMCP itself has no opinion on this; it just routes calls. Pages that integrate WebMCP should treat any agent as having the user's full authority on that page, exactly as if the user had a third-party browser extension running. If you wouldn't expose a page action via a public REST endpoint, don't expose it via WebMCP either.

## Limitations

1. **Non-streaming handlers**: tool `execute` returns a single Promise; there is no streaming-tool surface in the current spec. Long-running operations should report progress via a separate channel (e.g. updating page state that an external observer can read).
2. **No polyfill in this demo**: this site uses native `navigator.modelContext` only. Browsers without the flag see the `MissingFlagBanner`; they do not get a JS shim.
3. **Spec is moving**: this guide pins to the April 23, 2026 W3C Draft Community Group Report. Earlier drafts had `provideContext` / `unregisterTool` / `clearContext` (removed in March 2026); future drafts may add or rename surface area before stabilization.
4. **Same-origin only**: tools registered on one origin are not visible to pages on other origins. Cross-origin tool sharing is out of scope for this API.
5. **Single document scope**: tools live on the document that registered them. Closing the tab unregisters everything (the implicit `AbortSignal` of page unload). There is no service-worker or background-page registration path.
6. **No built-in input validation**: the browser does NOT enforce `inputSchema` before calling `execute`. Most agents validate against the schema themselves, but the handler must still treat its input as untrusted and validate at the top.

## References

- W3C WebMCP Draft Community Group Report — https://webmachinelearning.github.io/webmcp/ (snapshot: April 23, 2026)
- WebMCP repository — https://github.com/webmachinelearning/webmcp
- Chrome flag — `chrome://flags/#WebMCP for testing` (Chrome 146+ Canary)
- In-app fallback — `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx`
- Tool source of truth — `chat/src/app/services/recipeTools.ts` (the `RECIPE_TOOLS` array driving Sample 2)
