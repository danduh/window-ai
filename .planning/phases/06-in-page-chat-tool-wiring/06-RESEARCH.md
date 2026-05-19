# Phase 6: In-Page Chat + Tool Wiring — Research

**Researched:** 2026-05-19
**Domain:** React component cloning, LanguageModel JSON-dispatch loop, MCP Apps `_meta` interception, iframe-in-chat-bubble rendering, tool event subscription
**Confidence:** HIGH (all findings verified against live source files in this codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Clone the AgentDrawer pattern** into a new component `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx`. DO NOT touch `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (brownfield).
- **Reuse** `ChatBox`, `ChatInput`, and `Message` type verbatim. `Message` gains optional `uiResourceUri?: string` (additive).
- **ChatBox edit**: check for `uiResourceUri` and render the iframe slot instead of `<Markdown>` when present.
- **System prompt tool list** — filtered to exclude tools with `visibility:["app"]`. Only `searchRecipes` appears to the model.
- **Left column placement** — GenUIChatPanel replaces `<ChatPlaceholder>` in `GenerativeUIPage.tsx`.
- **Phase 5 debug trigger removed** — `ChatPlaceholder.tsx` deleted or gutted in Phase 6.
- **`MAX_TOOL_ITERATIONS = 5`** per user turn (AgentDrawer uses `MAX_TOOL_CALLS = 10`; CONTEXT.md locks at 5 for the recipe-only flow).
- **searchRecipes input schema**: `{ type: 'object', properties: { ingredient: { type: 'string' }, maxMinutes: { type: 'number' } }, required: [] }`.
- **Handler**: call `RecipePersistence.getRecipes()`, apply local filters, `token = crypto.randomUUID()`, store in `recipeCarouselRegistry`, return `{ content: [{ type: 'text', text: 'Found N recipes' }], _meta: { 'ui.resourceUri': 'ui://gen-ui/carousel/<token>', 'genUI.recipeCount': N } }`.
- **Token TTL**: cleared on `window.beforeunload` only. No LRU in Phase 6.
- **_meta interceptor**: strips `_meta` before model feedback; model sees only `content` summary.
- **Message rendering**: `uiResourceUri` set → `<ChatBubbleContainer><UIResourceFrame html={...} /></ChatBubbleContainer>` instead of `<Markdown>`.
- **Recipe lookup in renderer**: parse token from URI, call `recipeCarouselRegistry.get(token)`, call `renderCarouselHTML(recipes)` for `html` prop.
- **`commitRecipeToPlan` visibility annotation**: add `annotations: { visibility: ['app'] }` to GEN_UI_TOOLS; filter these out of the system prompt tool list.
- **"Added X ✓" confirmation**: subscribe to `wrapToolsWithEvents` `tool:completed` event for `commitRecipeToPlan`; resolve `recipeId` via `RecipePersistence.getRecipe(id)`; append system-style message.
- **New file**: `chat/src/app/services/recipeCarouselRegistry.ts` — module-scope `Map<string, Recipe[]>` + `setRecipes`/`getRecipes`/`clearRecipes` helpers.
- **Modified files**: `genUITools.ts`, `ChatBox.tsx`, `GenerativeUIPage.tsx`, `webmcp.d.ts`.
- **Deleted/gutted**: `ChatPlaceholder.tsx`.

### Claude's Discretion

- Exact system prompt copy (~10 lines).
- "Added X ✓" exact wording.
- Whether to delete `ChatPlaceholder.tsx` entirely or keep minimal stub.
- `outputLanguage: 'en'` (use this per existing pattern).
- Token format for resource URI — UUID v4, `ui://gen-ui/carousel/` prefix locked.

### Deferred Ideas (OUT OF SCOPE)

- Docs route `/generative-ui/docs` + markdown explainer (Phase 7).
- SEO entry for docs sub-route (Phase 7).
- 90-second demo polish + zero-network DevTools kicker (Phase 7).
- Pick button visual clipping fix (Phase 7).
- Tool-result streaming.
- Multi-iframe simultaneous rendering.
- LRU/TTL for `recipeCarouselRegistry`.
- Voice input or richer chat affordances.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GENUI-04 | `searchRecipes` registered on mount; returns `{ content, _meta: { 'ui.resourceUri', 'genUI.recipeCount' } }` per MCP Apps SEP-1865 | Findings 9–10: handler body verified; `genUITools.ts` extension strategy confirmed |
| GENUI-05 | `commitRecipeToPlan` registered with `annotations: { visibility: ['app'] }` | Finding 5: `webmcp.d.ts` needs additive `visibility?: string[]` on `ModelContextToolAnnotations`; exact patch documented |
| GENUI-09 | Chat panel uses `LanguageModel` + `responseFormat` JSON-dispatch | Findings 1–3: AgentDrawer loop structure fully extracted; session creation, dispatch loop, exit condition documented |
| GENUI-10 | Chat panel intercepts `_meta.ui.resourceUri` before feeding model; iframe renders in chat bubble | Findings 4, 7: `Message` extension non-breaking; interceptor placement within dispatch loop identified |
| GENUI-11 | Meal-plan column re-renders when `commitRecipeToPlan` fires; chat appends "Added X ✓" | Finding 4: `wrapToolsWithEvents` callback API documented; `MealPlanStore` already reactive via Phase 4 |
</phase_requirements>

---

## Summary

Phase 6 wires the full chat-driven generative UI flow on `/generative-ui`. All required primitives exist: the `AgentDrawer.tsx` JSON-dispatch loop (verified live), `ChatBox`/`ChatInput` reusable components, `wrapToolsWithEvents` event callback mechanism, `UIResourceFrame`/`ChatBubbleContainer` from Phase 5, and `RecipePersistence`/`MealPlanStore` typed services. No new npm packages are required.

The dominant implementation task is cloning `AgentDrawer.tsx` into `GenUIChatPanel.tsx` and inserting a single `_meta` interceptor between the tool execution and the model-feedback step in the dispatch loop. The `Message` type extension is additive (one optional field) with no breaking callers. The `webmcp.d.ts` `annotations` interface needs one additive field for `visibility?: string[]`. Everything else is new files.

**Primary recommendation:** Clone `AgentDrawer.tsx` line-for-line as the starting point; the interceptor is a 10-line insertion inside the tool-dispatch closure at the result-inspection point; `recipeCarouselRegistry.ts` is a 15-line module.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chat UI (messages, input, scroll) | Browser / Client | — | Pure React state in `GenUIChatPanel` |
| LanguageModel session lifecycle | Browser / Client | — | `LanguageModel.create` is a browser API; session owned by component mount effect |
| JSON-dispatch loop + tool routing | Browser / Client | — | Synchronous JS loop calling `session.prompt()`; no server involved |
| `_meta` interception | Browser / Client | — | Runs inside the dispatch loop before any model feedback |
| `searchRecipes` tool handler | Browser / Client | — | Reads IndexedDB via `RecipePersistence.getRecipes()` |
| Carousel HTML generation | Browser / Client | — | `renderCarouselHTML()` is a pure JS function; output goes to iframe srcdoc |
| `recipeCarouselRegistry` token store | Browser / Client | — | Module-scope `Map` in the browser JS heap |
| `commitRecipeToPlan` tool handler | Browser / Client | — | Mutates `MealPlanStore` (IndexedDB) directly |
| Iframe carousel rendering | Browser / Client (sandboxed) | — | Runs inside double-sandboxed iframe; communicates via Phase 5 bridge |
| Meal-plan column re-render | Browser / Client | — | `MealPlanStore` React subscription from Phase 4; no new wiring needed |
| WebMCP tool registration | Browser / Client | — | `navigator.modelContext.registerTool` is a browser API call |

---

## Finding 1: AgentDrawer JSON-Dispatch Loop Structure

**Source:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` [VERIFIED: live file]

### Session Creation (lines 191–230)

```typescript
// useEffect with cancelled flag + cleanup destroy
useEffect(() => {
  let cancelled = false;
  let createdSession: LanguageModel | null = null;
  (async () => {
    if (typeof LanguageModel === 'undefined') { setUnavailable(true); return; }
    const availability = await LanguageModel.availability();
    if (cancelled) return;
    if (availability !== 'available') { setUnavailable(true); return; }
    const newSession = await LanguageModel.create({
      outputLanguage: 'en',
      responseFormat: INTENT_SCHEMA,
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    });
    if (cancelled) { newSession.destroy(); return; }
    createdSession = newSession;
    setSession(newSession);
  })();
  return () => {
    cancelled = true;
    createdSession?.destroy();
  };
}, []);
```

Key points for Phase 6 clone:
- `LanguageModel.create` receives NO `tools` array — the `responseFormat` workaround is mandatory because `tools` is broken on Chrome 147 [VERIFIED: AgentDrawer.tsx:141–149 architecture comment]
- `outputLanguage: 'en'` is required to suppress console warning and reduce fence-wrapping
- `responseFormat: INTENT_SCHEMA` is the flat JSON-schema object defined at module top
- `cancelled` flag + `createdSession?.destroy()` on cleanup — handles StrictMode double-mount

### User-Message Handler (lines 233–347)

```typescript
const handleUserMessage = async (text: string, _action: 'Prompt' | 'Translate'): Promise<void> => {
  void _action;
  if (sessionInitFailed || !session) { addMessage("Couldn't start...", 'Bot'); return; }
  setIsLoading(true);
  setToolEvents([]);
  addMessage(text, 'User');
  // ... optional context prefix build ...
  try {
    let promptText = /* prefix + */ text;
    let callCount = 0;
    while (callCount < MAX_TOOL_CALLS) {   // Phase 6 uses MAX_TOOL_ITERATIONS = 5
      const rawResponse = await session.prompt(promptText);
      const parsed = extractJsonFromResponse(rawResponse);
      if (!parsed) { addMessage(rawResponse || "Sorry...", 'Bot'); break; }
      const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'done';
      if (toolName === 'done') {
        const reply = typeof parsed.reply === 'string' && parsed.reply.length > 0
          ? parsed.reply : "Done. Let me know if...";
        addMessage(reply, 'Bot');
        break;
      }
      const tool = RECIPE_TOOLS.find(t => t.name === toolName);  // Phase 6: GEN_UI_TOOLS (visible only)
      if (!tool) {
        promptText = `Tool "${toolName}" not registered. ... call a valid tool or emit done.`;
        callCount++; continue;
      }
      const args = (parsed.args !== null && typeof parsed.args === 'object' && !Array.isArray(parsed.args)
        ? parsed.args : {}) as Record<string, unknown>;
      pushToolEvent({ kind: 'pending', toolName, args });
      let toolResult: string;
      try {
        const result = await tool.execute(args);
        toolResult = typeof result === 'string' ? result : JSON.stringify(result);
        pushToolEvent({ kind: 'done', toolName });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        pushToolEvent({ kind: 'error', toolName, message });
        toolResult = JSON.stringify({ error: message });
      }
      // ← Phase 6 inserts _meta interceptor HERE, after tool.execute() and before this line:
      promptText = `Tool "${toolName}" result: ${toolResult}. Now decide: call next tool or emit done.`;
      callCount++;
    }
    if (callCount >= MAX_TOOL_CALLS) {
      addMessage('Reached the maximum number of tool calls for this request.', 'Bot');
    }
  } catch (err) {
    addMessage("Sorry, I couldn't generate a response...", 'Bot');
  } finally {
    setIsLoading(false);
  }
};
```

**Phase 6 intercept insertion point:** After `const result = await tool.execute(args)` succeeds and before `promptText = \`Tool "${toolName}" result: ${toolResult}\``. Parse `result` as a structured object, inspect `_meta?.['ui.resourceUri']`, handle as described in Finding 7.

### Done Exit Condition

`toolName === 'done'` in the parsed JSON is the sentinel. The model emits `{ "toolName": "done", "reply": "..." }`. After 5 iterations (Phase 6 limit) the loop forces a fallback message.

### INTENT_SCHEMA (lines 23–43)

```typescript
const INTENT_SCHEMA = {
  type: 'object',
  required: ['toolName'],
  additionalProperties: false,
  properties: {
    toolName: { type: 'string', description: '...' },
    args: { type: 'object', description: '...' },
    reply: { type: 'string', description: '...' },
  },
};
```

Copy verbatim to `GenUIChatPanel.tsx`.

---

## Finding 2: `extractJsonFromResponse` — Three-Stage Parser

**Source:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx:88–128` [VERIFIED: live file]

The function tries three strategies in order:
1. Direct `JSON.parse(trimmed)` — happy path
2. Strip ` ```json ... ``` ` or ` ``` ... ``` ` fences via regex, then parse
3. Extract the first `{ ... }` block from the raw string via brace-match regex, then parse

Returns `Record<string, unknown> | null`. Never throws.

**Decision for Phase 6:** Copy verbatim into `GenUIChatPanel.tsx` as a module-level function. Do not extract to a shared helper — `AgentDrawer.tsx` must not be touched (brownfield), and the function is small enough that duplication is preferable to creating a shared module in this milestone.

---

## Finding 3: LanguageModel.create Signature

**Source:** `chat/src/app/types/dom-chromium-ai.d.ts:11–52` [VERIFIED: live file]

```typescript
interface LanguageModelCreateOptions {
  topK?: number;
  temperature?: number;
  outputLanguage?: string;   // 'en' required in Chrome 147+
  expectedInputs?: Array<...>;
  expectedOutputs?: Array<...>;
  tools?: Array<{ name, description, inputSchema, execute: (...) => Promise<string> }>;
  signal?: AbortSignal;
  monitor?: (monitor: any) => void;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  responseFormat?: object;   // JSON-Schema-shaped constraint; activates JSON dispatch
}
```

Phase 6 uses: `{ outputLanguage: 'en', responseFormat: INTENT_SCHEMA, initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }] }`.

**Do NOT pass `tools` array** — the `responseFormat` workaround is the only known-working path on Chrome 147 Canary.

---

## Finding 4: `Message` Type in ChatBox.tsx — Exact Shape + Extension Impact

**Source:** `chat/src/app/components/ChatBox.tsx:4–8` [VERIFIED: live file]

```typescript
export interface Message {
  id: number;
  text: string;
  sender: string;
}
```

**Current callers of the `Message` type:**
- `AgentDrawer.tsx` — imports `type Message`; uses `{ id, text, sender }` only. Adding `uiResourceUri?: string` is non-breaking.
- `GenUIChatPanel.tsx` (new) — the only caller that sets `uiResourceUri`.

**Render in ChatBox.tsx (lines 41–57):** Every message is rendered as `<Markdown>{message.text}</Markdown>` inside a bubble. The modification for Phase 6 is conditional: when `message.uiResourceUri` is set, render the iframe slot instead of `<Markdown>`. The `text` field still carries the caption string ("Found N recipes").

**Invasiveness:** Low. One interface field addition, one conditional render branch inside the existing `.map()`. The bubble container Tailwind classes remain the same; only the inner content changes for messages with `uiResourceUri`.

**Full ChatBox modification sketch:**

```typescript
// In ChatBox.tsx map callback, replace the inner <Markdown> block with:
{message.uiResourceUri ? (
  <div>
    <p className="text-sm mb-2">{message.text}</p>
    <ChatBubbleContainer>
      <UIResourceFrame html={resolveCarouselHTML(message.uiResourceUri)} />
    </ChatBubbleContainer>
  </div>
) : (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <Markdown>{message.text}</Markdown>
  </div>
)}
```

Where `resolveCarouselHTML(uri: string): string` is a helper that parses the token from `ui://gen-ui/carousel/<token>`, calls `recipeCarouselRegistry.getRecipes(token)`, and calls `renderCarouselHTML(recipes)`. This helper lives in `ChatBox.tsx` or is passed as a prop — planner's discretion.

