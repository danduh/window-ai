// GEN_UI_TOOLS stub array + registerGenUITools() lifecycle helper.
//
// Source: 05-CONTEXT.md (Tool registration for round-trip section),
// 05-RESEARCH.md (Pattern 1 navigator.modelContext.registerTool, Pattern 7 wrapToolsWithEvents,
// Pattern 10 commitRecipeToPlan tool definition, Pitfall 1 StrictMode double-mount).
//
// Mirrors RecipeWorkbenchPage.tsx:164-228 registration pattern but as an exported helper
// function (not embedded in a component) so GenerativeUIPage.tsx can call it from a useEffect.
//
// IMPORTANT: module-scope guard uses `previousGenUIRegistrationController` — a DIFFERENT name
// from RecipeWorkbenchPage.tsx's `previousRegistrationController`. This prevents cross-page
// contamination when /webmcp and /generative-ui are open simultaneously.

import * as MealPlanStore from './MealPlanStore';
import { wrapToolsWithEvents, type ToolCallEvent } from './toolAdapter';

// ── Module-scope state (persists across React StrictMode remounts) ─────────────
// Pitfall 1: use module-scope ref so StrictMode double-mount abort reaches the same variable.
// Different name from RecipeWorkbenchPage.tsx's guard to prevent cross-page collision.

let previousGenUIRegistrationController: AbortController | null = null;

// 05-RESEARCH.md Pattern 1: swallow duplicate-tool-name errors on StrictMode second mount.
const DUPLICATE_NAME_PATTERN = /duplicate tool name|already registered/i;

// ── GEN_UI_TOOLS ──────────────────────────────────────────────────────────────

/**
 * Stub tool array for the /generative-ui page.
 *
 * Contains exactly one entry (commitRecipeToPlan).
 * No visibility:["app"] annotation — that is Phase 6 GENUI-05.
 * No searchRecipes tool — that is Phase 6 GENUI-04.
 *
 * Source: 05-RESEARCH.md Pattern 10 commitRecipeToPlan tool definition.
 */
export const GEN_UI_TOOLS: ModelContextTool[] = [
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
      return { content: [{ type: 'text', text: 'Added to plan' }] };
    },
  },
];

// ── registerGenUITools ────────────────────────────────────────────────────────

/**
 * Register GEN_UI_TOOLS with navigator.modelContext.
 *
 * Mirrors RecipeWorkbenchPage.tsx:164-228 exactly, with its OWN module-scope
 * guard (`previousGenUIRegistrationController`) to prevent cross-page collision.
 *
 * Returns:
 * - The new AbortController on success. Caller aborts on unmount:
 *   `const ctrl = registerGenUITools(); return () => ctrl?.abort();`
 * - null if navigator.modelContext is unavailable (browser without WebMCP flag).
 *
 * Source: 05-RESEARCH.md Pattern 1 navigator.modelContext.registerTool invocation.
 */
export function registerGenUITools(): AbortController | null {
  // Guard: navigator.modelContext may not exist (no WebMCP flag in Chrome)
  if (typeof navigator === 'undefined' || !navigator.modelContext) {
    console.warn('[GenUI] navigator.modelContext unavailable; tool registration skipped');
    return null;
  }

  // (1) Defensive abort of any prior controller from a previous mount cycle
  // (StrictMode / HMR) that the cleanup hasn't fully reconciled yet.
  if (previousGenUIRegistrationController && !previousGenUIRegistrationController.signal.aborted) {
    previousGenUIRegistrationController.abort();
  }

  // (2) Create new controller and assign to module-scope guard
  const controller = new AbortController();
  previousGenUIRegistrationController = controller;

  // (3) Wrap tools with event dispatcher for console debug logging
  const onToolEvent = (e: ToolCallEvent): void => {
    console.debug('[mcp-apps:genUI-tool]', e.kind, e.toolName);
  };
  const wrapped = wrapToolsWithEvents(GEN_UI_TOOLS, onToolEvent);

  // (4) Register each tool; swallow DUPLICATE_NAME_PATTERN per Pitfall 1
  for (const tool of wrapped) {
    try {
      navigator.modelContext.registerTool(tool, { signal: controller.signal });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (DUPLICATE_NAME_PATTERN.test(message)) {
        // StrictMode residual — treat as success (same handler shape is already registered)
        continue;
      }
      console.error('[GenUI] Tool registration failed:', message);
      break;
    }
  }

  return controller;
}
