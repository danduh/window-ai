# Phase 2: WebMCP Tools + In-Page Agent — Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 10 (9 NEW, 1 MODIFY)
**Analogs found:** 9 / 10 (1 has no direct analog — toolAdapter; modelled after Pattern 2 in 02-RESEARCH.md)

> Note on path correction: Phase 2 spec calls the modified page `chat/src/app/components/RecipeWorkbench/RecipeWorkbenchPage.tsx`, but the actual file lives one level up at `chat/src/app/components/RecipeWorkbenchPage.tsx` (Phase 1 placement). The page imports its inner pieces from the `RecipeWorkbench/` subfolder; new Phase 2 components also belong inside `RecipeWorkbench/`. The page itself stays where it is.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `chat/src/app/services/recipeTools.ts` | service (typed registry) | data definition / pure | `chat/src/app/components/ToolCallingPage.tsx` (lines 40–160 — `availableTools` array literal) | role-match (registry; here a module export not an inline `useState`) |
| `chat/src/app/services/recipeToolHandlers.ts` | service (handler module) | request-response → IndexedDB CRUD | `ToolCallingPage.tsx` (lines 54–158 — `execute` callbacks); `RecipePersistence.ts` (CRUD calls) | exact for handler shape; exact for persistence calls |
| `chat/src/app/services/toolAdapter.ts` | service (pure transform) | transform / event-emit | (no direct analog — pattern from RESEARCH.md §Pattern 2) | no analog — see "No Analog Found" below |
| `chat/src/app/services/recipeStore.ts` | service (mini external store) | pub-sub | (no direct analog — closest is `RecipePersistence.ts`'s singleton-promise pattern) | partial — module-scoped state pattern only |
| `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` | component (page chunk + session owner) | request-response (LanguageModel) | `ToolCallingPage.tsx` (lines 162–208 — session create/destroy lifecycle); `ChatPage.tsx` (lines 87–124 — handleUserMessage) | exact for session lifecycle; role-match for drawer container |
| `chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx` | component (presentation) | render | `ToolCallingPage.tsx` (lines 369–417 — "Available Tools" panel); `IngredientsList.tsx` (whole file — list-of-rows pattern) | role-match (panel-of-rows) |
| `chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx` | component (presentation, system message bubble) | render (state-driven) | `ChatBox.tsx` (lines 41–60 — message bubble row); `MissingFlagBanner.tsx` (icon + text row) | role-match for bubble; role-match for icon-row |
| `chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx` | component (status pill) | render (state-driven) | `MissingFlagBanner.tsx` (yellow status surface); `RecipePicker.tsx` (lines 22–25 — bg/text token recipe per state) | role-match (status surface with state variants) |
| `chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx` | component (inline banner) | render | `MissingFlagBanner.tsx` (entire file — explicitly the design reference per UI-SPEC §5) | exact (clone with smaller padding + chat-specific copy) |
| `chat/src/app/components/RecipeWorkbenchPage.tsx` (MODIFY) | page | mount/unmount lifecycle + composition | self (lines 60–80 — `cancelled` mount-effect); `ToolCallingPage.tsx` (lines 200–208 — useEffect-with-controller analogy) | exact (mirror own existing mount-effect pattern) |

---

## Pattern Assignments

### `chat/src/app/services/recipeTools.ts` (service, registry)

**Analog:** `chat/src/app/components/ToolCallingPage.tsx`

**Tool literal shape pattern** (lines 40–72, the `getWeather` entry):
```tsx
{
  name: 'getWeather',
  description: 'Get the current weather for a location',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city to check for weather condition',
      },
    },
    required: ['location'],
  },
  async execute({ location }: { location: string }) {
    // ... handler body ...
    return JSON.stringify({ /* ... */ });
  },
  enabled: true,
},
```

**Differences for `recipeTools.ts`:**
- Drop the `enabled: boolean` field (no per-tool toggle in this phase — D-05/UI-SPEC).
- Add optional `annotations?: { readOnlyHint?: boolean }` per `webmcp.d.ts:43-46` for read-only tools.
- Type the array as `ModelContextTool[]` (ambient type from `chat/src/app/types/webmcp.d.ts` — DO NOT re-declare).
- Export as a top-level `const RECIPE_TOOLS: ModelContextTool[] = [ ... ]`, not as `useState` (single source of truth, no UI mutation in this phase).
- Each `execute` body delegates to a function from `recipeToolHandlers.ts` (do NOT inline the persistence calls — keep the registry purely declarative).
- All 8 entries use the JSON-Schema shape verbatim from RESEARCH.md §Tool Catalog (lines 360–602 of `02-RESEARCH.md`).

**Imports template** (mirror Phase 1 service style — `chat/src/app/services/recipeSeed.ts:1`):
```ts
import type { ModelContextTool } from /* ambient — no import path */;
// Ambient `ModelContextTool` is declared in chat/src/app/types/webmcp.d.ts.
// `tsconfig.app.json` `include: ["src/**/*.ts"]` picks it up automatically.
import {
  executeListRecipes,
  executeGetRecipe,
  executeSelectRecipe,
  executeScaleRecipe,
  executeSwapIngredient,
  executeAddIngredient,
  executeRemoveIngredient,
  executeGenerateShoppingList,
} from './recipeToolHandlers';
```

**Tool ordering rule (from RESEARCH.md line 606):** read-only first (`listRecipes`, `getRecipe`, `generateShoppingList`), then state-only (`selectRecipe`), then mutators (`scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`).

---

### `chat/src/app/services/recipeToolHandlers.ts` (service, handler module)

**Analog (handler shape):** `chat/src/app/components/ToolCallingPage.tsx` lines 54–70 (`getWeather.execute`)
**Analog (persistence calls):** `chat/src/app/services/RecipePersistence.ts` lines 44–75 (CRUD exports)

**Persistence imports pattern** (matches existing Phase 1 — `RecipeWorkbenchPage.tsx:5-10`):
```ts
import {
  getRecipes,
  getRecipe,
  saveRecipe,
  type Recipe,
  type Ingredient,
} from './RecipePersistence';
import {
  getActiveRecipeId,
  setActiveRecipeId,
  notifyRecipeStore,
} from './recipeStore';
```

**Handler signature pattern** (mirror `ToolCallingPage.tsx:54-70` shape, but exported as named functions):
```ts
export async function executeScaleRecipe(input: { servings: number; recipeId?: string }) {
  const { servings, recipeId } = input;
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
      quantity: Math.round(ing.quantity * factor * 100) / 100,
    })),
  };
  await saveRecipe(updated);
  notifyRecipeStore();
  return { id, oldServings: recipe.servings, newServings: servings, factor };
}
```

**Error throwing convention** (`ToolCallingPage.tsx:99-103` style — but throw, don't swallow; the adapter in `toolAdapter.ts` catches):
- Always `throw new Error('human-readable message')` — the adapter converts to `{error: "..."}` JSON for the model.
- Error message format: `No recipe with id "${id}"`, `No ingredient matching "${name}" in "${recipe.title}". Available: ${...}` (per RESEARCH.md §Tool Catalog).

**Handlers to author (exact bodies in RESEARCH.md lines 360–602):**
- `executeListRecipes` (read-only)
- `executeGetRecipe` (read-only)
- `executeGenerateShoppingList` (read-derived)
- `executeSelectRecipe` (state-only — calls `setActiveRecipeId` from `recipeStore.ts`; does NOT call `saveRecipe`)
- `executeScaleRecipe` (mutating — `saveRecipe` + `notifyRecipeStore`)
- `executeSwapIngredient` (mutating, case-insensitive substring matching — DEMO-CRITICAL)
- `executeAddIngredient` (mutating)
- `executeRemoveIngredient` (mutating)

**Pitfall guard (from RESEARCH.md Pitfall #5, line 662):** EVERY mutating handler MUST call `notifyRecipeStore()` immediately after `saveRecipe(updated)`. AGENT-03's two-tool demo phrase fails if either skips it.

---

### `chat/src/app/services/toolAdapter.ts` (service, pure transform — NO ANALOG)

**Why no analog:** No existing module wraps a tool array to convert types + emit lifecycle events. The closest precedent is `mockStreamService.ts` (in `chrome-llm-ts/src/lib/`, a pure transform helper), but its shape is different.

**Pattern to author (canonical excerpt from RESEARCH.md lines 251–290):**
```ts
import type { ModelContextTool } from /* ambient */;

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
    execute: async (input: Record<string, unknown>) => {
      onEvent({ kind: 'pending', toolName: t.name, args: input ?? {} });
      try {
        const result = await t.execute(input);
        onEvent({ kind: 'done', toolName: t.name });
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        onEvent({ kind: 'error', toolName: t.name, message });
        return JSON.stringify({ error: message });
      }
    },
  }));
}

/**
 * Same wrapping but for navigator.modelContext.registerTool — the WebMCP
 * surface accepts Promise<unknown> so we can keep the original return type.
 * The event emission is identical.
 */
export function wrapToolsWithEvents(
  tools: ModelContextTool[],
  onEvent: (e: ToolCallEvent) => void,
): ModelContextTool[] { /* mirror the map above without JSON.stringify */ }
```

**Type-strict idiom (CONVENTIONS.md §Error Handling):** `err instanceof Error ? err.message : 'Unknown error'` is the project-wide narrowing of `unknown` errors (used in `ChatPage.tsx:115`, `RecipeWorkbenchPage.tsx:70`, every Express route in `mcp-client/src/main.ts`). Reuse verbatim.

**No imports from React** — this module is pure TS, called from both the page mount-effect and the drawer's session creation.

---

### `chat/src/app/services/recipeStore.ts` (service, mini external store)

**Analog (singleton-promise pattern):** `chat/src/app/services/RecipePersistence.ts` lines 28–41 (`let dbPromise = null; ...`)
**Analog (subscribe/notify mental model):** React's `useSyncExternalStore` (no current usage in repo, but matches `EventEmitter` flavor of `mcp-client/src/services/paymentMCPClient.ts:39`).

**Module-scoped state pattern** (mirror `RecipePersistence.ts:28-41` for the singleton style):
```ts
type Listener = () => void;

const listeners = new Set<Listener>();
let activeRecipeId: string | null = null;

/** Subscribe to recipe-store change notifications. Returns an unsubscribe fn. */
export const subscribeRecipeStore = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Notify all listeners. Called by mutating tool handlers after saveRecipe. */
export const notifyRecipeStore = (): void => {
  listeners.forEach((l) => l());
};

/**
 * Set the active recipe id. Tool handlers default to this id when no recipeId
 * is passed by the agent. Setting also notifies subscribers so the page can
 * mirror the change into React state.
 */
export const setActiveRecipeId = (id: string | null): void => {
  activeRecipeId = id;
  notifyRecipeStore();
};

export const getActiveRecipeId = (): string | null => activeRecipeId;
```

**Naming convention (CONVENTIONS.md §File Naming):** `camelCase.ts` for non-class service modules — `recipeStore.ts` matches `recipeSeed.ts:1` style.

**JSDoc convention (CONVENTIONS.md §Common Idioms):** every exported function gets a one-line `/** ... */`. Mirror `RecipePersistence.ts:43-75` style.

**Test rule (RESEARCH.md anti-pattern):** No React imports. This module must be importable from non-React contexts (an external WebMCP agent invokes the wrapped handler too — see `wrapToolsWithEvents`).

---

### `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (component, session owner)

**Analog (session create/destroy):** `chat/src/app/components/ToolCallingPage.tsx` lines 162–208
**Analog (handleUserMessage):** `chat/src/app/components/ChatPage.tsx` lines 87–124
**Analog (drawer card geometry):** existing card pattern repeated across `IngredientsList.tsx:9`, `RecipeHeader.tsx:9`, `RecipePicker.tsx:11` — the `bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200` recipe.

**Imports pattern** (mirror `ChatPage.tsx:1-13` style):
```tsx
/// <reference path="../../types/dom-chromium-ai.d.ts" />

import React, { useEffect, useState, useRef } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import { ToolListPanel } from './ToolListPanel';
import { ToolCallIndicator } from './ToolCallIndicator';
import { LanguageModelUnavailable } from './LanguageModelUnavailable';
import { RECIPE_TOOLS } from '../../services/recipeTools';
import { toLanguageModelTools, type ToolCallEvent } from '../../services/toolAdapter';
```

**Session lifecycle pattern** (excerpt from `ToolCallingPage.tsx:162-208`, lines collapsed):
```tsx
const initializeSession = async () => {
  try {
    if (session) {
      session.destroy();
    }
    const newSession = await LanguageModel.create({
      initialPrompts: [
        {
          role: 'system',
          content: `You are a helpful assistant with access to various tools. ...`,
        },
      ],
      tools: enabledTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
      })),
    });
    setSession(newSession);
  } catch (error) {
    console.error('Failed to initialize session:', error);
    addMessage('Failed to initialize AI session. ...', 'System');
  }
};

useEffect(() => {
  initializeSession();
  return () => {
    if (session) {
      session.destroy();
    }
  };
}, [availableTools]);
```

**Apply with these adaptations** (per RESEARCH.md lines 748–802):
- Wrap creation in `if (!('LanguageModel' in globalThis)) return;` AND `availability !== 'available'` short-circuit → render `<LanguageModelUnavailable />`.
- Pass `tools: toLanguageModelTools(RECIPE_TOOLS, dispatchToolEvent)` (NOT a `.map(t => ({...}))` inline cast).
- Empty deps array `[]`, NOT `[availableTools]` — the tool registry is module-static; recreating is unnecessary and hits Pitfall #1.
- Use `const cancelled` flag pattern from `RecipeWorkbenchPage.tsx:60-80` because `LanguageModel.create` is async.
- System prompt content authored by planner (Claude's Discretion) — RESEARCH.md line 750 has a draft.

**handleUserMessage pattern** (mirror `ChatPage.tsx:87-124` and `ToolCallingPage.tsx:220-240`, but use `prompt()` not `promptStreaming()`):
```tsx
const handleUserMessage = async (text: string, _action: 'Prompt' | 'Translate') => {
  // Note ChatInput's onSend signature is (string, "Prompt" | "Translate") — see Pitfall 10
  if (!session) {
    addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
    return;
  }
  setIsLoading(true);
  addMessage(text, 'User');
  try {
    const response = await session.prompt(text); // NON-streaming per RESEARCH §Pitfall 6
    addMessage(response || "Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
  } catch (error) {
    console.error('Error getting AI response:', error);
    addMessage("Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
  } finally {
    setIsLoading(false);
  }
};
```

**addMessage pattern** (`ToolCallingPage.tsx:210-218` — the simple non-streaming form):
```tsx
const messageIdCounter = useRef<number>(0);
const addMessage = (text: string, sender = 'User') => {
  messageIdCounter.current += 1;
  setMessages((prev) => [...prev, { id: messageIdCounter.current, text, sender }]);
};
```

**Tool-event dispatch (NEW, no analog):** keep a `Map<toolName, ToolCallEvent>` in state via `useReducer` or `useState`. Inject `ToolCallIndicator` rows into the transcript inline between user/bot messages — per UI-SPEC §4. Strategy: store `events` separately from `messages` and merge for render, OR push synthetic system-bubble messages with `sender: 'ToolCall'` so `ChatBox` renders them in-line.

**Drawer card geometry (UI-SPEC §2):**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96">
  <div className="flex flex-col gap-3 h-full">
    <ToolListPanel toolCount={...} liveToolName={...} />
    <div className="flex-1 min-h-0 overflow-hidden [&>div:first-child]:h-full">
      <ChatBox messages={mergedMessages} />
    </div>
    {unavailable && <LanguageModelUnavailable />}
    <ChatInput onSend={handleUserMessage} disabled={isLoading || !session} />
  </div>
</div>
```

**FLAG-UI-01/02/03 resolution (planner picks):** UI-SPEC explicitly leaves how to override `ChatBox` empty-state copy and `ChatInput` placeholder to the planner. Recommend wrapping (not forking) — the wrapper div with `[&>div:first-child]:h-full` already overrides the height; a similar `[&_p]:hidden` + adjacent custom empty-state copy can replace the empty-state text without touching `ChatBox`.

---

### `chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx` (component, presentation)

**Analog (panel-of-rows shell):** `chat/src/app/components/ToolCallingPage.tsx` lines 369–417
**Analog (compact list row, no checkbox):** `chat/src/app/components/RecipeWorkbench/IngredientsList.tsx` (whole file)

**Container pattern** (excerpt from `ToolCallingPage.tsx:369-385`):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
    {/* SVG icon */}
    Available Tools
  </h3>
  <div className="space-y-3">
    {availableTools.map((tool) => (
      <div key={tool.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{tool.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tool.description}</p>
        </div>
      </div>
    ))}
  </div>
</div>
```

**Adapt to UI-SPEC §3 (compact, collapsible, no Test button, no checkbox):**
- Outer is a `bg-gray-50 dark:bg-gray-700 rounded-lg` (NOT the white card — the panel sits inside `AgentDrawer`'s card).
- Add a collapsed row with a `<button type="button" aria-expanded={isOpen} aria-controls="tool-list">` wrapper (UI-SPEC accessibility §3 toggle).
- `font-mono text-sm font-medium` for tool names (vs. `font-medium` plain in the analog) — matches UI-SPEC §3.
- Description: `text-sm text-gray-500 dark:text-gray-400` (slightly dimmer than the analog's `text-gray-600/400`).
- Live-active row highlight: when `liveToolName === tool.name`, add `bg-primary-50 dark:bg-primary-900/20`.
- Header copy: `Tools (8)` / `Tools (registering…)` / `Tools (0 — unavailable)` from UI-SPEC §3 live-state binding.

**Props shape:**
```ts
interface ToolListPanelProps {
  tools: ModelContextTool[]; // for names + descriptions
  registrationStatus: 'idle' | 'success' | 'partial' | 'error' | 'unavailable';
  registeredCount: number;
  liveToolName: string | null; // currently in-flight tool, or null
}
```

**Data source for tool descriptions:** read from `RECIPE_TOOLS` (the imported registry from `recipeTools.ts`). The component is purely presentational — no fetch, no IndexedDB.

---

### `chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx` (component, system bubble)

**Analog (bubble row geometry):** `chat/src/app/components/ChatBox.tsx` lines 41–60 (animate-slide-up + max-width row)
**Analog (icon + text row):** `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` lines 5–13 (flex-items-start + svg + body)

**Bubble row pattern** (`ChatBox.tsx:41-60`):
```tsx
<div
  key={message.id}
  className={`flex ${message.sender.toLowerCase() === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
  style={{ animationDelay: `${index * 0.1}s` }}
>
  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
    message.sender.toLowerCase() === 'user'
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  } break-words`}>
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Markdown>{message.text}</Markdown>
    </div>
  </div>
</div>
```

**Adapt to UI-SPEC §4 (full-width tool-call bubble, mono text, status glyph):**
- Outer: `<div role="status" aria-live="polite" aria-atomic="true" className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 my-2 animate-slide-up">` (FULL WIDTH — not `max-w-[80%]`).
- Glyph: `<span className="text-primary-600 dark:text-primary-400 animate-spin text-sm" aria-hidden="true">⚙</span>` for in-flight; `text-green-600 dark:text-green-400` `✓` for done; `text-red-600 dark:text-red-400` `✗` for error.
- Body: `text-sm font-mono text-gray-700 dark:text-gray-300` (in-flight) / `text-gray-600 dark:text-gray-400` (done) / `text-red-700 dark:text-red-300` (error).
- Args formatting (max 2 keys then `(…)`): `(servings: 6, recipeId: "buttermilk-pancakes")` → fits; if longer, `(…)`.
- Reduced-motion: rely on Tailwind's existing `motion-reduce:animate-none` is NOT auto — UI-SPEC §Accessibility says "replace `animate-spin` with a static glyph". Use `motion-reduce:animate-none` Tailwind v4 idiom.

**Props shape:**
```ts
interface ToolCallIndicatorProps {
  event: ToolCallEvent; // from toolAdapter.ts — discriminated union
}
```

**Render logic:** switch on `event.kind`. The component is stateless; the parent (`AgentDrawer`) supplies a single event per indicator instance — replacement is by re-render with a different event of the same toolName.

---

### `chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx` (component, status pill)

**Analog (status surface tokens):** `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` (yellow palette)
**Analog (per-state class branching):** `chat/src/app/components/RecipeWorkbench/RecipePicker.tsx` lines 22–25 (active/idle ternary)

**State-driven className pattern** (mirror `RecipePicker.tsx:22-25`):
```tsx
className={
  isActive
    ? 'w-full text-left px-4 py-3 rounded-lg bg-primary-600 text-white font-medium transition-colors duration-200'
    : 'w-full text-left px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200'
}
```

**Adapt to UI-SPEC §1 four-state pill:**
```tsx
const stateClasses = {
  idle:    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
  partial: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
  error:   'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
}[status];

return (
  <div role="status" aria-live="polite" className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium animate-fade-in ${stateClasses}`}>
    <span aria-hidden="true">{glyph}</span>
    <span>{copy}</span>
  </div>
);
```

**State → glyph + copy table (from UI-SPEC §1 + §Copywriting):**
| Status | Glyph | Copy |
|--------|-------|------|
| `idle` | spinner / `…` | `Registering tools…` |
| `success` | `✓` | `✓ 8 tools registered` |
| `partial` | `⚠` | `⚠ {n} of 8 tools registered` |
| `error` | `⚠` | `⚠ 0 tools registered` |
| `unavailable` | (hidden) | (return null) |

**Props shape:**
```ts
interface ToolRegistrationPillProps {
  status: 'idle' | 'success' | 'partial' | 'error' | 'unavailable';
  registeredCount: number; // 0..8
  totalCount: number; // always 8 for v1
}
```

**Placement (per UI-SPEC §Pill Placement):** insert as one new flex child immediately BEFORE `<ThemeToggle />` inside `RecipeWorkbenchPage.tsx`'s `<div className="flex items-center space-x-3">`. The header currently has only `<ThemeToggle />` in that cluster (`RecipeWorkbenchPage.tsx:132`) — the cluster needs to be promoted from a single-child to a wrapping `<div className="flex items-center space-x-3">` if not already.

---

### `chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx` (component, inline banner)

**Analog:** `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` (entire file — explicitly the design reference)

**Source pattern** (full file `MissingFlagBanner.tsx:1-32`):
```tsx
import React from 'react';

export const MissingFlagBanner: React.FC = () => (
  <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" role="status">
    <div className="flex items-start">
      <svg
        className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div>
        <p className="text-yellow-800 dark:text-yellow-200 font-medium">WebMCP isn&apos;t enabled in this browser.</p>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
          The recipe browser still works. To register tools and run the agent demo, open this page in Chrome 146+ Canary with the WebMCP flag enabled.
        </p>
        {/* flag table omitted for the unavailable component — UI-SPEC §5 */}
      </div>
    </div>
  </div>
);
```

**Diffs to apply** (per UI-SPEC §5 — "smaller padding, chat-specific copy, NO flag table"):
- Outer: `mb-6 p-4` → `p-3` (drop `mb-6` because the parent flexbox controls spacing; smaller padding per UI-SPEC).
- Heading: `WebMCP isn't enabled in this browser.` → `Chrome built-in AI isn't available.`
- Body: → `The recipe tools are still registered (try the Tool Inspector). To run the in-page agent, enable Chrome built-in AI in Chrome 146+ Canary.`
- Drop the flag-table div entirely (`MissingFlagBanner.tsx:19-28`) — the page-level banner already shows them; this is a contextual explainer.
- Same SVG icon (lines 6–13 verbatim).
- Same yellow tokens (lines 4, 15–16 unchanged).
- Keep `role="status"`.

**Export pattern** (named export, mirroring `MissingFlagBanner` — `MissingFlagBanner.tsx:3`):
```tsx
export const LanguageModelUnavailable: React.FC = () => ( ... );
```

---

### `chat/src/app/components/RecipeWorkbenchPage.tsx` (MODIFY)

**Analog:** itself — mirror its own existing mount-effect pattern (lines 60–80) but use `AbortController` instead of a boolean flag, per RESEARCH.md §Pattern 1.

**Self-reference: existing mount-effect pattern** (`RecipeWorkbenchPage.tsx:60-80` — the load-recipes effect):
```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      await seedIfEmpty(SEED_RECIPES);
      const all = await getRecipes();
      if (cancelled) return;
      setRecipes(all);
      setActiveId(all[0]?.id ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[RecipeWorkbench] Failed to load recipes:', message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);
```

**Modifications to add (per RESEARCH.md lines 716–743 + 824–840):**

1. **Tool-registration effect (NEW):**
```tsx
useEffect(() => {
  if (!navigator.modelContext) return;
  const controller = new AbortController();
  const wrapped = wrapToolsWithEvents(RECIPE_TOOLS, dispatchToolEvent);
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

2. **Recipe-store subscription effect (NEW):**
```tsx
useEffect(() => {
  const unsub = subscribeRecipeStore(() => {
    getRecipes().then(setRecipes);
  });
  return unsub;
}, []);
```

3. **Mirror activeId into the store on every selection change:**
```tsx
const handleSelect = (id: string) => {
  setActiveId(id);
  setActiveRecipeId(id); // mirrors page state into the module-scoped ref
};
// pass handleSelect (not setActiveId) into <WorkbenchPanel onSelect={...}/>
```

4. **Header pill placement** — change the existing `<ThemeToggle />` cluster from a single child to a wrapping flex:

**Current (line 132):**
```tsx
<ThemeToggle />
```

**Replace with:**
```tsx
<div className="flex items-center space-x-3">
  <ToolRegistrationPill status={registration.status} registeredCount={registration.count} totalCount={RECIPE_TOOLS.length} />
  <ThemeToggle />
</div>
```

5. **Mount `<AgentDrawer/>`** below `<WorkbenchPanel/>` inside the `workbench` tab content (lines 100–112). The Tabs structure already passes JSX content per tab; insert the drawer in the workbench tab's content alongside the existing `<WorkbenchPanel ... />`.

**Brownfield discipline (CLAUDE.md):** Do NOT alter the existing seed/load effect, the Tabs ordering, the docs tab content, or the `MissingFlagBanner` placement. Add new effects ABOVE/BELOW the existing one, not inside it.

**Imports added:**
```tsx
import { RECIPE_TOOLS } from '../services/recipeTools';
import { wrapToolsWithEvents, type ToolCallEvent } from '../services/toolAdapter';
import { subscribeRecipeStore, setActiveRecipeId } from '../services/recipeStore';
import { ToolRegistrationPill } from './RecipeWorkbench/ToolRegistrationPill';
import { AgentDrawer } from './RecipeWorkbench/AgentDrawer';
```

---

## Shared Patterns

### Pattern A: Mount-effect with cancellation flag (StrictMode-safe)

**Source:** `chat/src/app/components/RecipeWorkbenchPage.tsx` lines 60–80
**Apply to:** `RecipeWorkbenchPage.tsx` (new tool-registration + recipe-store-subscription effects), `AgentDrawer.tsx` (session creation effect)

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      // ... await something ...
      if (cancelled) return;
      // ... commit to React state ...
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Component] Failed:', message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => {
    cancelled = true;
  };
}, []);
```

For the tool-registration effect specifically, swap the `cancelled` flag for an `AbortController` (RESEARCH.md §Pitfall 2 — use `new AbortController()` INSIDE the effect, never hoist).

### Pattern B: Project-wide error narrowing idiom

**Source:** `chat/src/app/components/ChatPage.tsx:115`, `chat/src/app/components/RecipeWorkbenchPage.tsx:70`, every Express handler in `mcp-client/src/main.ts`
**Apply to:** `recipeToolHandlers.ts`, `toolAdapter.ts`, `AgentDrawer.tsx`, `RecipeWorkbenchPage.tsx` (new effects)

```ts
err instanceof Error ? err.message : 'Unknown error'
```

This is the canonical way to narrow `unknown` from a `catch (err)` block in this repo. Do NOT use `(err as Error).message` — it bypasses strict-mode safety.

### Pattern C: Card surface tokens

**Source:** repeated across `IngredientsList.tsx:9`, `RecipeHeader.tsx:9`, `RecipePicker.tsx:11`, `MissingFlagBanner.tsx:4` (with yellow palette), `ChatBox.tsx:29`, `ChatInput.tsx:26`, `ToolCallingPage.tsx:369`
**Apply to:** `AgentDrawer.tsx` (the drawer outer card), `ToolListPanel.tsx` (interior `bg-gray-50` panel — NOT a white card), `LanguageModelUnavailable.tsx` (yellow variant), `ToolRegistrationPill.tsx` (rounded-full variant)

**Standard white card:**
```tsx
className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200"
```

**Interior gray panel** (for nested groupings inside a card — `ToolCallingPage.tsx:390`):
```tsx
className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
```

**Yellow status banner** (`MissingFlagBanner.tsx:4`):
```tsx
className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
```

### Pattern D: Dark-mode className pairing rule

**Source:** CONVENTIONS.md (TS strict + dark-mode pairing) + UI-SPEC §Dark Mode Token Map
**Apply to:** every new file with visible classes

Every `bg-`, `text-`, `border-` utility MUST be paired with a `dark:` counterpart in the same `className` string, OR be a dark-mode-neutral utility (`bg-transparent`, `text-current`, etc.). Verifier (gsd-ui-checker) will grep for unpaired tokens.

UI-SPEC §Dark Mode Token Map (lines 290–315) enumerates the required pairs for Phase 2. Use those token pairs verbatim — don't invent new ones.

### Pattern E: Functional component + named export inside RecipeWorkbench/

**Source:** every file under `chat/src/app/components/RecipeWorkbench/` (Phase 1) — `MissingFlagBanner.tsx:3`, `RecipePicker.tsx:10`, `RecipeHeader.tsx:8`, `IngredientsList.tsx:8`, `StepsList.tsx`
**Apply to:** all 5 new components in `chat/src/app/components/RecipeWorkbench/`

```tsx
import React from 'react';
import type { /* ... */ } from '../../services/RecipePersistence'; // when needed

interface ComponentNameProps { /* ... */ }

export const ComponentName: React.FC<ComponentNameProps> = ({ /* ... */ }) => (
  <div className="...">
    {/* ... */}
  </div>
);
```

**Note:** Phase 1 used `export const` (named) for all RecipeWorkbench/* components. Pages at the parent components/ level use `export default` (`ChatPage.tsx:310`, `ToolCallingPage.tsx:496`, `RecipeWorkbenchPage.tsx:143`). New components inside RecipeWorkbench/ use NAMED exports to match Phase 1 convention.

**Exception:** `AgentDrawer.tsx` may use named export too (matches the rest of RecipeWorkbench/), even though it owns hooks — Phase 1's pattern is "named export for RecipeWorkbench/* regardless of complexity".

### Pattern F: No re-declaration of ambient types

**Source:** CONTEXT.md (locked decision) + `webmcp.d.ts` ends with `export {}`
**Apply to:** every new file that touches `ModelContextTool`, `ModelContext`, `LanguageModel`, `LanguageModelCreateOptions`

```ts
// Use the types as if globally available; do NOT add:
// declare global { interface ModelContextTool { ... } }
// declare global { abstract class LanguageModel { ... } }

import type { ModelContextTool } from /* there is no path — they are ambient */;
// Just use the type. tsconfig.app.json `include: ["src/**/*.ts"]` picks up
// chat/src/app/types/webmcp.d.ts and chat/src/app/types/dom-chromium-ai.d.ts
// automatically.
```

For `LanguageModel`, the canonical reference path comment from `ChatPage.tsx:1` is:
```tsx
/// <reference path="../types/dom-chromium-ai.d.ts" />
```
Use this in `AgentDrawer.tsx` (path: `'../../types/dom-chromium-ai.d.ts'`).

---

## No Analog Found

| File | Role | Data Flow | Reason | Falls Back To |
|------|------|-----------|--------|---------------|
| `chat/src/app/services/toolAdapter.ts` | service (pure transform with event emission) | transform / event-emit | No existing module wraps a tool array to convert types AND emit lifecycle events. The closest precedent (`mockStreamService.ts` in `chrome-llm-ts/`) is a different shape. | RESEARCH.md §Pattern 2 (lines 251–290) — concrete code excerpt the planner can copy verbatim. |
| `chat/src/app/services/recipeStore.ts` | service (mini external store) | pub-sub | No `useSyncExternalStore`-shaped module exists in the repo. `EventEmitter` exists in `mcp-client/src/services/paymentMCPClient.ts:39` but is a different pattern (event types, not change notifications) and lives in an out-of-scope workspace. | RESEARCH.md §Pattern 3 + §Code Examples (lines 300–315, 808–823) — concrete code excerpt; `RecipePersistence.ts:28-41` for the singleton-promise module-scoped state shape. |

---

## Cross-File Dependencies (planner sequencing hint)

This dependency graph informs the planner's phase split:

```
recipeStore.ts          (no deps; pure)
  ↑
recipeToolHandlers.ts   (depends on recipeStore + RecipePersistence)
  ↑
recipeTools.ts          (depends on recipeToolHandlers; declares the registry)
  ↑
toolAdapter.ts          (depends on recipeTools — actually only on the ModelContextTool type)
  ↑
ToolListPanel.tsx       (depends on recipeTools for the rows)
ToolCallIndicator.tsx   (depends on toolAdapter for the ToolCallEvent type)
ToolRegistrationPill.tsx (no service deps; pure presentation + state prop)
LanguageModelUnavailable.tsx (no deps)
  ↑
AgentDrawer.tsx         (depends on all 4 above + recipeTools + toolAdapter)
  ↑
RecipeWorkbenchPage.tsx (depends on AgentDrawer + ToolRegistrationPill + recipeTools + toolAdapter + recipeStore)
```

Suggested split (CLAUDE.md says "1–3 plans per phase, coarse"):
- **Plan 1 (data + tools):** `recipeStore.ts` → `recipeToolHandlers.ts` → `recipeTools.ts` → `toolAdapter.ts`. Pure-TS layer; no React. Ends with all 8 tools defined and adapted.
- **Plan 2 (UI components):** all 5 RecipeWorkbench/* components in parallel. None depend on each other except by type.
- **Plan 3 (page wiring):** modify `RecipeWorkbenchPage.tsx` to register tools, mount drawer + pill, subscribe to store. End-to-end demo verified.

---

## Metadata

**Analog search scope:** `chat/src/app/components/`, `chat/src/app/components/RecipeWorkbench/`, `chat/src/app/services/`, `chat/src/app/types/`
**Files scanned (full read):** 13 — `ToolCallingPage.tsx`, `ChatPage.tsx`, `ChatBox.tsx`, `ChatInput.tsx`, `MissingFlagBanner.tsx`, `RecipeWorkbenchPage.tsx`, `RecipePicker.tsx`, `RecipeHeader.tsx`, `IngredientsList.tsx`, `RecipePersistence.ts`, `recipeSeed.ts`, `webmcp.d.ts`, `dom-chromium-ai.d.ts`. Plus `ChatAIService.ts`, `ThemeToggle.tsx` (header context).
**Pattern extraction date:** 2026-04-27
**Phase:** 02-webmcp-tools-in-page-agent