**Note on ChatBox's fixed height:** The existing ChatBox has `h-96 overflow-y-auto` on its container. An iframe inside a message bubble will want dynamic height. `UIResourceFrame` already uses `ResizeObserver` → `ui/notifications/size-changed` bridge protocol to communicate height changes. The parent container (`UIResourceFrame`) sets the outer iframe height dynamically via its state. This is the same mechanism that works in `ChatPlaceholder.tsx`. No changes to `UIResourceFrame` needed.

---

## Finding 5: `annotations.visibility` Type in webmcp.d.ts

**Source:** `chat/src/app/types/webmcp.d.ts:43–46` [VERIFIED: live file]

Current `ModelContextToolAnnotations`:
```typescript
interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}
```

`visibility` is NOT currently typed. The W3C WebMCP draft uses `visibility: ["app"]` to mark tools hidden from the LLM but available to the page's UI layer.

**Required additive patch** (does not break existing consumers of `readOnlyHint`/`untrustedContentHint`):
```typescript
interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  /** W3C WebMCP draft: controls which clients see this tool in their catalog. */
  visibility?: string[];
}
```

**Filtering in the system prompt:** The chat panel generates the tool list string from `GEN_UI_TOOLS` filtered to exclude entries where `annotations?.visibility?.includes('app')`. The `bridge.ts` `tools/call` proxy is unaffected — `visibility` is a model-catalog concern only. [VERIFIED: CONTEXT.md §Specific bridge note + bridge.ts structure from 05-01-SUMMARY.md]

