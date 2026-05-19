# Phase 2: WebMCP Tools + In-Page Agent — Research

**Researched:** 2026-04-27
**Domain:** Browser-native WebMCP tool registration (`navigator.modelContext`) + Chrome built-in `LanguageModel` tool-calling, integrated in a React 19 SPA page.
**Confidence:** HIGH (every open question from CONTEXT.md is answered with primary sources or repo-grep evidence)

## Summary

Phase 2 layers tool registration and an in-page chat agent on top of the Phase 1 Recipe Workbench. Three findings drive the plan:

1. **WebMCP unregisters via AbortSignal, not a separate method** [VERIFIED: webmcp.d.ts, W3C spec]. The repo's existing ambient types already model this correctly: `registerTool(tool, { signal })`. The mount/unmount lifecycle is one `AbortController` per page mount; `controller.abort()` in the cleanup function deregisters all 8 tools atomically.
2. **The W3C WebMCP spec exposes NO way to enumerate registered tools** [VERIFIED: spec read]. CONTEXT.md D-01's "if enumeration exists, derive from it" branch is empty in Chrome 146 Canary. The planner MUST keep an in-module typed `RECIPE_TOOLS` array as the single source and adapt outward to `LanguageModel.create({tools: ...})`. (The Tool Inspector extension reads from a separate `navigator.modelContextTesting` testing surface — not available to the page itself.)
3. **`LanguageModel` tool-calling currently requires non-streaming `session.prompt()`** [VERIFIED: existing `ToolCallingPage.tsx` uses `prompt()` not `promptStreaming()`; every W3C prompt-api spec example with `tools` uses `prompt()`; Chrome docs do not document streaming + tools]. Per CONTEXT.md D-04's stated fallback, **the planner SHOULD ship Phase 2 with `session.prompt()`** and treat `promptStreaming()` + tools as deferred. UI-SPEC FLAG-UI-04 already accommodates this — the only UX delta is "awaiting first token" lasts longer, then the full reply appears at once.

**Primary recommendation:** Build `recipeTools.ts` as the canonical 8-tool array shaped for `navigator.modelContext.registerTool`. Adapt to `LanguageModel.create({tools})` via a `toLanguageModelTools()` mapper. Register on mount via `AbortController`. Use non-streaming `session.prompt()` for the chat agent. Expose tool-call lifecycle (in-flight → done/error) by wrapping each handler in a small adapter that emits to React state — both the WebMCP and LanguageModel handler paths flow through the same wrapper, so the indicator UI fires for both consumers.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-02 | On page mount register tools via `navigator.modelContext`; on unmount, unregister all | §Standard Stack (AbortSignal lifecycle pattern), §Code Examples §Mount-effect tool registration |
| MCP-03 | 8 tools registered with descriptions + JSON Schema input schemas | §Tool Catalog (concrete signatures + JSON Schemas + behavior for all 8) |
| MCP-04 | Tool handlers route through Phase 1 `RecipePersistence`; UI updates live + survives reload | §Architecture Patterns §State propagation; §Tool Catalog handler bodies |
| MCP-05 | WebMCP Tool Inspector lists all 8 tools with names/descriptions/input schemas | §Tool Inspector Verification (manual UAT flow) |
| AGENT-01 | Chat panel accepts user messages, displays streamed assistant responses, mirrors `/chat` and `/tool-calling` UI | §Code Examples §Chat session creation; UI-SPEC AgentDrawer + ChatBox/ChatInput reuse |
| AGENT-02 | Chat agent uses `LanguageModel` tool-calling to invoke the SAME registered tools (single source) | §Architecture Patterns §Two-consumer adapter; §Code Examples §toLanguageModelTools |
| AGENT-03 | "scale to 6 and swap milk for oat milk" demo causes scaleRecipe + swapIngredient to fire and recipe UI updates live | §Tool Catalog (scaleRecipe behavior + swapIngredient case-insensitive matching); §Pitfall #5 (live state propagation across two-consumer paths) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

These are NOT design choices — they are project rules the planner MUST honor.

- **TypeScript strict mode** — no `: any`, no `as any` at API boundaries. The two `any` uses in `webmcp.d.ts` are spec-mandated (W3C IDL §4.2.1) and locked from Phase 1 — do not propagate `any` into new files.
- **Brownfield discipline** — do NOT refactor `/chat`, `/tool-calling`, `/writer`, `/summary`, `/translate`, or anything in `mcp/`, `mcp-client/`, `devops/awsweb/`. New code lives under `chat/src/app/components/RecipeWorkbench/` (UI), `chat/src/app/services/` (handler module), and `chat/src/app/types/` (no new types — Phase 1 already shipped them).
- **Native-only** — no `@mcp-b/global` polyfill. `navigator.modelContext` undefined → page-level `MissingFlagBanner` (already shipped) handles it.
- **IndexedDB only** — no backend. All tool handlers go through `RecipePersistence`.
- **DoD = "2-min demo"** — not reference-quality. Avoid retry loops, exponential backoff, telemetry — these are explicit V2 deferrals (REQUIREMENTS.md V2-03, V2-05).
- **Tailwind dark-mode** — every new `bg-*`/`text-*`/`border-*` class MUST have a `dark:` variant. UI-SPEC §Dark Mode Token Map already enumerates the required pairs.
- **No new build tooling** — Vitest is the test framework (`vitest.workspace.ts`). Dev port is **4300** (not 4200). React 19 + Vite + Tailwind v4 + react-router-dom only.
- **`webmcp.d.ts` ends with `export {}`** — Phase 1 deviation #1 forced this. Do not remove `export {}` and do not redeclare ambient types.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: WebMCP-first source of truth, derive for LanguageModel.** Build `recipeTools.ts` shaped for `navigator.modelContext.registerTool` (`{name, description, inputSchema, handler, annotations?}`). On mount, register each tool with WebMCP. The chat session derives its `LanguageModel.create({tools: [...]})` array from the same source list. Treats the page exactly like an external agent would.
  - **Researcher verification (this doc, §Open Questions Resolved Q1):** Chrome 146 Canary does NOT expose enumeration of registered tools on `navigator.modelContext`. Keep an in-module typed array as the local source and convert via `toLanguageModelTools()`. Single definition site preserved.

- **D-02: Bottom in-flow drawer (UI-SPEC interpretation).** Chat input + transcript pinned at the bottom of the workbench tab content. Recipe stays full-width above. NOT a `position: fixed` overlay.

- **D-03: Inline tool-use indicators.** When the agent invokes a tool, show `⚙ Calling scaleRecipe(servings: 6)…` then `✓ done` (or `✗ failed`). Recipe updates live in the workbench panel above.

- **D-04: Stream the assistant's text response.** Use `session.promptStreaming(text)` with incremental rendering, mirroring `/chat`'s pattern.
  - **Researcher verification (this doc, §Open Questions Resolved Q2):** Streaming + tool-calling is NOT documented as supported in the W3C spec. Every `tools` example uses `session.prompt()`. Existing `ToolCallingPage.tsx` (the only repo precedent) deliberately uses `prompt()`, not `promptStreaming()`. **Recommended: ship Phase 2 with non-streaming `session.prompt()` per CONTEXT.md's stated fallback.** Record as deviation in PLAN.

- **D-05: Compact tool list panel.** Show registered tool names + short descriptions in a collapsible panel in the chat drawer's top region.

- **D-06: Graceful inline messages in the chat panel.** `LanguageModel` unavailable → inline yellow banner inside the drawer. Tool handler throws → tool returns the error string; the agent sees it and tells the user. Empty/blocked → "Sorry, couldn't generate a response." No retries, no exponential backoff.

- **D-07: Registration confirmation pill.** `✓ 8 tools registered` (green) or `⚠ {n} of 8 tools registered` (yellow). Updates reactively from registration state.

### Claude's Discretion

