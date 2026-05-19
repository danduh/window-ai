/**
 * recipeCarouselRegistry — module-scope Map<token, Recipe[]> for carousel data.
 *
 * NAMING CONVENTION: Always import this module with the namespace form:
 *
 *   import * as recipeCarouselRegistry from './recipeCarouselRegistry';
 *
 * Never use named imports ({ getRecipes }) from this module. Both this file and
 * RecipePersistence.ts export a function called `getRecipes`; a named import
 * would create a collision at the import site. The namespace form avoids
 * ambiguity (RESEARCH Pitfall 5).
 *
 * Source: 06-CONTEXT.md §Module / file layout, 06-RESEARCH.md Finding 10.
 * Phase 6 GENUI-04: token TTL is page-session only (beforeunload clear). No
 * LRU/timer is implemented — sufficient for a 90-second demo single-page session.
 */

import type { Recipe } from './RecipePersistence';

// ── Module-scope registry ─────────────────────────────────────────────────────

const registry = new Map<string, Recipe[]>();

// Clear the registry on page navigation so tokens from prior searches do not
// persist across hard reloads or SPA navigations that unload the page.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => registry.clear());
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store a set of recipes under the given UUID token.
 * Called by the `searchRecipes` tool handler immediately before it returns
 * the `_meta.ui.resourceUri` payload to the model.
 */
export function setRecipes(token: string, recipes: Recipe[]): void {
  registry.set(token, recipes);
}

/**
 * Retrieve the recipe array stored under the given token.
 * Returns `undefined` if the token has never been registered or the registry
 * was cleared (e.g. after page navigation).
 */
export function getRecipes(token: string): Recipe[] | undefined {
  return registry.get(token);
}

/**
 * Clear all stored entries. Called automatically on `window.beforeunload`.
 * May also be called explicitly in tests or after navigation events.
 */
export function clearRecipes(): void {
  registry.clear();
}