---

## Finding 6: `wrapToolsWithEvents` API — Exact Subscription Pattern

**Source:** `chat/src/app/services/toolAdapter.ts:77–98` [VERIFIED: live file]

`wrapToolsWithEvents` is a **pure function** — it takes a `tools` array and an `onEvent` callback, and returns a new tools array where each `execute` is wrapped. There is NO module-scope event emitter; the callback is a closure parameter.

```typescript
export function wrapToolsWithEvents(
  tools: ModelContextTool[],
  onEvent: (e: ToolCallEvent) => void,
): ModelContextTool[]
```

Events fired:
- `{ kind: 'pending', toolName, args }` — before `execute` runs
- `{ kind: 'done', toolName }` — on success
- `{ kind: 'error', toolName, message }` — on failure

**How `GenUIChatPanel` subscribes for the "Added X ✓" message:**

The panel creates its local `onToolEvent` callback at the time it wraps tools. Since `registerGenUITools()` is called at `GenerativeUIPage` mount (not inside the panel), the panel cannot wrap tools there directly. Instead, the panel needs its own local tool array for the dispatch loop.

Two valid patterns:
1. **Module-scope event emitter approach** — `genUITools.ts` exports a simple emitter that `registerGenUITools()` calls; the panel subscribes on mount. Adds complexity.
2. **Direct tool array in panel** — `GenUIChatPanel` maintains a local copy of the visible tools (`searchRecipes` handler defined inline) with its own `wrapToolsWithEvents` call. The `commitRecipeToPlan` registration is separate (via `GenerativeUIPage` effect). The `commitRecipeToPlan` event fires from `genUITools.ts`'s `onToolEvent` callback. [ASSUMED — the specific wiring is planner discretion; the two options are mechanically sound]

