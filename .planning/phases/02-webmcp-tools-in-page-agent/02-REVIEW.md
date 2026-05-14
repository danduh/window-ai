---
phase: 02-webmcp-tools-in-page-agent
reviewed: 2026-04-27T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - chat/src/app/services/recipeStore.ts
  - chat/src/app/services/recipeToolHandlers.ts
  - chat/src/app/services/recipeTools.ts
  - chat/src/app/services/toolAdapter.ts
  - chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx
  - chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx
  - chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx
  - chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
  - chat/src/app/components/RecipeWorkbenchPage.tsx
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-27
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 02 introduces WebMCP tool registration and an in-page LanguageModel chat agent over the existing Recipe Workbench. Overall the code is clean, well-commented, follows the existing brownfield conventions (cancelled-flag pattern, single-AbortController-per-mount, module-scoped pub-sub), and runtime invariants at the LanguageModel ↔ tool-handler boundary are guarded with explicit `typeof` checks in most handlers.

No Critical (security / data-loss / crash) issues were found. The most material concerns are concurrency-related: the system prompt explicitly encourages the model to run tools "concurrently", but the mutating tool handlers do unsynchronized read-modify-write against IndexedDB and the `liveToolName` state lifecycle is not safe for overlapping tool calls. Several smaller issues — unbounded `toolEvents` map, missing `AbortController` for in-flight `session.prompt`, an unvalidated `id` field in `executeSelectRecipe`, and dead/duplicate state in the drawer — are flagged below with concrete fixes.

## Warnings

### WR-01: Mutating tool handlers race when invoked concurrently

**File:** `chat/src/app/services/recipeToolHandlers.ts:55-167`
**Issue:** `executeScaleRecipe`, `executeSwapIngredient`, `executeAddIngredient`, and `executeRemoveIngredient` all do an unsynchronized read-modify-write: `await getRecipe(id)` → mutate snapshot → `await saveRecipe(updated)`. The system prompt in `AgentDrawer.tsx:13` actively encourages the LanguageModel to issue multiple tool calls in parallel ("they can run concurrently"). When two mutators on the same recipe interleave, the second `saveRecipe` clobbers the first because both read the same pre-mutation snapshot. The IndexedDB `put` call in `RecipePersistence.saveRecipe` is its own readwrite tx, but it does not guard the read that happened earlier in the handler.

Concrete failure: user says "scale to 6 and add salt"; both handlers `getRecipe` the 4-serving snapshot, scale-handler writes the 6-serving recipe (no salt), add-handler writes the 4-serving recipe (with salt). The salt addition wins; the scaling is silently lost.

**Fix:** Either (a) serialize all mutators through a single in-memory queue, or (b) wrap each handler's read+write in a single IDB readwrite transaction. Minimal-diff option (b) for `executeScaleRecipe` (apply the same shape to the other three mutators):

```ts
// recipeToolHandlers.ts (and a new helper in RecipePersistence.ts)
export const updateRecipe = async (
  id: string,
  mutator: (current: Recipe) => Recipe,
): Promise<Recipe> => {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const current = await tx.store.get(id);
  if (!current) {
    await tx.done;
    throw new Error(`No recipe with id "${id}"`);
  }
  const next = mutator(current);
  await tx.store.put(next);
  await tx.done;
  return next;
};

// then in executeScaleRecipe etc.
const updated = await updateRecipe(id, (recipe) => ({
  ...recipe,
  servings,
  ingredients: recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: roundToTwo(ing.quantity * (servings / recipe.servings)),
  })),
}));
notifyRecipeStore();
```

If you choose to keep the current shape for the 2-min demo, soften the system prompt to discourage parallel mutators on the same recipe (e.g. "Call read-only tools concurrently but issue mutators one at a time").

### WR-02: `liveToolName` clobbered by overlapping tool calls