- **System prompt content** for the in-page agent — planner authors one matching the existing `ToolCallingPage` style.
- **Tool error message wording** — planner picks something the model handles naturally.
- **Exact chat drawer height / breakpoints** — UI-SPEC has resolved this (`h-72 lg:h-72`, `h-[60vh] max-h-96` on `<lg`).
- **Registration confirmation pill placement** — UI-SPEC has resolved this (header, before `<ThemeToggle/>`).

### Deferred Ideas (OUT OF SCOPE)

- V2-08 follow-on tools: `convertToMetric`, `simplifyInstructions`, `findSubstitute`, `addStep`, `reorderSteps` — out of v1.
- Polished error states / production telemetry (V2-03, V2-05) — DoD is "demo-able".
- Live deployment of Phase 2 (V2-02) — local-only this milestone.
- Tool result streaming / async tool handlers beyond the agent's text response — explicitly out of scope per REQUIREMENTS.md "Out of Scope" table.
- Recipe creation from blank state (V2-07) — defer; tools manipulate seeded recipes only.
</user_constraints>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tool registration (`navigator.modelContext`) | Browser / Page (in `RecipeWorkbenchPage` mount effect) | — | WebMCP is intentionally page-side; the page is the canonical agent surface |
| Tool definitions (8 recipe tools) | Module (`recipeTools.ts` in `chat/src/app/services/`) | — | Single source of truth shared by both consumers (WebMCP + in-page LanguageModel) |
| Tool handlers (mutation logic) | Module → IndexedDB via `RecipePersistence` | React state setter callback | Handler reads/writes via `RecipePersistence`, then signals React via a setter passed in at registration time |
| In-page chat agent (LanguageModel) | Browser / Page (drawer-scoped session) | — | Native browser API; session lives for the page lifetime, destroyed on unmount |
| Tool-call lifecycle indicators (`⚙` → `✓`/`✗`) | React (chat transcript) | Wrapper around handler emits `pending`/`done`/`error` to a state slice | Indicator events fire for BOTH the WebMCP path and the LanguageModel path because both go through the same handler wrapper |
| External-agent verification | WebMCP Tool Inspector extension (Chrome 146 Canary, separate `navigator.modelContextTesting` API) | — | Manual UAT step; the inspector reads via `navigator.modelContextTesting`, not via the page's own `navigator.modelContext` reference |
| Recipe state (read by UI; mutated by tools) | IndexedDB via `RecipePersistence` (Phase 1) | React state in `RecipeWorkbenchPage` | Handlers `saveRecipe()` then trigger React re-fetch via the on-mutation callback |

**Tier-correctness check:** No work belongs in a backend tier — there is none. No work belongs in a CDN/static tier — all logic is dynamic. The "data layer" is browser-local IndexedDB, owned by `RecipePersistence` (already shipped Phase 1).

---

## Standard Stack

### Core (already installed — Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `idb` | 8.0.3 | IndexedDB wrapper used by `RecipePersistence` | Phase 1 dependency; tools mutate via this — DO NOT add a second persistence path |
| `react` | 19.x | Page + drawer + indicator | Existing |
| `react-router-dom` | 6.x | `/webmcp` route already mounts `RecipeWorkbenchPage` | Existing — no new routes in Phase 2 |
| `react-markdown` | * | Already used by `ChatBox` for streamed text rendering | Reuse via existing `ChatBox` |

### Supporting (no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind v4 (already configured) | — | Drawer styling, indicator styling, pill | Match UI-SPEC tokens |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `AbortController` for unregistration | Manual `unregisterTool(name)` per tool | The W3C IDL has no `unregisterTool` method. AbortController is the only mechanism. NOT a real choice. |
| `session.prompt()` (non-streaming) | `session.promptStreaming()` | Streaming is desired by D-04 but spec doesn't document streaming + tools. Existing `ToolCallingPage` uses `prompt()`. Defer streaming until Chrome explicitly supports it. |
| Single shared session across turns | Re-create session per turn | Existing `ToolCallingPage.tsx:200-208` keeps one session bound to the tools-array deps; re-creates only when tool list changes. Mirror that. |
| In-module typed array `RECIPE_TOOLS` | Read back from `navigator.modelContext` | Spec exposes no enumeration API. NOT a real choice. |

**Installation:** No new packages. All dependencies present from Phase 1.

**Version verification:**
```bash
$ grep '"idb"\|"react"\|"react-router-dom"\|"react-markdown"' /Users/danielos/dev/window-ai/package.json
```
Phase 1's 01-01-SUMMARY.md confirms `idb@^8.0.3` is installed. React 19 was validated by Phase 1 build (`nx build chat` exit 0).

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌────────────────────────────────────────┐
                          │  User types: "scale to 6 and swap…"    │
                          └────────────────┬───────────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │  AgentDrawer (in-page chat panel)   │
                        │  ChatInput → handleUserMessage()    │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │  session.prompt(text)               │
                        │  (LanguageModel session created     │
                        │   with tools from toLanguageModel-  │
                        │   Tools(RECIPE_TOOLS) on mount)     │
                        └──────────────────┬──────────────────┘
                                           │ model decides to call tools
                                           │ (Promise.all internally)
                        ┌──────────────────▼──────────────────┐
                        │  WRAPPED HANDLER                    │
                        │  1. setToolCallState(name, 'pending')│
                        │  2. validate args (defensive)       │
                        │  3. call core handler logic         │
                        │  4. setToolCallState(name, 'done')  │
                        │  5. return JSON.stringify(result)   │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │  Core handler logic                 │
                        │  - getRecipe(activeId)              │
                        │  - mutate (scale, swap, add, ...)   │
                        │  - saveRecipe(updated)              │
                        │  - notify page of change            │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │  RecipePersistence (IndexedDB)      │
                        │  saveRecipe → durable               │
                        └──────────────────┬──────────────────┘
                                           │ on every mutation
                        ┌──────────────────▼──────────────────┐
                        │  Page state refresh                 │
                        │  setRecipes([...]) re-renders the   │
                        │  WorkbenchPanel above the drawer    │
                        └──────────────────┬──────────────────┘
                                           │ recipe view updates
                                           │ live + survives reload
                                           ▼

External agent path (verification only):
   WebMCP Tool Inspector → navigator.modelContextTesting.listTools/.executeTool
   → reads the same RECIPE_TOOLS that the page registered via navigator.modelContext.registerTool
   → invokes the SAME wrapped handler → same state propagation
```

### Component Responsibilities

| File | Role |
|------|------|
| `chat/src/app/services/recipeTools.ts` (NEW) | Single source of truth: 8 tool definitions in WebMCP shape. Each entry: `{name, description, inputSchema, execute, annotations?}` matching `ModelContextTool`. |
| `chat/src/app/services/recipeToolHandlers.ts` (NEW) | Pure-logic handler bodies: `executeListRecipes`, `executeScaleRecipe`, etc. No React, no `navigator.modelContext`. Tested in isolation. |
| `chat/src/app/services/toolAdapter.ts` (NEW) | `toLanguageModelTools(tools, onToolCallEvent)` — converts `ModelContextTool[]` to the `LanguageModelCreateOptions['tools']` shape AND wraps each `execute` so it emits pending/done/error events to the page. |
| `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (NEW) | Drawer container with ToolListPanel + ChatTranscript + ChatInput + LanguageModelUnavailable. Owns the chat session lifecycle. |
| `chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx` (NEW) | Collapsible list of registered tool names + descriptions. |
| `chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx` (NEW) | In-flight / done / error system bubble inside the transcript. |
| `chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx` (NEW) | Header pill bound to registration state. |
| `chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx` (NEW) | Inline yellow message inside the drawer when `LanguageModel.availability() !== 'available'`. |
| `chat/src/app/components/RecipeWorkbenchPage.tsx` (MODIFY) | (1) `useEffect` registering all 8 tools via `AbortController`. (2) Pill in header. (3) `<AgentDrawer/>` rendered below the WorkbenchPanel inside the workbench tab. (4) Lift `recipes`/`activeId` setters into a callback the handlers invoke after `saveRecipe`. |