**Recommended approach (planner discretion):** In `genUITools.ts`, replace the inline `onToolEvent = (e) => console.debug(...)` with a module-scope callback array or a simple callback slot that external components can set. `GenUIChatPanel` registers itself on mount and clears on unmount. This keeps `registerGenUITools()` as the single registration path.

Alternatively: keep `genUITools.ts` logging only; define `searchRecipes` and its event handling entirely within `GenUIChatPanel.tsx` as a local tool array used only for the dispatch loop (not passed to `navigator.modelContext` — the panel calls `searchRecipes` directly, not via the bridge). Then `commitRecipeToPlan` events come from the bridge path (`bridge.ts` → `tools/call` → `GEN_UI_TOOLS[commitRecipeToPlan].execute`). To catch these, `genUITools.ts` needs to emit to the panel.

**Simplest concrete pattern for the "Added X ✓" message:**

```typescript
// In genUITools.ts — add a module-scope listener slot:
let onCommitCallback: ((recipeId: string) => void) | null = null;
export function setCommitListener(cb: ((recipeId: string) => void) | null): void {
  onCommitCallback = cb;
}
// In commitRecipeToPlan.execute — after addToPlan succeeds:
if (onCommitCallback) onCommitCallback(recipeId);
```

```typescript
// In GenUIChatPanel — mount effect:
useEffect(() => {
  setCommitListener(async (recipeId) => {
    const recipe = await getRecipe(recipeId);
    addMessage(`Added ${recipe?.title ?? recipeId} to your meal plan ✓`, 'System');
  });
  return () => setCommitListener(null);
}, []);
```