**File:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx:90-100`, `chat/src/app/components/RecipeWorkbenchPage.tsx:109-115`
**Issue:** Both `onToolEvent` handlers track at most one in-flight tool name. When tool A and tool B fire concurrently, the sequence `A:pending → B:pending → A:done → B:done` produces:

1. A:pending → live = "A"
2. B:pending → live = "B"
3. A:done → live = null (wrong — B is still in flight)
4. B:done → live = null

The pill / list-row highlight goes dark while B is still executing. Same bug exists on the page side (drives the `ToolListPanel` row highlight) and the drawer side (local fallback). Concurrent tool calls are explicitly encouraged by the system prompt (see WR-01).

**Fix:** Track a multiset of in-flight tool names and clear only when the count drops to zero. Example for the page-level handler:

```ts
const inFlight = useRef<Map<string, number>>(new Map());
const onToolEvent = (e: ToolCallEvent): void => {
  const m = inFlight.current;
  if (e.kind === 'pending') {
    m.set(e.toolName, (m.get(e.toolName) ?? 0) + 1);
    setLiveToolName(e.toolName);
  } else {
    const next = (m.get(e.toolName) ?? 1) - 1;
    if (next <= 0) m.delete(e.toolName); else m.set(e.toolName, next);
    // Pick any still-in-flight name, or null if none left.
    const remaining = m.keys().next().value ?? null;
    setLiveToolName(remaining);
  }
};
```

Apply the same shape in `AgentDrawer.onToolEvent`.

### WR-03: In-flight `session.prompt` not aborted on unmount; tool events fire on unmounted component

**File:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx:104-141, 145-172`
**Issue:** The mount effect's cleanup destroys the session, but `handleUserMessage` calls `await session.prompt(text)` with no `signal`. If the user navigates away while a prompt is in flight:

1. `session.destroy()` runs.
2. The pending `prompt` may still resolve or reject — `addMessage(...)` then calls `setMessages` on an unmounted component (React warns; harmless leak).
3. More importantly, the tool wrappers in `toolAdapter.toLanguageModelTools` may still execute and dispatch `pending`/`done` events that call `setLocalLiveToolName`, `dispatchToolEvent`, and `onLiveToolNameChange?.(...)` — all of which target unmounted state.

There is no per-prompt `AbortController`, no `cancelled` ref consulted by `handleUserMessage` or by the wrapped `execute` functions, and no in-flight-tracking of the prompt promise.

**Fix:** Add an `AbortController` per prompt and a mounted-ref guard. Pass the signal through `prompt(text, { signal })` (the typedef at `dom-chromium-ai.d.ts:41` already supports it):

```tsx
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

const promptControllerRef = useRef<AbortController | null>(null);

const handleUserMessage = async (text: string): Promise<void> => {
  // ... existing guards ...
  const controller = new AbortController();
  promptControllerRef.current = controller;
  setIsLoading(true);
  addMessage(text, 'User');
  try {
    const response = await session.prompt(text, { signal: controller.signal });
    if (!mountedRef.current) return;
    addMessage(response || "Sorry, …", 'Bot');
  } catch (err) {
    if (!mountedRef.current || controller.signal.aborted) return;
    // ... existing error handling ...
  } finally {
    if (mountedRef.current) setIsLoading(false);
  }
};

// In the session-creation effect cleanup:
return () => {
  cancelled = true;
  promptControllerRef.current?.abort();
  createdSession?.destroy();
};
```

Also gate the `onToolEvent` body with `if (!mountedRef.current) return;` so leaked tool callbacks become no-ops.

### WR-04: `toolEvents` map grows unbounded; no reset between user turns

**File:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx:45-53, 77, 90-100, 178-180`
**Issue:** Every `pending`/`done`/`error` event creates a new entry keyed by an ever-incrementing `eventIdCounter`. The `toolEventsReducer` only supports `add` and `reset`, but `reset` is never dispatched anywhere in the codebase. After a few minutes of demo use the indicator log grows to dozens of rows — both a UX problem (the transcript becomes mostly indicators) and a small but real memory leak for a long-lived session.

A single tool call also produces two persistent rows (`pending` + `done`) because `pending` is never replaced by the matching `done`. UI-SPEC §4 implies the indicator should reflect the call lifecycle, not log every transition.

**Fix:** Either coalesce by tool-call (use a `callId` so `pending`/`done`/`error` for the same call replace each other) or dispatch `{ type: 'reset' }` at the start of each user message:

```tsx
// Simplest: clear at the start of each user turn.
const handleUserMessage = async (text: string, _action) => {
  // ...
  dispatchToolEvent({ type: 'reset' });
  // ...
};
```

For the coalescing approach, generate a `callId` in `toLanguageModelTools` / `wrapToolsWithEvents` (a closure-scoped counter inside the `execute` wrapper) and key the reducer Map by `callId` instead of a fresh id per event.

### WR-05: `executeSelectRecipe` does not validate `id` type

**File:** `chat/src/app/services/recipeToolHandlers.ts:42-48`
**Issue:** All other handlers that take an `id`/string field guard with `typeof id !== 'string' || id.length === 0` (see lines 30, 91-92, 129, 131, 151). `executeSelectRecipe` skips that check and passes whatever the model produced straight to `getRecipe(id)`. If the model emits `id: 123` or `id: null` (non-zero hallucination probability for tool-calling LMs), `idb.get` rejects with a low-level IDB error rather than the friendly "id must be a non-empty string" message the wrapper would surface to the model. The trust-boundary contract from `toolAdapter.ts:55` is `Record<string, unknown>` — handlers must validate.

**Fix:**

```ts
export async function executeSelectRecipe(input: { id: string }) {
  const { id } = input;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('id must be a non-empty string');
  }
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  setActiveRecipeId(id);
  return { activeId: id, title: recipe.title };
}
```

## Info

### IN-01: `localLiveToolName` is effectively dead state

**File:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx:82, 94, 97, 186`
**Issue:** When `RecipeWorkbenchPage` is the host, it always passes `liveToolName` (see `RecipeWorkbenchPage.tsx:194`). `effectiveLiveToolName = incomingLiveToolName ?? localLiveToolName` therefore always uses `incomingLiveToolName`, and `localLiveToolName` is only ever used when the drawer is rendered standalone (which the codebase never does). The drawer-side state and setter calls add coupling without runtime effect.
**Fix:** Either drop `localLiveToolName` and require host-driven `liveToolName`, or keep the comment but add a `// dead in current host wiring; kept for standalone use` note. If the standalone use case is real, document it; if not, remove the dead path.