### Pattern 1: AbortSignal-driven mount/unmount tool registration

**What:** Use a single `AbortController` per page mount; `controller.abort()` on cleanup unregisters every tool atomically. The W3C spec has no `unregisterTool` method — `signal` is the only deregistration mechanism.

**When to use:** Always. This is the only way.

**Example:**
```tsx
// Source: webmcp.d.ts:20 + W3C WebMCP spec §registerTool §unregistration
useEffect(() => {
  if (!navigator.modelContext) return; // page-level banner already shown
  const controller = new AbortController();
  const registered: string[] = [];
  try {
    for (const tool of RECIPE_TOOLS) {
      navigator.modelContext.registerTool(tool, { signal: controller.signal });
      registered.push(tool.name);
    }
    setRegistrationState({ status: 'success', count: registered.length });
  } catch (err) {
    setRegistrationState({
      status: registered.length > 0 ? 'partial' : 'error',
      count: registered.length,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
  return () => controller.abort(); // unregisters all tools whose signal === controller.signal
}, []);
```

### Pattern 2: Single-source tool definitions, two consumers via adapter

**What:** Define tools once in WebMCP shape. Adapt to LanguageModel shape via `toLanguageModelTools(tools, onEvent)`. The adapter also wraps each `execute` to emit lifecycle events.

**When to use:** When the same tool function must be callable from both the WebMCP registration surface AND from the in-page LanguageModel session.

**Example:**
```ts
// Source: webmcp.d.ts:38 (ModelContextTool.execute) + dom-chromium-ai.d.ts:22-27 (LanguageModelCreateOptions.tools)
import type { Recipe } from './RecipePersistence';

export type ToolCallEvent =
  | { kind: 'pending'; toolName: string; args: Record<string, unknown> }
  | { kind: 'done'; toolName: string }
  | { kind: 'error'; toolName: string; message: string };

type LanguageModelTool = NonNullable<LanguageModelCreateOptions['tools']>[number];

export function toLanguageModelTools(
  tools: ModelContextTool[],
  onEvent: (e: ToolCallEvent) => void,
): LanguageModelTool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
    // dom-chromium-ai.d.ts requires Promise<string>; webmcp.d.ts allows unknown.
    // The wrapper unifies: stringify whatever the handler returned.
    execute: async (input: Record<string, unknown>) => {
      onEvent({ kind: 'pending', toolName: t.name, args: input ?? {} });
      try {
        const result = await t.execute(input);
        onEvent({ kind: 'done', toolName: t.name });
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        onEvent({ kind: 'error', toolName: t.name, message });
        // Return a string the model can read and explain to the user;
        // do NOT re-throw (the model needs to recover gracefully).
        return JSON.stringify({ error: message });
      }
    },
  }));
}
```