This avoids re-exporting the emitter, keeps the type surface clean, and has no race conditions (the `Set` pattern is single-slot by design for this demo).

---

## Finding 7: `_meta` Interceptor — Exact Insertion Point

**Source:** AgentDrawer.tsx dispatch loop structure [VERIFIED] + CONTEXT.md decisions [VERIFIED]

The interceptor inserts between `const result = await tool.execute(args)` and `promptText = \`Tool "${toolName}" result: ${toolResult}\``.

```typescript
const result = await tool.execute(args);
pushToolEvent({ kind: 'done', toolName });

// Phase 6: _meta interceptor
let toolResultForModel: string;
const resultObj = (typeof result === 'string'
  ? null
  : result) as Record<string, unknown> | null;
const uiResourceUri = resultObj?._meta?.['ui.resourceUri'] as string | undefined;

if (uiResourceUri) {
  // 1. Append iframe message to chat transcript
  messageIdCounter.current += 1;
  setMessages(prev => [...prev, {
    id: messageIdCounter.current,
    text: (resultObj?.content as Array<{text: string}>)?.[0]?.text ?? 'Found recipes',
    sender: 'Bot',
    uiResourceUri,
  }]);
  // 2. Feed only the content summary back to the model (strip _meta entirely)
  const contentOnly = { content: (resultObj as Record<string,unknown>).content };
  toolResultForModel = JSON.stringify(contentOnly);
} else {
  toolResultForModel = typeof result === 'string' ? result : JSON.stringify(result);
}

promptText = `Tool "${toolName}" result: ${toolResultForModel}. Now decide: call next tool or emit done.`;
callCount++;
```

**Key invariant:** The string `ui://` must NEVER appear in any string passed to `session.prompt()`. The interceptor above guarantees this by stripping `_meta` before building `toolResultForModel`. [VERIFIED: CONTEXT.md criterion 4]

---

## Finding 8: `searchRecipes` Filter Logic — Verified Body

**Source:** `chat/src/app/services/RecipePersistence.ts` — `Recipe.totalMinutes` and `Recipe.searchableIngredients` verified as optional fields on the `Recipe` interface (lines 16–18) [VERIFIED: live file]

```typescript
const filtered = recipes.filter(r => {
  if (args.ingredient &&
      !r.searchableIngredients?.some(i =>
        i.toLowerCase().includes((args.ingredient as string).toLowerCase())
      )) return false;
  if (args.maxMinutes != null &&
      (r.totalMinutes ?? Infinity) > (args.maxMinutes as number)) return false;
  return true;
});
```

Both `totalMinutes` and `searchableIngredients` are `?` optional on the `Recipe` interface — the `??  Infinity` and `?.some()` guards are required to handle recipes seeded without these fields. [VERIFIED: RecipePersistence.ts:16–18]

Full `searchRecipes` handler body:
```typescript
execute: async (input: unknown): Promise<unknown> => {
  const args = (input as Record<string, unknown>) ?? {};
  const recipes = await getRecipes();
  const filtered = recipes.filter(r => {
    if (args.ingredient &&
        !r.searchableIngredients?.some(i =>
          i.toLowerCase().includes((args.ingredient as string).toLowerCase())
        )) return false;
    if (args.maxMinutes != null &&
        (r.totalMinutes ?? Infinity) > (args.maxMinutes as number)) return false;
    return true;
  });
  const token = crypto.randomUUID();
  recipeCarouselRegistry.setRecipes(token, filtered);
  return {
    content: [{ type: 'text', text: `Found ${filtered.length} recipes` }],
    _meta: {
      'ui.resourceUri': `ui://gen-ui/carousel/${token}`,
      'genUI.recipeCount': filtered.length,
    },
  };
},
```

---

## Finding 9: `registerGenUITools` Extension Pattern

**Source:** `chat/src/app/services/genUITools.ts` [VERIFIED: live file]

Current state: one tool (`commitRecipeToPlan`), no `visibility` annotation.

**Required changes:**

1. Add `import { getRecipes } from './RecipePersistence'` and `import * as recipeCarouselRegistry from './recipeCarouselRegistry'`
2. Push `searchRecipes` as a second element in `GEN_UI_TOOLS`
3. Add `annotations: { visibility: ['app'] }` to `commitRecipeToPlan`
4. The `previousGenUIRegistrationController` guard, `DUPLICATE_NAME_PATTERN`, and the loop body stay identical — they iterate `GEN_UI_TOOLS` generically

`GEN_UI_TOOLS` after Phase 6:
```typescript
export const GEN_UI_TOOLS: ModelContextTool[] = [
  {
    name: 'commitRecipeToPlan',
    // ... (existing, unchanged except annotations added)
    annotations: { visibility: ['app'] },  // hides from LLM, bridge still proxies
  },
  {
    name: 'searchRecipes',
    description: 'Search recipes by ingredient and/or max cooking time',
    inputSchema: {
      type: 'object',
      properties: {
        ingredient: { type: 'string', description: 'Filter by ingredient name (partial match)' },
        maxMinutes: { type: 'number', description: 'Filter by max total cooking time in minutes' },
      },
      required: [],
    },
    execute: async (input: unknown): Promise<unknown> => { /* body from Finding 8 */ },
  },
];
```

The `registerGenUITools()` function body does not change — the loop iterates all `GEN_UI_TOOLS` and registers each with `navigator.modelContext`. `visibility` is a model-catalog hint only; the bridge proxies all registered tools regardless.

`GenerativeUIPage.tsx` `useEffect` also does not change — it still calls `registerGenUITools()` with no arguments.

---

## Finding 10: `recipeCarouselRegistry.ts` — Full Module Shape

**Source:** CONTEXT.md locked decisions + `RecipePersistence.ts` `Recipe` type [VERIFIED]

```typescript
// chat/src/app/services/recipeCarouselRegistry.ts
import type { Recipe } from './RecipePersistence';

