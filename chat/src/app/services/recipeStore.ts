// Module-scoped pub-sub + active-recipe-id ref. Pure TS — no React.
// Mirrors the singleton-promise module-state pattern in RecipePersistence.ts:28-41.
// Tool handlers default to `getActiveRecipeId()` when no recipeId is passed by
// the agent. Mutating handlers call `notifyRecipeStore()` after `saveRecipe`.

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
 * is passed. Setting also notifies subscribers so the page can mirror the
 * change into React state.
 */
export const setActiveRecipeId = (id: string | null): void => {
  activeRecipeId = id;
  notifyRecipeStore();
};

/** Read the active recipe id (or null if no recipe selected yet). */
export const getActiveRecipeId = (): string | null => activeRecipeId;