The same wrapper SHOULD be applied to the WebMCP-registered tools too (so an external agent's call also fires the indicator). The cleanest pattern: build wrapped tools once, pass the wrapped set to BOTH `navigator.modelContext.registerTool` and `LanguageModel.create({tools: ...})`.

### Pattern 3: State propagation from handler → React via setter callback

**What:** Each handler reads its current recipe via `getRecipe(id)`, mutates, calls `saveRecipe(updated)`, then notifies the page so React re-renders.

**When to use:** Every mutating handler (`scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`).

**Implementation choice:** A small singleton "recipe store" exposed by `recipeToolHandlers.ts` that the React page subscribes to. Concretely:

```ts
// Source: derived from RecipePersistence.ts:44-65 + repo's pattern of useState + useEffect mount-load.
type RecipeStoreListener = () => void;
const listeners = new Set<RecipeStoreListener>();

export function subscribeRecipeStore(listener: RecipeStoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyRecipeStore() {
  listeners.forEach((l) => l());
}
```

The page's `useEffect` does `subscribeRecipeStore(() => getRecipes().then(setRecipes))`. Every mutation handler ends with `await saveRecipe(updated); notifyRecipeStore();`. This handles both the in-page agent path AND the external agent path — both produce the same notification.

### Pattern 4: Active recipe identity via shared state, not closure

**What:** The "active recipe id" is currently page state in `RecipeWorkbenchPage`. Tool handlers like `scaleRecipe(servings)` need to know WHICH recipe to scale. Three viable options:

1. **(Recommended) Active id is a tool-handler input parameter — `recipeId?: string`.** The agent's system prompt explains "If `recipeId` is omitted, operate on the currently active recipe." The handler module exposes a `setActiveRecipeId` / `getActiveRecipeId` that the page wires to its `setActiveId`.
2. Pass a getter function as part of the tool factory at registration time — `createRecipeTools({ getActiveId: () => activeIdRef.current })`. Clean, but introduces a closure-bound factory.
3. Make `selectRecipe(id)` a precondition — every mutating tool requires explicit `recipeId`. Brittle for the demo phrase "scale to 6" which doesn't mention an id.

**Recommendation:** Option 1 + Option 2 hybrid. Tools take optional `recipeId`; default is the active id from a ref (set by `selectRecipe` and by the page's picker). Demo phrase works because the pancake recipe is preselected; agent doesn't need to call `selectRecipe` first.

### Anti-Patterns to Avoid

- **DON'T re-register tools on every render.** The `useEffect` for registration MUST have an empty dependency array (or, at most, a `key`-on-mount pattern). Re-registration during the same mount throws `InvalidStateError` because tool names must be unique.
- **DON'T destroy + recreate the LanguageModel session on every prompt.** Mirror `ToolCallingPage.tsx:200-208`: create on mount, destroy on unmount or when the tools array changes. Sessions preserve conversation history within the context window — recreating loses that.
- **DON'T forget the `system` prompt at position 0.** Per the spec, the system role MUST be first via `initialPrompts` (or as the first message). Placing it elsewhere rejects with `TypeError`. Mirror `ToolCallingPage.tsx:170-181`.
- **DON'T return non-strings from tool handlers when called via LanguageModel.** `dom-chromium-ai.d.ts:26` types `execute` as `(...args: any[]) => Promise<string>`. The adapter (Pattern 2 above) handles `JSON.stringify()` automatically. Inside core handlers, return objects; let the wrapper stringify.
- **DON'T re-declare `ModelContextTool` or `LanguageModel` types.** They live in `chat/src/app/types/webmcp.d.ts` and `chat/src/app/types/dom-chromium-ai.d.ts` from Phase 1. Use them — augmenting them again will cause TS2300 duplicate-identifier.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool unregistration | A custom registry of `() => void` per-tool unregisters | `AbortController` once + `controller.abort()` on cleanup | Spec uses signal-based deregistration; it's the only way |
| JSON Schema validation in handlers | A schema validator (ajv etc.) | Defensive runtime checks (`typeof args.servings === 'number'`) and `if (Number.isFinite(...) && val > 0)` | The spec leaves UA-side validation unspecified; adding a 100kb validator for 8 tools is overkill for the 2-min demo |
| Handler-result stringification | Per-handler `return JSON.stringify(...)` boilerplate | The `toLanguageModelTools` wrapper auto-stringifies (Pattern 2) | DRY — handlers return objects, the wrapper stringifies once |
| Streaming text rendering | A custom token reader | Reuse `ChatBox` as-is (its existing `prose prose-sm` Markdown wrapper handles incremental updates) | Already shipped; the streaming reader-loop pattern is in `ChatPage.tsx:67-83` |
| Tool-call event bus | A custom EventEmitter | A simple `useState` + setter passed to `toLanguageModelTools`'s `onEvent` callback | The set of consumers is tiny (one drawer); no need for pub/sub |
| Recipe identity / activeId in handlers | Re-fetch all recipes inside every handler | A module-scoped `activeIdRef` + `setActiveRecipeId` (Pattern 4 Option 1+2 hybrid) | Avoids closure-staleness and keeps handlers callable from external agents that don't have the React state |

**Key insight:** The repo already ships every primitive needed (Phase 1 types, `RecipePersistence`, `ChatBox`, `ChatInput`, `ToolCallingPage` reference pattern, `MissingFlagBanner` styling). Phase 2's risk is over-engineering — adding state libraries, message buses, or custom validators where 50 lines of plain TS suffice.

---

## Tool Catalog (the 8 tools)

For each tool: WebMCP shape (registered via `navigator.modelContext.registerTool`), JSON Schema, and concrete handler behavior. All `inputSchema` use JSON Schema 2020-12-compatible shapes (matches the existing `ToolCallingPage.tsx` pattern, e.g. `inputSchema: { type: 'object', properties: { ... }, required: [...] }`).

> Tool names are constrained by the W3C spec to **`[A-Za-z0-9_\-.]{1,128}`** with uniqueness within the page. All 8 names below are camelCase ASCII alphanumeric — fully compliant.

### 1. `listRecipes` (read-only)

```ts
{
  name: 'listRecipes',
  description: 'List all saved recipes with id, title, and serving count. Use this to see what recipes are available before scaling, swapping, or generating a shopping list.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    const recipes = await getRecipes();
    return recipes.map(r => ({ id: r.id, title: r.title, servings: r.servings }));
  },
}
```
**Returns:** Array of `{id, title, servings}`. Wrapper stringifies.

### 2. `getRecipe` (read-only)

```ts
{
  name: 'getRecipe',
  description: 'Get the full details of a recipe by id, including ingredients (name + quantity + unit) and ordered steps.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string', description: 'Recipe id (e.g. "buttermilk-pancakes")' } },
    required: ['id'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ id }: { id: string }) {
    const recipe = await getRecipe(id);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    return recipe;
  },
}
```

### 3. `selectRecipe` (state-only mutation, no IndexedDB write)

```ts
{
  name: 'selectRecipe',
  description: 'Make a recipe the currently active one in the workbench. Subsequent tools (scaleRecipe, swapIngredient, etc.) operate on the active recipe by default.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
    additionalProperties: false,
  },
  async execute({ id }: { id: string }) {
    const recipe = await getRecipe(id);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    setActiveRecipeId(id);   // updates the module-scoped ref AND notifies the page
    return { activeId: id, title: recipe.title };
  },
}
```
**Note:** Doesn't write to IndexedDB. It updates the page's notion of "which recipe is being edited" so subsequent calls without an explicit `recipeId` operate on it.

### 4. `scaleRecipe` (mutating — DEMO-CRITICAL)

```ts
{
  name: 'scaleRecipe',
  description: 'Scale a recipe to a new serving count. All ingredient quantities are scaled proportionally (newQty = oldQty * newServings / oldServings). Operates on the active recipe unless recipeId is provided.',
  inputSchema: {
    type: 'object',
    properties: {
      servings: { type: 'integer', minimum: 1, description: 'Target servings count' },
      recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
    },
    required: ['servings'],
    additionalProperties: false,
  },
  async execute({ servings, recipeId }: { servings: number; recipeId?: string }) {
    if (!Number.isFinite(servings) || servings < 1) {
      throw new Error(`servings must be a positive integer, got ${servings}`);
    }
    const id = recipeId ?? getActiveRecipeId();
    if (!id) throw new Error('No active recipe and no recipeId provided');
    const recipe = await getRecipe(id);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    const factor = servings / recipe.servings;
    const updated: Recipe = {
      ...recipe,
      servings,
      ingredients: recipe.ingredients.map((ing) => ({
        ...ing,
        // RecipePersistence.ts:5 declares quantity: number — always numeric, no "to taste"
        quantity: roundToTwo(ing.quantity * factor),
      })),
    };
    await saveRecipe(updated);
    notifyRecipeStore();
    return { id, oldServings: recipe.servings, newServings: servings, factor };
  },
}
```
**Critical detail (verified by reading `RecipePersistence.ts:3-7`):** `Ingredient.quantity` is typed `number`, NOT `string`. CONTEXT.md's worry about "to taste" / "1 pinch" is moot — every quantity in the seed recipes (verified by reading `recipeSeed.ts:10-15, 30-35`) is a finite number. The handler can always multiply.

`roundToTwo` is a utility (`Math.round(x * 100) / 100`) to avoid 0.6000000000000001 display artifacts.

### 5. `swapIngredient` (mutating — DEMO-CRITICAL)

```ts
{
  name: 'swapIngredient',
  description: 'Replace an ingredient name in the active recipe. Matches the first ingredient whose name contains the search term (case-insensitive). Quantity and unit are preserved unless overrides are passed.',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Ingredient name to replace (case-insensitive substring match)' },
      to: { type: 'string', description: 'New ingredient name' },
      recipeId: { type: 'string' },
      newQuantity: { type: 'number', minimum: 0 },
      newUnit: { type: 'string' },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  },
  async execute({ from, to, recipeId, newQuantity, newUnit }: {...}) {
    const id = recipeId ?? getActiveRecipeId();
    const recipe = await getRecipe(id!);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    const idx = recipe.ingredients.findIndex(
      (ing) => ing.name.toLowerCase().includes(from.toLowerCase()),
    );
    if (idx === -1) {
      throw new Error(`No ingredient matching "${from}" in "${recipe.title}". Available: ${recipe.ingredients.map(i => i.name).join(', ')}`);
    }
    const updated: Recipe = {
      ...recipe,
      ingredients: recipe.ingredients.map((ing, i) => i === idx
        ? { name: to, quantity: newQuantity ?? ing.quantity, unit: newUnit ?? ing.unit }
        : ing),
    };
    await saveRecipe(updated);
    notifyRecipeStore();
    return { id, replaced: recipe.ingredients[idx].name, with: to };
  },
}
```
**Demo correctness:** The phrase "swap milk for oat milk" against the pancakes recipe — `recipe.ingredients` contains `{name: 'buttermilk', ...}`. **Case-insensitive substring match** (`'buttermilk'.toLowerCase().includes('milk')`) returns true. The handler replaces "buttermilk" with "oat milk", preserving quantity (240) and unit (ml). The error message lists available ingredients so the model can recover if the user typos.

**Recommendation:** case-insensitive **substring** matching (not exact). Spelled out in the description so the model passes substrings.

### 6. `addIngredient` (mutating)

```ts
{
  name: 'addIngredient',
  description: 'Add a new ingredient to the active recipe. quantity is a positive number; unit is a free-form string like "g", "ml", "cup", "tbsp", "tsp", "piece".',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      quantity: { type: 'number', minimum: 0 },
      unit: { type: 'string' },
      recipeId: { type: 'string' },
    },
    required: ['name', 'quantity', 'unit'],
    additionalProperties: false,
  },
  async execute({ name, quantity, unit, recipeId }: {...}) {
    const id = recipeId ?? getActiveRecipeId();
    const recipe = await getRecipe(id!);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    const updated: Recipe = {
      ...recipe,
      ingredients: [...recipe.ingredients, { name, quantity, unit }],
    };
    await saveRecipe(updated);
    notifyRecipeStore();
    return { id, added: { name, quantity, unit } };
  },
}
```

### 7. `removeIngredient` (mutating)

```ts
{
  name: 'removeIngredient',
  description: 'Remove an ingredient from the active recipe by name (case-insensitive substring match, same matcher as swapIngredient).',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      recipeId: { type: 'string' },
    },
    required: ['name'],
    additionalProperties: false,
  },
  async execute({ name, recipeId }: {...}) {
    const id = recipeId ?? getActiveRecipeId();
    const recipe = await getRecipe(id!);
    if (!recipe) throw new Error(`No recipe with id "${id}"`);
    const idx = recipe.ingredients.findIndex(
      (ing) => ing.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (idx === -1) {
      throw new Error(`No ingredient matching "${name}" in "${recipe.title}".`);
    }
    const removed = recipe.ingredients[idx];
    const updated: Recipe = {
      ...recipe,
      ingredients: recipe.ingredients.filter((_, i) => i !== idx),
    };
    await saveRecipe(updated);
    notifyRecipeStore();
    return { id, removed };
  },
}
```

### 8. `generateShoppingList` (read-derived)

```ts
{
  name: 'generateShoppingList',
  description: 'Generate a consolidated shopping list across all saved recipes. Ingredients with the same name+unit are summed. If a recipeId is provided, only that recipe is used.',
  inputSchema: {
    type: 'object',
    properties: { recipeId: { type: 'string' } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ recipeId }: { recipeId?: string } = {}) {
    const recipes = recipeId
      ? [await getRecipe(recipeId)].filter(Boolean) as Recipe[]
      : await getRecipes();
    const map = new Map<string, { name: string; quantity: number; unit: string }>();
    for (const recipe of recipes) {
      for (const ing of recipe.ingredients) {
        const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) existing.quantity += ing.quantity;
        else map.set(key, { ...ing });
      }
    }
    return { items: Array.from(map.values()) };
  },
}
```
**Note:** Read-only; does not write to IndexedDB.

### Tool registration order

Order doesn't matter for the spec, but for the UI tool list the planner should sort: **read-only first** (`listRecipes`, `getRecipe`, `generateShoppingList`), **state-only** (`selectRecipe`), **mutators** (`scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`). Reads the most natural in the UI panel.

---

## Tool Inspector Verification (MCP-05)

**Manual UAT step — not automated.**

1. **Prereq:** Chrome 146.0.7672.0+ Canary with TWO flags enabled:
   - `chrome://flags/#WebMCP for testing` → **Enabled** (page-side `navigator.modelContext` API)
   - `chrome://flags/#enable-webmcp-testing` → **Enabled** (extension-side `navigator.modelContextTesting` API; required by the inspector)
2. **Install extension:** [Model Context Tool Inspector on Chrome Web Store](https://chromewebstore.google.com/detail/webmcp-devtools/cgfogfkcfjdgpekdndcihajfjkaekjcl) OR build from source ([beaufortfrancois/model-context-tool-inspector](https://github.com/beaufortfrancois/model-context-tool-inspector)).
3. **Test:** Navigate to `http://localhost:4300/webmcp`. Open the inspector via the extension toolbar icon. The side panel should:
   - Show all 8 tool names (`listRecipes`, `getRecipe`, `selectRecipe`, `scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`, `generateShoppingList`)
   - Show each tool's description text
   - Show each tool's `inputSchema` as expanded JSON
   - Allow manual execution: dropdown picks a tool, JSON args textarea, "Execute Tool" button, result area
   - The extension badge shows `8` (registered tool count) on the active tab
4. **Verifies:** the page registered with `navigator.modelContext.registerTool` AND the registration is visible to the parallel `navigator.modelContextTesting` testing surface.

**Pitfall:** if the user has only `#WebMCP for testing` (and not `#enable-webmcp-testing`), the page works but the inspector panel will show 0 tools. Document both flag toggles in the PLAN's manual UAT checklist.

---

## Common Pitfalls

### Pitfall 1: Re-registering on every render

**What goes wrong:** `useEffect(() => { for (...) registerTool(...) })` without `[]` deps fires on every render. The W3C spec throws `InvalidStateError` if a tool with the same name is registered twice on the same `ModelContext`.

**Why it happens:** Forgotten dependency array; or putting `recipes` / `activeId` in deps when the registration effect doesn't actually depend on those values.

**How to avoid:** Empty deps array. Active-id and recipes are read by handlers via the module-scoped ref (Pattern 4), not via the effect closure.

**Warning signs:** Console shows `InvalidStateError: A tool with name "scaleRecipe" is already registered` after navigating away and back.

### Pitfall 2: AbortController re-use across re-renders

**What goes wrong:** Hoisting `const controller = new AbortController()` outside the effect means StrictMode's double-invoke or re-mount uses the same already-aborted controller, and re-registration silently fails.

**How to avoid:** Always `const controller = new AbortController()` INSIDE the effect body. Mirror the `cancelled = false` pattern in `RecipeWorkbenchPage.tsx:60-80` exactly — the controller has the same role as that flag.

**Warning signs:** After the second StrictMode mount, no tools appear in the inspector even though no error logs.

### Pitfall 3: System prompt at wrong position

**What goes wrong:** Per the W3C spec: "Placing the `{ role: 'system' }` prompt anywhere besides at the 0th position of the first LanguageModelMessage sequence sent to any of `create()`, `append()`, or `prompt()` will reject with a TypeError."

**How to avoid:** Mirror `ToolCallingPage.tsx:170-181` — pass `initialPrompts: [{role: 'system', content: ...}]` to `LanguageModel.create`. Don't append it later.

### Pitfall 4: Tool handler returning a non-string to LanguageModel

**What goes wrong:** `dom-chromium-ai.d.ts:26` types `execute: (...args: any[]) => Promise<string>`. Returning an object is technically a TS error and may also confuse the model.

**How to avoid:** The `toLanguageModelTools` wrapper (Pattern 2) auto-stringifies. Inside core handlers, return whatever shape is convenient; the wrapper handles the conversion. The WebMCP spec's `execute` allows `unknown`, so the same handler is fine for both consumers.

### Pitfall 5: Tool fires but recipe view doesn't update

**What goes wrong:** Handler does `saveRecipe(updated)` but the page's `recipes` state is unchanged. The user sees the tool-call indicator complete but the recipe view stays stale.

**Why it happens:** No mechanism to tell React that IndexedDB changed. React doesn't watch IndexedDB.

**How to avoid:** Call `notifyRecipeStore()` immediately after `saveRecipe(...)` in every mutating handler. The page subscribes via `subscribeRecipeStore(() => getRecipes().then(setRecipes))` and re-fetches on every notification.

**Critical for AGENT-03:** the demo phrase fires TWO tools (scaleRecipe + swapIngredient). Both must call `notifyRecipeStore()`. Without it, the user sees the second tool's effect but not the first (or vice-versa, depending on render timing).

**Warning signs:** Indicator shows `✓ scaleRecipe done` but the "Serves 4" text doesn't change to "Serves 6".

### Pitfall 6: Streaming + tools combo silently dropping tool calls

**What goes wrong:** Calling `session.promptStreaming(text)` on a session created with `tools` either throws, returns no text, or returns text without invoking any tool. Spec is silent on the combination, and existing repo code (`ToolCallingPage.tsx:232`) deliberately uses `prompt()` not `promptStreaming()`.

**How to avoid:** Use `session.prompt(text)` (non-streaming) for the chat agent. Re-evaluate streaming once the spec or Chrome docs explicitly support it. Document in the PLAN's deviations.

**Warning signs:** Demo phrase produces no tool calls; agent text is generic; or stream stalls and never closes.

### Pitfall 7: Cumulative-vs-delta streaming chunk semantics

**What goes wrong (only relevant if streaming is used later):** Chrome's `promptStreaming()` returns chunks where each chunk may contain ALL prior text (cumulative), not just the delta. The repo's `ChatPage.tsx:76` already encodes this: `lastMessage.text = isCanary ? lastMessage.text + value : value` — appends in non-Canary, replaces in Canary. **This is a Canary-version-dependent behavior.**

**How to avoid:** Reuse `ChatPage.tsx`'s reader-loop verbatim if streaming is added later. Don't reinvent.

**Warning signs:** Streaming text appears, then the message visibly resets and re-grows.

### Pitfall 8: Tool name collisions across pages

**What goes wrong:** `navigator.modelContext` is per-document. Tools register on the Recipe Workbench mount; if SPA navigation goes to another page that also registers a tool named e.g. `getRecipe`, the new register fails with InvalidStateError because the unmount cleanup ran but the `getRecipe` already in the WebMCP map wasn't from this page.

**How to avoid:** Always run cleanup (AbortController) on unmount. SPA route changes call the cleanup automatically because React unmounts the page component. Verify by navigating `/webmcp → /chat → /webmcp`: the second mount must succeed.

**Warning signs:** Pill shows `⚠ 0 of 8 tools registered` after navigating back to `/webmcp`.

### Pitfall 9: `navigator.modelContext` may be defined but throw on registerTool

**What goes wrong:** `navigator.modelContext` exists but `registerTool` throws because the page was opened in a non-Secure Context (file://) or a sandboxed iframe.

**How to avoid:** Wrap the registration in try/catch (already in Pattern 1). If anything throws, mark registration state as `error`/`partial` and the pill shows the warning. The page-level `MissingFlagBanner` only fires on `!navigator.modelContext`; the pill handles the runtime-throw case.

### Pitfall 10: ChatInput's existing `onSend` signature has TWO params

**What goes wrong (verified by reading `ChatInput.tsx:4`):** `onSend: (message: string, action: "Prompt" | "Translate") => void`. The drawer's handler must accept this 2-arg signature even though the second arg is unused for the agent.

**How to avoid:** Define `handleUserMessage = (text: string, _action: 'Prompt' | 'Translate') => { ... }` on the drawer and ignore the second arg. Don't try to "fix" `ChatInput`'s signature — that's a brownfield refactor and out of scope.

---

## Code Examples

### Mount-effect tool registration (in RecipeWorkbenchPage)

```tsx
// Source: webmcp.d.ts:20 + W3C spec; mirrors RecipeWorkbenchPage.tsx:60-80 cancelled-flag pattern.
import { recipeTools } from '../services/recipeTools'; // factory: tool definitions
import { wrapToolsWithEvents, toLanguageModelTools } from '../services/toolAdapter';

const [registration, setRegistration] = useState<RegistrationState>({ status: 'idle' });
const [toolEvents, dispatchToolEvent] = useReducer(toolEventReducer, {});

useEffect(() => {
  if (!navigator.modelContext) return;
  const controller = new AbortController();
  const wrapped = wrapToolsWithEvents(recipeTools, dispatchToolEvent);
  const registered: string[] = [];
  try {
    for (const tool of wrapped) {
      navigator.modelContext.registerTool(tool, { signal: controller.signal });
      registered.push(tool.name);
    }
    setRegistration({ status: 'success', count: registered.length });
  } catch (err) {
    setRegistration({
      status: registered.length > 0 ? 'partial' : 'error',
      count: registered.length,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
  return () => controller.abort();
}, []);
```

### Session creation in AgentDrawer

```tsx
// Source: ToolCallingPage.tsx:162-198 + dom-chromium-ai.d.ts:11-34.
const SYSTEM_PROMPT = `You are a recipe assistant. The user is editing recipes. You have tools to list, scale, swap ingredients, add/remove ingredients, and generate shopping lists. When asked to scale a recipe and swap an ingredient in the same turn, call BOTH tools — they can run concurrently. Always confirm what you did in plain language. If a tool returns {error: "..."}, explain the problem to the user and suggest a fix.`;

const [session, setSession] = useState<LanguageModel | null>(null);

useEffect(() => {
  let cancelled = false;
  (async () => {
    if (!('LanguageModel' in globalThis)) return;
    const availability = await LanguageModel.availability();
    if (availability !== 'available') {
      setUnavailableReason(availability);
      return;
    }
    try {
      const newSession = await LanguageModel.create({
        initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
        tools: toLanguageModelTools(recipeTools, dispatchToolEvent),
      });
      if (cancelled) {
        newSession.destroy();
        return;
      }
      setSession(newSession);
    } catch (err) {
      console.error('Failed to create session', err);
      setSessionInitFailed(true);
    }
  })();
  return () => {
    cancelled = true;
    session?.destroy();
  };
}, []); // create once per mount

const handleUserMessage = async (text: string, _action: 'Prompt' | 'Translate') => {
  if (!session) {
    addMessage('Couldn\'t start the agent. Reload the page or check Chrome built-in AI.', 'Bot');
    return;
  }
  setIsLoading(true);
  addMessage(text, 'User');
  try {
    // NON-streaming, per CONTEXT.md D-04 fallback (verified by §Pitfall 6).
    const response = await session.prompt(text);
    addMessage(response || 'Sorry, I couldn\'t generate a response. Try rephrasing your request.', 'Bot');
  } catch (err) {
    console.error('Error getting AI response:', err);
    addMessage('Sorry, I couldn\'t generate a response. Try rephrasing your request.', 'Bot');
  } finally {
    setIsLoading(false);
  }
};
```

### Recipe store subscribe pattern

```ts
// Source: derived from RecipePersistence.ts:44-65 + the React useSyncExternalStore mental model.
// Lives in: chat/src/app/services/recipeStore.ts (NEW)
type Listener = () => void;
const listeners = new Set<Listener>();
let activeRecipeId: string | null = null;

export const subscribeRecipeStore = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const notifyRecipeStore = (): void => listeners.forEach(l => l());
export const setActiveRecipeId = (id: string | null): void => {
  activeRecipeId = id;
  notifyRecipeStore();
};
export const getActiveRecipeId = (): string | null => activeRecipeId;
```

In the page:
```tsx
// In RecipeWorkbenchPage's mount effect, right after the seed/load:
useEffect(() => {
  const unsub = subscribeRecipeStore(() => {
    getRecipes().then(setRecipes);
  });
  return unsub;
}, []);

// Also keep activeRecipeId in sync from the picker:
const handleSelect = (id: string) => {
  setActiveId(id);
  setActiveRecipeId(id); // mirrors page state into the store ref so handlers see it
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polyfill via `@mcp-b/global` | Native `navigator.modelContext` only | Chrome 146 Canary (Feb 2026 W3C draft) | Polyfill rejected for this milestone — banner instead |
| Per-tool `unregisterTool(name)` calls | Single `AbortController` + `signal` option | W3C spec finalized — no `unregisterTool` method exists | Mount/unmount becomes one controller, not 8 cleanup calls |
| Tool inspection via reading `navigator.modelContext.tools` | No-op — spec exposes no enumeration; Tool Inspector uses parallel `navigator.modelContextTesting` API | W3C draft chose external-only enumeration | Page must keep its own typed array as the source |
| Streaming + tool-calling | Non-streaming `session.prompt()` until streaming + tools is documented | Chrome Prompt API current state | Phase 2 ships non-streaming; reconsider in V2 |

**Deprecated/outdated:**
- `topK` and `temperature` on `LanguageModel.create()` are deprecated in web-page contexts (only honored in Chrome Extensions). The chat agent should not pass them.
- `systemPrompt: string` (top-level) is deprecated in favor of `initialPrompts: [{role: 'system', ...}]`. Use the initialPrompts form to match `ToolCallingPage.tsx:170-181`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Chrome 146 Canary's `navigator.modelContext` accepts the exact `ModelContextTool` shape declared in `webmcp.d.ts` (W3C IDL §4.2.1) at runtime, not just at TypeScript compile time | Tool Catalog | Tools may fail to register at runtime; pill flips to error. Mitigation: register one at a time, capture per-tool errors |
| A2 | Streaming + tools is unstable enough to justify defaulting to non-streaming. Based on negative evidence (no spec example pairs them; existing `ToolCallingPage` uses `prompt()`) — not a documented "do not combine" warning | Pattern §D-04 fallback | If streaming + tools actually works in the target Canary build, the demo could use streaming for a slightly nicer UX. Easy to flip later |
| A3 | The Tool Inspector extension visibly displays the tools we register via `navigator.modelContext.registerTool`, since both APIs are gated by the SAME flag combo (`#WebMCP for testing` + `#enable-webmcp-testing`) | Tool Inspector Verification | If the inspector requires a different registration call, MCP-05 fails until that's fixed. Mitigation: have user enable both flags before UAT |
| A4 | Case-insensitive substring matching for `swapIngredient(from)` is the right default. "milk" matching "buttermilk" is correct for the demo phrase | Tool Catalog §swapIngredient | If exact-match was wanted, "swap milk for oat milk" would error because there's no exact "milk" ingredient — bad demo. Substring is the demo-friendly choice |
| A5 | The "active recipe" pattern via module-scoped ref is acceptable. Tools accept optional `recipeId` as override | Pattern 4 | If the user wants tools to be pure (no implicit page state), every mutating tool would need explicit `recipeId`, breaking the natural-language demo phrase |

**All claims have a primary source or repo grep behind them.** The only assumed claims are A1, A2, and A3 — A1 is fundamentally unverifiable without running Canary right now; A2 is a recommendation based on negative evidence; A3 is consistent with multiple third-party tutorials but I could not confirm the exact flag interaction without installing the extension.

---

## Open Questions Resolved (from CONTEXT.md "Researcher MUST verify")

### Q1: Does Chrome 146 Canary expose tool enumeration on `navigator.modelContext`?

**Answer: NO.**

**Evidence:**
- W3C WebMCP draft spec (https://webmachinelearning.github.io/webmcp/) defines `ModelContext` interface with two methods only: `registerTool(tool, options?)` and `provideContext(context)`. No `tools` getter, no `getTools()`, no `registeredTools` property.
- Repo's `chat/src/app/types/webmcp.d.ts:15-22` declares `ModelContext` with exactly those two methods, matching the spec.
- The Tool Inspector extension reads tools via a SEPARATE `navigator.modelContextTesting` API (gated by `chrome://flags/#enable-webmcp-testing`), not via `navigator.modelContext`.

**Implication for plan:** Keep an in-module typed `RECIPE_TOOLS` array as the local source of truth; convert via `toLanguageModelTools()` adapter for the in-page agent. This is CONTEXT.md D-01's "if no enumeration" branch.

### Q2: Streaming + tool-calling in Chrome 146 Canary?

**Answer: NOT documented as supported. Recommend non-streaming.**

**Evidence:**
- W3C prompt-api spec (https://github.com/webmachinelearning/prompt-api): every code example with `tools` uses `session.prompt()`. No example combines `tools` with `promptStreaming()`.
- Chrome's official docs (https://developer.chrome.com/docs/ai/prompt-api): the docs cover `promptStreaming` and tools separately, never together.
- Existing `chat/src/app/components/ToolCallingPage.tsx:232` uses `await session.prompt(text)` (non-streaming) — and the file's `availableTools` array is the closest existing reference. The author chose `prompt`, not `promptStreaming`, even though the page's structural mate `ChatPage.tsx` uses `promptStreaming`.
- Third-party tutorials (Sitepoint, Raymond Camden) discussing tool-calling pair it with `prompt()`, not `promptStreaming()`. The spec also notes streaming chunk semantics may be cumulative-vs-delta in the current Canary, adding uncertainty.

**Implication for plan:** Use `session.prompt()` for the chat agent. Document this as a deliberate deviation from CONTEXT.md D-04 (which specified streaming as the preferred path with non-streaming as fallback). UI-SPEC FLAG-UI-04 already accepts this — only the "awaiting first token" state lasts longer.

### Q3: WebMCP Tool Inspector verification flow?

**Answer: Side-panel extension; requires Chrome 146 Canary + two flags.**

**Evidence:** See §Tool Inspector Verification above. Sources:
- https://github.com/beaufortfrancois/model-context-tool-inspector (official from Chrome team's Beaufort François)
- https://github.com/GoogleChromeLabs/webmcp-tools (parent repo with the inspector + evals CLI + demos)
- https://chromewebstore.google.com/detail/webmcp-devtools/cgfogfkcfjdgpekdndcihajfjkaekjcl (alternative third-party "WebMCP DevTools")

### Q4: `navigator.modelContext.registerTool` exact API surface?

**Answer:** From spec + repo's `webmcp.d.ts`:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | yes | string | `[A-Za-z0-9_\-.]{1,128}`, unique per page |
| `description` | yes | string | Human-readable |
| `execute` | yes | `(input, client?) => Promise<unknown> \| unknown` | Spec allows `any` input + `unknown` return; LanguageModel adapter requires Promise<string> |
| `inputSchema` | optional | `object` (JSON Schema 2020-12) | If absent, internal "stringified input schema" is empty string |
| `title` | optional | string | Display title (separate from `name`) |
| `annotations` | optional | `{readOnlyHint?: boolean, untrustedContentHint?: boolean}` | Hints to the agent |
| Options.signal | optional | AbortSignal | **THE ONLY way to unregister** — abort the signal to deregister |

`registerTool` returns `undefined`. Re-registration with same name throws `InvalidStateError`.

### Q5: JSON Schema shape compatible with both consumers?

**Answer: Identical shape works for both.**

Both `webmcp.d.ts:32` (`inputSchema?: object`) and `dom-chromium-ai.d.ts:25` (`inputSchema: object`) accept any JSON Schema object. The existing `ToolCallingPage.tsx:43-53` uses the gold-standard pattern:
```ts
inputSchema: {
  type: 'object',
  properties: { location: { type: 'string', description: '...' } },
  required: ['location'],
}
```
Mirror this exactly for all 8 tools. Per W3C spec, JSON Schema 2020-12 is implied (normative reference). Don't add a `$schema` field unless you have a specific need — it's optional and not present in any repo example.

### Q6: StrictMode-safe registration pattern?

**Answer: Mirror `RecipeWorkbenchPage.tsx:60-80` `cancelled` flag pattern, but use `AbortController` in place of the boolean.**

The existing mount effect uses:
```tsx
useEffect(() => {
  let cancelled = false;
  (async () => { ... if (cancelled) return; ... })();
  return () => { cancelled = true; };
}, []);
```

For tool registration, the pattern is conceptually identical:
```tsx
useEffect(() => {
  const controller = new AbortController();
  // synchronous registration loop (no race window)
  for (const tool of wrapped) navigator.modelContext.registerTool(tool, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

StrictMode double-invoke is safe because:
1. First mount: register 8 tools with controller A.
2. Cleanup runs: `controller.abort()` deregisters all 8.
3. Second mount: new `controller B`, re-register 8 with the new signal. No collision because the first 8 are already gone.

The `cancelled` flag is only needed for ASYNC mount work (the existing seed/load); registration is synchronous so the controller alone suffices.

### Q7: `LanguageModel` session lifecycle?

**Answer (from `ToolCallingPage.tsx:162-208`):**

- **(a) When to call `session.destroy()`:** On unmount, AND when re-creating (e.g. tool list changed). The pattern is `if (session) session.destroy(); ... setSession(newSession)`.
- **(b) Long-lived vs per-turn session:** **Long-lived.** Existing `ToolCallingPage` keeps the session for the page lifetime; it preserves conversation history within the context window. Re-creating per turn loses history (worse UX) and incurs creation cost.
- **(c) `initialPrompts` and system prompt persistence:** The system prompt persists across turns within a session. `clone()` is available if you want to fork — not needed for Phase 2's single-conversation drawer.

### Q8: Concrete handler logic for mutating tools?

**Answer: See §Tool Catalog above** — full TypeScript signatures with behavior, defensive validation, and edge-case handling for all 8 tools. Key points:
- `Ingredient.quantity` is `number` (verified `RecipePersistence.ts:5`) — no string-quantity edge cases.
- `swapIngredient`: case-insensitive **substring** matching (verified to work for "milk" → "buttermilk" in the seeded pancake recipe).
- All mutators end with `await saveRecipe(updated); notifyRecipeStore();` — DON'T forget the second call.
- All handlers throw human-readable Error messages on failure; the wrapper catches and returns `JSON.stringify({error: msg})` to the model.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | dev server, tests, build | ✓ (Phase 1 verified) | (per `nx build chat` exit 0) | — |
| Nx workspace tooling | `nx serve chat`, `nx build chat` | ✓ | 21.5.x | — |
| Vitest | tests (none ship in Phase 2) | ✓ (configured but no tests added) | per `vitest.workspace.ts` | — |
| `idb@8.0.3` | `RecipePersistence` (Phase 1) | ✓ | 8.0.3 (Phase 1 installed) | — |
| Chrome 146 Canary (developer machine) | manual UAT for Tool Inspector + LanguageModel availability | ✓ (assumed for milestone DoD) | 146.0.7672.0+ | — (if missing, only manual UAT blocked) |
| `chrome://flags/#WebMCP for testing` | `navigator.modelContext` page-side API | manual user step | — | Page-level `MissingFlagBanner` already handles this |
| `chrome://flags/#enable-webmcp-testing` | `navigator.modelContextTesting` (Tool Inspector reads via this) | manual user step | — | Without it, MCP-05 verification fails — pill still shows green |
| Built-in `LanguageModel` model download | in-page agent | manual user step | — | `LanguageModelUnavailable` inline banner shows instructions |
| `@mcp-b/global` polyfill | NOT used | — | — | Out of scope per PROJECT.md |

**Missing dependencies with no fallback:**
- None at the development time. All blockers are environment-side (browser flags + model download) and have user-facing fallback UI.

**Missing dependencies with fallback:**
- `LanguageModel` not available → `LanguageModelUnavailable` inline banner inside the drawer; recipe browsing + WebMCP registration continue to work.
- `navigator.modelContext` not available → page-level `MissingFlagBanner` (Phase 1) — recipe browsing still works.

---

## Security Domain

`security_enforcement` is implicit (not explicitly false in `.planning/config.json`). Below is a focused threat sweep for Phase 2's surface — short because the surface is small (no network, no auth, no storage of secrets).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | — (single-user local browser context; no auth boundary) |
| V3 Session Management | no | — (no server sessions; LanguageModel session is browser-local) |
| V4 Access Control | no | — (no multi-user) |
| V5 Input Validation | yes | Defensive runtime checks in every handler (`Number.isFinite(servings)`, etc.). `inputSchema` is hint-only — UA validation is unspecified per W3C |
| V6 Cryptography | no | — (no secrets, no signing, no hashing) |
| V7 Error Handling and Logging | yes | Handlers throw Error with safe messages; wrapper catches and returns `{error: msg}` to the model. NO stack traces logged (mirrors Phase 1 pattern) |
| V8 Data Protection | partial | IndexedDB is browser-local; no PII collected. Recipe data is user-input but non-sensitive |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tool input from agent contains malicious content (e.g. `from: "<script>"` in swapIngredient) | Tampering | All values render through React JSX text nodes (no `dangerouslySetInnerHTML` — verified policy from Phase 1 deviations). XSS surface is zero |
| Tool name collision attack (other tab registers same name) | Tampering / Spoofing | `navigator.modelContext` is per-document; cross-document name collisions are not possible |
| Untrusted tool result rendered to user | Information Disclosure | The agent's text response is Markdown-rendered via existing `ChatBox` — `react-markdown` doesn't execute scripts |
| Tool handler executes unexpected logic via prompt-injection | Tampering / Elevation | Handlers are pure functions calling `RecipePersistence` — no `eval`, no shell exec, no unbounded fetch. Worst case: agent reads/writes user's own IndexedDB (acceptable in single-user local context) |
| Quota / DoS via runaway tool calls | Denial of Service | LanguageModel context window is finite; tool-call concurrency is bounded by the model's `Promise.all` semantics. No mitigation needed at the demo DoD level |
| Resource leak on unmount | DoS (local) | `controller.abort()` deregisters tools; `session.destroy()` releases the LanguageModel session. Both must be in cleanup functions (mitigated by Pattern 1 + the AgentDrawer effect) |

**No new attack surface beyond Phase 1's threat model.** No network endpoints, no auth, no persisted secrets. Phase 1 SUMMARY noted "no new attack surface" and Phase 2 maintains that property.

---

## Sources

### Primary (HIGH confidence)
- W3C WebMCP draft spec — https://webmachinelearning.github.io/webmcp/ (registerTool IDL, AbortSignal-based unregistration, name format constraints, no enumeration API)
- W3C Prompt API repo — https://github.com/webmachinelearning/prompt-api (tools parameter shape, system prompt at position 0, error categories)
- Context7 prompt-api docs — `/webmachinelearning/prompt-api` (every `tools` example uses `prompt()`, not `promptStreaming()`)
- Chrome Built-in AI docs — https://developer.chrome.com/docs/ai/prompt-api (session lifecycle, AbortSignal cancellation, deprecated topK/temperature in web-page context)
- Repo-internal verified-by-grep:
  - `chat/src/app/types/webmcp.d.ts` — ambient WebMCP types (Phase 1)
  - `chat/src/app/types/dom-chromium-ai.d.ts` — `LanguageModelCreateOptions.tools` shape with `Promise<string>` execute return
  - `chat/src/app/components/ToolCallingPage.tsx:162-198, 232` — canonical pattern: `LanguageModel.create({tools, initialPrompts})` + `session.prompt()` (NOT `promptStreaming`)
  - `chat/src/app/components/ChatPage.tsx:67-83` — streaming reader-loop pattern (reusable if streaming is ever combined with tools later)
  - `chat/src/app/components/RecipeWorkbenchPage.tsx:60-80` — StrictMode-safe `cancelled` flag mount effect pattern
  - `chat/src/app/services/RecipePersistence.ts:3-15, 44-65` — `Recipe`/`Ingredient` types (quantity is `number`, not string) + CRUD signature
  - `chat/src/app/services/recipeSeed.ts:3-46` — seed data confirming all quantities are numeric
  - `chat/src/app/components/ChatInput.tsx:4` — `onSend` signature has 2 params (`message`, `action`)
  - `chat/src/app/components/ChatBox.tsx:29` — `h-96` hardcoded transcript height (FLAG-UI-03)

### Secondary (MEDIUM confidence — verified against primary)
- Model Context Tool Inspector — https://github.com/beaufortfrancois/model-context-tool-inspector (verified by official repo + Chrome Web Store listing)
- WebMCP Tools repo — https://github.com/GoogleChromeLabs/webmcp-tools (Chrome team's official tooling)
- Tutorial walkthrough — https://mcpcat.io/guides/test-webmcp-tools-model-context-inspector/ (matches official extension docs verbatim)

### Tertiary (LOW confidence — flagged)
- Cumulative-vs-delta streaming chunk semantics in promptStreaming — sourced from Sitepoint tutorial (Feb 2026) + corroborated by `ChatPage.tsx:76`'s `isCanary ? text + value : value` ternary in this repo. Not used in Phase 2 (non-streaming chosen) — flag is reduced.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed via Phase 1 SUMMARY + grep
- Architecture: HIGH — primary spec + working repo pattern (`ToolCallingPage`) + W3C IDL all aligned
- Tool catalog: HIGH — every tool's behavior derives from Phase 1 types (`Recipe`/`Ingredient` numeric quantity is verified)
- Streaming + tools (D-04): MEDIUM(-) — recommendation based on negative evidence (no spec example, existing repo code uses `prompt()`); could be retested on the exact target Canary build
- Tool Inspector flow: MEDIUM — multi-source (Chrome team repo + Chrome Web Store + tutorial); not personally re-verified by installing the extension this session
- Pitfalls: HIGH — most are documented spec behavior or grep-verified repo patterns

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 days for stable; revisit if Chrome 147 Canary changes the spec or if Chrome publishes streaming + tools docs)