const registry = new Map<string, Recipe[]>();

export function setRecipes(token: string, recipes: Recipe[]): void {
  registry.set(token, recipes);
}

export function getRecipes(token: string): Recipe[] | undefined {
  return registry.get(token);
}

export function clearRecipes(): void {
  registry.clear();
}

// Clear on page navigation to prevent unbounded growth across navigations
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => registry.clear());
}
```

This is a 20-line module. No pub-sub, no reactive state — reads happen synchronously when the iframe mounts.

---

## Standard Stack

No new npm packages required for Phase 6. All dependencies are already installed.

| Asset | Source | Reused As-Is |
|-------|--------|-------------|
| `LanguageModel` | `dom-chromium-ai.d.ts` ambient | Yes |
| `ChatBox` | `chat/src/app/components/ChatBox.tsx` | Modified (additive) |
| `ChatInput` | `chat/src/app/components/ChatInput.tsx` | Yes, verbatim |
| `ChatBubbleContainer` | Phase 5, `GenerativeUI/ChatBubbleContainer.tsx` | Yes, verbatim |
| `UIResourceFrame` | Phase 5, `GenerativeUI/UIResourceFrame.tsx` | Yes, verbatim |
| `renderCarouselHTML` | Phase 5, `GenerativeUI/iframe/carouselTemplate.ts` | Yes, verbatim |
| `wrapToolsWithEvents` | `services/toolAdapter.ts` | Yes, verbatim |
| `RecipePersistence` | `services/RecipePersistence.ts` | Yes, verbatim |
| `MealPlanStore` | `services/MealPlanStore.ts` | Yes, verbatim (Phase 4) |
| `GEN_UI_TOOLS` / `registerGenUITools` | `services/genUITools.ts` | Extended (2 tools + annotation) |

---

## Architecture Patterns

### System Architecture Diagram

```
User types message
        |
        v
 GenUIChatPanel
 handleUserMessage()
        |
        v
 session.prompt(text)   <--- LanguageModel (on-device, no network)
        |
        v
 extractJsonFromResponse()
        |
      [parse]
        |
   toolName == 'done'? --> addMessage(reply) --> done
        |
        | (tool call)
        v
 GEN_UI_TOOLS.find(toolName)  [visibility:app tools excluded from system prompt]
        |
        v
 tool.execute(args)
        |
        v
 _meta interceptor
        |
   _meta.ui.resourceUri? --> addMessage({uiResourceUri, text}) --> iframe renders in bubble
        |                         |
        |                         v
        |                 recipeCarouselRegistry.get(token)
        |                         |
        |                         v
        |                 renderCarouselHTML(recipes)
        |                         |
        |                         v
        |                  UIResourceFrame (sandboxed iframe)
        |                         |
        |                    [user clicks Pick]
        |                         |
        |                         v
        |              tools/call postMessage (bridge.ts)
        |                         |
        |                         v
        |              commitRecipeToPlan.execute(recipeId)
        |                         |
        |                         v
        |              MealPlanStore.addToPlan()  -----> MealPlanColumn re-renders
        |                         |
        |              onCommitCallback(recipeId) -> addMessage("Added X ✓")
        |
        v
 toolResultForModel = JSON.stringify({content}) [_meta stripped]
        |
        v
 promptText = `Tool result: ...` --> loop continues
```

### Recommended Project Structure (new/modified files only)

```
chat/src/app/
├── components/
│   ├── ChatBox.tsx                          # MODIFIED: add uiResourceUri field + iframe render branch
│   ├── GenerativeUI/
│   │   ├── GenUIChatPanel.tsx               # NEW: AgentDrawer clone + _meta interceptor
│   │   ├── ChatPlaceholder.tsx              # DELETED or gutted
│   │   ├── ChatBubbleContainer.tsx          # unchanged
│   │   ├── UIResourceFrame.tsx              # unchanged
│   │   └── iframe/
│   │       └── carouselTemplate.ts          # unchanged
│   └── GenerativeUIPage.tsx                 # MODIFIED: replace ChatPlaceholder with GenUIChatPanel
├── services/
│   ├── genUITools.ts                        # MODIFIED: add searchRecipes, add visibility annotation
│   └── recipeCarouselRegistry.ts            # NEW: Map<token, Recipe[]>
└── types/
    └── webmcp.d.ts                          # MODIFIED: add visibility?: string[] to ModelContextToolAnnotations
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown fences in model output | Custom regex stripper | `extractJsonFromResponse()` from AgentDrawer | Already handles 3 edge cases including brace-extraction fallback |
| Iframe sandbox + bridge | Custom postMessage handler | Phase 5 `createUIResourceBridge` + `UIResourceFrame` | Complete SEP-1865 implementation including handshake, resize, theme, tools/call |
| Recipe HTML generation | Custom template literal | `renderCarouselHTML()` from Phase 5 | Dark-mode, XSS-safe, CSP-correct already tested |
| LanguageModel availability check | Custom availability probe | `LanguageModel.availability()` | Official API; same pattern in AgentDrawer |
| StrictMode session lifecycle | Try/catch + flag | `cancelled` flag + `createdSession?.destroy()` in cleanup | Verified pattern from AgentDrawer; prevents duplicate sessions |