### IN-02: `ModelContext.provideContext` typed but unused; consider removing or implementing

**File:** `chat/src/app/types/webmcp.d.ts:21`
**Issue:** `provideContext(context: object): void` is declared in the ambient `ModelContext` interface but never called by any source file in this phase. If Phase 02 doesn't use it, the type declaration is fine to keep (it mirrors the spec), but a comment noting "intentionally not implemented in v1" would prevent confusion in future work.
**Fix:** Add a one-line comment above the method, or strip it from the declaration if v1 will never call it.

### IN-03: `notifyRecipeStore` does not isolate listener exceptions

**File:** `chat/src/app/services/recipeStore.ts:20-22`
**Issue:** `listeners.forEach((l) => l())` runs synchronously; a throwing listener stops subsequent listeners from firing. Today there is only one subscriber (the page), so this is benign, but adding a second subscriber (e.g. a future MCP client mirror) would silently lose updates if the first throws.
**Fix:**

```ts
export const notifyRecipeStore = (): void => {
  listeners.forEach((l) => {
    try { l(); } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[recipeStore] listener threw:', err);
    }
  });
};
```

### IN-04: `MissingFlagBanner` SSR-unsafe (low risk in current build)

**File:** `chat/src/app/components/RecipeWorkbenchPage.tsx:229`
**Issue:** `{!navigator.modelContext && <MissingFlagBanner />}` references `navigator` at module scope. The `chat/` workspace is a CSR-only Vite SPA so this never executes server-side, but if the workspace is ever pre-rendered (e.g. for static-site SEO) this throws `ReferenceError: navigator is not defined`. The same file already uses the safe pattern at line 100 (`typeof navigator === 'undefined' || !navigator.modelContext`).
**Fix:** Match the safe pattern for consistency:

```tsx
{typeof navigator !== 'undefined' && !navigator.modelContext && <MissingFlagBanner />}
```

### IN-05: Ambient `LanguageModelCreateOptions['tools'][].execute` widens to `(...args: any[])`

**File:** `chat/src/app/types/dom-chromium-ai.d.ts:22-27`
**Issue:** `execute: (...args: any[]) => Promise<string>` defeats CLAUDE.md's "no `any` at API boundaries" rule. The `toolAdapter.toLanguageModelTools` wrapper already pins the shape correctly to `(input: Record<string, unknown>) => Promise<string>`; the ambient type could mirror that without breaking other callers.
**Fix:** Tighten the ambient declaration:

```ts
tools?: Array<{
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: Record<string, unknown>) => Promise<string>;
}>;
```

This is technically out of phase scope (the file pre-exists), but Phase 02 is the first consumer of the typed tools field, so it's worth tightening here.

### IN-06: `executeListRecipes` signature mismatch with `ModelContextTool.execute` is silently widened

**File:** `chat/src/app/services/recipeTools.ts:28`
**Issue:** `execute: executeListRecipes` assigns a `() => Promise<...>` to a slot whose ambient type expects `(input: any, client?: ModelContextClient) => Promise<unknown>` (see `webmcp.d.ts:38`). TypeScript permits this (parameter list is contravariantly narrower), but if the spec ever requires reading `client` (e.g. for `requestUserInteraction`), this signature gives no compile-time signal. Same applies to `executeGenerateShoppingList` which uses a default arg.
**Fix:** No code change required; consider adding `_input?: Record<string, unknown>` to handler signatures if you want to flag that the tool intentionally ignores its input. Lowest priority.

---

_Reviewed: 2026-04-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