---

## Common Pitfalls

### Pitfall 1: `_meta` object leaking into model context
**What goes wrong:** If `toolResultForModel` includes `_meta['ui.resourceUri']`, the model may attempt to emit the URI or reference it in its reply, breaking the "resource URL never in conversation" criterion.
**Why it happens:** Forgetting to strip `_meta` and passing the raw `result` object to `JSON.stringify` before building `promptText`.
**How to avoid:** The interceptor must build `contentOnly = { content: result.content }` and use THAT for `toolResultForModel`. Verify with: check that `promptText` for any `searchRecipes` result contains no `ui://` substring.
**Warning signs:** Model response includes a URI-like string in its reply text.

### Pitfall 2: StrictMode double session creation
**What goes wrong:** React 18 StrictMode mounts then immediately unmounts then re-mounts in development. Without the `cancelled` flag and `createdSession?.destroy()`, you get two live LanguageModel sessions.
**Why it happens:** `useEffect` fires twice in dev StrictMode.
**How to avoid:** Copy the exact pattern from AgentDrawer (lines 191–230): `let cancelled = false`, set `cancelled = true` in cleanup, call `createdSession?.destroy()`.
**Warning signs:** Two `[GenUIChatPanel] session created` log entries in dev console.

### Pitfall 3: Race — user submits while prior loop is running
**What goes wrong:** A second `handleUserMessage` call starts while the previous `while` loop is still awaiting `session.prompt()`. The second call also invokes `session.prompt()` on the same session, and interleaved responses corrupt both turns.
**Why it happens:** `isLoading` is set but the user can bypass it via rapid input or programmatic calls.
**How to avoid:** `ChatInput` is passed `disabled={isLoading}` — this is already the pattern in AgentDrawer. Ensure `setIsLoading(true)` is called before the first `await` in `handleUserMessage`. Do NOT use `useRef` to guard; `isLoading` state in `disabled` prop is sufficient.

### Pitfall 4: `UIResourceFrame` height inside chat bubble
**What goes wrong:** The carousel iframe renders with height 0 or a fixed 320px that clips cards.
**Why it happens:** `UIResourceFrame` starts at its configured `initialHeight` (320px per Phase 5). The ResizeObserver in the inner iframe fires `size-changed` after render, and the bridge calls `onSizeChanged`. If `onSizeChanged` is not wired to update a state variable that sets the outer iframe height, the height is static.
**How to avoid:** Verify `UIResourceFrame` wires `onSizeChanged` to a `height` state variable and sets `style={{ height: frameHeight + 'px' }}` on the outer iframe element. Review `UIResourceFrame.tsx` before assuming this is already handled — the Phase 5 SUMMARY does not explicitly confirm height is dynamic.
**Warning signs:** Cards are cut off; "Pick" buttons not visible without scrolling.

### Pitfall 5: `recipeCarouselRegistry.getRecipes` vs `RecipePersistence.getRecipes` name collision
**What goes wrong:** Both modules export a `getRecipes` function. A developer importing both in `ChatBox.tsx` or `GenUIChatPanel.tsx` will have a naming collision.
**Why it happens:** Natural naming; the registry function returns a synchronous `Recipe[] | undefined` while persistence returns `Promise<Recipe[]>`.
**How to avoid:** Import under aliased names: `import * as recipeCarouselRegistry from '../services/recipeCarouselRegistry'` and call `recipeCarouselRegistry.getRecipes(token)`. Never do a named destructure import of `getRecipes` from the registry module.

### Pitfall 6: `annotations.visibility` missing from type — silent runtime bug
**What goes wrong:** TypeScript accepts `annotations: { visibility: ['app'] }` only if `ModelContextToolAnnotations` declares `visibility`. Without the type fix, TypeScript emits a type error or the property is stripped by an overly strict type check, and the annotation never makes it to the registered tool object.
**Why it happens:** Phase 5 left `ModelContextToolAnnotations` without `visibility`. The type check fails on adding `visibility` to the tool definition.
**How to avoid:** Patch `webmcp.d.ts` first (Plan 06-01, Task 1). Run `npx nx typecheck chat` after patching before writing the tool definition.

### Pitfall 7: `commitRecipeToPlan` bridge call fires before registry entry exists
**What goes wrong:** The user clicks Pick; the iframe fires `tools/call`; the bridge proxies to `commitRecipeToPlan.execute({ recipeId })`; this succeeds (it only needs `recipeId`). But the `onCommitCallback` needs `getRecipe(recipeId)` to resolve the title for the "Added X ✓" message.
**Why it happens:** `getRecipe` is async (IndexedDB read). If the recipe was seeded, it will resolve. Not a correctness bug — just async timing.
**How to avoid:** The `onCommitCallback` is already `async`. Await `getRecipe(recipeId)` and fall back to `recipeId` as the title if undefined. No structural issue.

---

## Open Questions (All Resolved)

1. **Does `wrapToolsWithEvents` use a module-scope emitter or a callback?**
   Resolved: callback-only (closure parameter). Planner must decide the pattern for cross-component subscription (Finding 6 documents the simplest concrete approach: module-scope callback slot in `genUITools.ts`).

2. **Does `ChatBox.tsx` have other v1.0 consumers that would break with `uiResourceUri`?**
   Resolved: Only `AgentDrawer.tsx` imports `Message` from `ChatBox.tsx`. The field is optional — zero breaking change.

3. **Is `annotations.visibility` already typed in `webmcp.d.ts`?**
   Resolved: Not typed. Additive patch to `ModelContextToolAnnotations` required (Finding 5).

4. **Does the dispatch loop use streaming or non-streaming?**
   Resolved: Non-streaming. `session.prompt()` returns `Promise<string>`. The entire JSON must be parsed before dispatching. Streaming (`session.promptStreaming()`) is not used and cannot be used — the JSON boundary is only known when the full response is available.

5. **Does `UIResourceFrame` height update dynamically?**
   Not fully resolved from Phase 5 summaries. Planner should verify `UIResourceFrame.tsx` wires `onSizeChanged` to a height state variable. If not, a one-line fix is needed (flag as Pitfall 4 verification task).

6. **Does `recipeCarouselRegistry.getRecipes` collide with `RecipePersistence.getRecipes`?**
   Resolved: Yes — document namespacing convention (Finding 10, Pitfall 5).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely in-repo code/config changes. No new external tools, services, runtimes, or CLIs are required. All runtime dependencies (Chrome 146+ Canary with WebMCP flag) are requirements for the demo, not for development or build.

---

## Security Domain

Phase 6 introduces no new network surfaces and no new iframe sandbox escapes. The `_meta` interceptor actually reduces attack surface by ensuring the model never receives `ui://` URIs. The `recipeCarouselRegistry` stores in-memory only and is cleared on `beforeunload`.

Relevant existing controls (unchanged):
- Inner iframe: `sandbox="allow-scripts"` only (no `allow-same-origin`)
- `event.source === outerIframe.contentWindow` origin guard in bridge
- XSS-safe HTML generation via `escapeHtml`/`escapeAttr` in `renderCarouselHTML`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `UIResourceFrame` wires `onSizeChanged` to a height state variable dynamically | Pitfall 4 | Cards clipped; requires one-line fix to UIResourceFrame |
| A2 | The module-scope callback slot pattern for `onCommitCallback` in `genUITools.ts` is the simplest viable approach | Finding 6 | Planner may prefer a different pattern; functional either way |

---

## Sources

### Primary (HIGH confidence)
- `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` — dispatch loop, session creation, `INTENT_SCHEMA`, `extractJsonFromResponse` (all verified line-by-line)
- `chat/src/app/components/ChatBox.tsx` — `Message` interface shape
- `chat/src/app/components/ChatInput.tsx` — `onSend` signature `(message, action)` verified
- `chat/src/app/services/genUITools.ts` — current `GEN_UI_TOOLS`, `registerGenUITools` pattern
- `chat/src/app/services/toolAdapter.ts` — `wrapToolsWithEvents` exact API, `ToolCallEvent` type
- `chat/src/app/services/RecipePersistence.ts` — `Recipe` interface, optional `totalMinutes`/`searchableIngredients` fields, `getRecipes`/`getRecipe` signatures
- `chat/src/app/types/webmcp.d.ts` — `ModelContextToolAnnotations` current shape (missing `visibility`)
- `chat/src/app/types/dom-chromium-ai.d.ts` — `LanguageModel.create` options, `responseFormat`, `outputLanguage`
- `.planning/phases/05-mcp-apps-host-sandboxed-iframe-postmessage-bridge/05-01-SUMMARY.md` — bridge.ts API, `GEN_UI_TOOLS` current state, `renderCarouselHTML` usage
- `.planning/phases/05-mcp-apps-host-sandboxed-iframe-postmessage-bridge/05-02-SUMMARY.md` — `UIResourceFrame`, `ChatBubbleContainer`, `ChatPlaceholder` current state
- `chat/src/app/components/GenerativeUIPage.tsx` — `registerGenUITools` mount effect, `ChatPlaceholder` usage
- `.planning/phases/06-in-page-chat-tool-wiring/06-CONTEXT.md` — all locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all assets verified in live source files
- Architecture: HIGH — dispatch loop cloning is mechanical; interceptor insertion point is exact
- Pitfalls: HIGH — derived from verified code structure; A1 is the only unresolved assumption
- Type changes: HIGH — `webmcp.d.ts` current shape verified; patch is additive

**Research date:** 2026-05-19
**Valid until:** End of Phase 6 execution (code is the truth; this doc expires when files are modified)
