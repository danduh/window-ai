# Phase 4: v1.1 Foundation — Page shell, store, seed — Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 lands the v1.1 tracer-bullet skeleton: a new `/generative-ui` route in the `chat/` SPA showing a page shell (header + left search/chat placeholder + right meal-plan column), a new typed `MealPlanStore` persistence module (IDB) wired to a React `useMealPlan()` hook, and a 12-recipe additive seed available for the Phase 6 `searchRecipes` tool. v1.0's 2 recipes (`buttermilk-pancakes`, `tomato-pasta`) are preserved. `MissingFlagBanner` renders when `navigator.modelContext` is undefined while the rest of the layout stays usable.

Out of scope for this phase: WebMCP tool registration (Phase 6), iframe / postMessage bridge (Phase 5), in-page chat (Phase 6), `/generative-ui/docs` markdown (Phase 7), MCP Apps wire protocol.

</domain>

<decisions>
## Implementation Decisions

### MealPlanStore Schema & IDB Strategy
- IDB layout: new object store `meal-plan` added to the **existing** `window-ai-recipes` database; bump `DB_VERSION` from 1 → 2 with a single `upgrade(db, oldVersion)` block that creates the `meal-plan` store when `oldVersion < 2`. Existing `recipes` store untouched.
- `PlanEntry` shape: `{ id: string (uuid), recipeId: string, addedAt: number, servings?: number }`. `id` enables removing a specific entry; `servings?` is optional so Phase 6's `commitRecipeToPlan` can override the recipe default.
- Scope: single global plan (one logical "tonight's meal plan") — entries are listed chronologically. No date-keyed plans, no multi-list UI.
- API exposure: `MealPlanStore.ts` exports typed functions `getPlan()`, `addToPlan(entry)`, `removeFromPlan(entryId)`, `clearPlan()` — mirrors `RecipePersistence.ts` pattern exactly. Module-scope IDB connection promise; no class.

### 12-Recipe Seed Strategy
- Recipe content lives in the existing `chat/src/app/services/recipeSeed.ts` `SEED_RECIPES` array (single source of truth; both `/webmcp` and `/generative-ui` consume the same list).
- Migration: add a new `seedIfMissing(recipes)` helper to `RecipePersistence.ts` that upserts by `id` (writes any recipe not currently present) without overwriting user-edited copies of existing IDs. `/generative-ui` page mount calls `seedIfMissing(SEED_RECIPES)` so v1.0 users automatically pick up the new 10 recipes on first visit. `seedIfEmpty()` remains as v1.0 left it.
- Recipe interface extensions (additive, optional): add `totalMinutes?: number` (sum of prep + cook minutes) and `searchableIngredients?: string[]` (denormalized lowercase ingredient names). Backfill these two fields on the existing v1.0 entries (`buttermilk-pancakes`, `tomato-pasta`) so all 12 are searchable uniformly by Phase 6.
- Content themes: 12 recipes total — include ≥3 chicken-based recipes with `totalMinutes ≤ 30` to support the demo script ("Find me a 30-minute chicken recipe"). Round out with cuisine/protein variety (pasta, vegetarian, breakfast, seafood, etc.) for a visually compelling carousel later.

### Page Shell Layout & Component Organization
- Component subdir: `chat/src/app/components/GenerativeUI/` (matches route `/generative-ui` — overrides earlier `MCPApps/` proposal from `codebase-integration-map.md` §10).
- Layout: two-column flex layout (left chat/search placeholder dominates, right meal-plan column ~320–360px). Mobile collapses to vertical stack via Tailwind responsive classes (the demo runs on a laptop projector, but don't break responsive).
- View structure: single-view in Phase 4 (no Docs tab yet, no `/generative-ui/docs` route registered). The Docs route + Tabs component are deferred to Phase 7, matching how v1.0 Phase 1 deferred docs markdown until Phase 3.
- State binding: new `useMealPlan()` hook in `chat/src/app/hooks/` subscribes to a module-scope pub-sub inside `MealPlanStore.ts` (mirrors v1.0 `recipeStore.ts:subscribe()`). The right-column `MealPlanColumn` component calls `useMealPlan()` directly — no prop-drilling — so Phase 6's bridge can mutate the store and the column re-renders without further refactor.

### Claude's Discretion
- Exact placeholder copy in the search/chat area ("Ask for a recipe…" or similar) — planner decides; should hint that chat will live here in a future phase.
- Specific recipe content (names, ingredient lists, step text) for the 10 new recipes — planner authors; just hit the constraints above (≥3 chicken ≤30min, total = 12 recipes including the 2 existing).
- Exact meal-plan column visual treatment when empty (placeholder card vs. text-only hint) — planner picks something dark-mode-clean.
- Whether to register `/generative-ui` only or also `/generative-ui/docs` (with placeholder) — planner can register just `/generative-ui` per the deferred-docs decision; if registering both turns out simpler when Phase 7 lands, planner is free to do that and have the docs route render a placeholder for now.
- Whether `useMealPlan()` returns the array directly or a `{ plan, loading }` tuple — planner decides based on whether IDB read needs an explicit loading state in the empty UI.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/services/RecipePersistence.ts` — `idb@8.0.3`-backed module with `getRecipes/getRecipe/saveRecipe/deleteRecipe/seedIfEmpty`. Extend with `seedIfMissing()` and bump `DB_VERSION` to 2 inside its existing `openRecipesDb()` (or equivalently named open helper). Existing `recipes` store schema unchanged.
- `chat/src/app/services/recipeSeed.ts` — current `SEED_RECIPES` array with 2 recipes and the `Recipe`/`Ingredient` interfaces. Extend the array and interface (additive optional fields).
- `chat/src/app/services/recipeStore.ts` — module-scope pub-sub pattern; clone its `subscribe()` / `notify()` shape for `MealPlanStore.ts`.
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — reusable as-is for the new page. Copy mentions `chrome://flags/#WebMCP for testing`; no change needed.
- `chat/src/app/hooks/useSEOData.ts` — extend `seoConfigs` with `generativeUI: { title, description }`; the hook itself doesn't need code changes.
- `chat/scripts/prerender-react.js` — append `/generative-ui` to the `routes` array AND to `getSEODataForRoute()`'s lookup table; the two MUST be byte-identical (Phase 3 D-08/D-12 carryover, restated under STATE.md risks).
- `chat/src/app/AppRouter.tsx` — `Route` registry + desktop nav (`:70–72` block) + mobile nav (`:160–162` block). Mirror the WebMCP link block exactly, including `trackUserInteraction('navigation_click', 'generative_ui_link')`.
- `chat/src/app/context/ThemeContext.tsx`, `SEOContext.tsx`, `ThemeToggle.tsx` — wrap the new page via the existing `AppRouter` chrome; no work required inside Phase 4.

### Established Patterns
- Mount-time IDB seed via `useEffect` with a `cancelled` flag (StrictMode-safe). See `RecipeWorkbenchPage.tsx:113–150`-ish (the v1.0 Phase 1 mount/seed effect).
- Module-scope pub-sub (no Context, no Redux) — `recipeStore.ts:subscribe(listener)` returns an unsubscribe function; consumers wire it up inside `useSyncExternalStore` or a `useEffect`-based hook.
- Two-column responsive layout via Tailwind: `flex flex-col lg:flex-row` with the right column at `lg:w-80` or similar; dark-mode classes use the `dark:` prefix throughout (`bg-white dark:bg-zinc-900`, etc.).
- TS strict everywhere in `chat/`. No `any`, no `as any`. Ambient WebMCP types live in `chat/src/app/types/webmcp.d.ts` — don't redeclare. Phase 4 itself doesn't touch `navigator.modelContext` (no MCP wiring yet).

### Integration Points
- Route registration: `chat/src/app/AppRouter.tsx` Route block immediately after the existing `/webmcp` and `/webmcp/docs` routes (around `:233`).
- Desktop nav link: clone the `<Link to="/webmcp">` element at `AppRouter.tsx:70–72`, swap to `/generative-ui` with label `Generative UI`.
- Mobile nav link: clone the corresponding entry at `AppRouter.tsx:160–162`.
- SEO config: `seoConfigs.generativeUI` in `chat/src/app/hooks/useSEOData.ts`; mirror entry in `chat/scripts/prerender-react.js` (route + lookup) — byte-identical.
- IDB DB name `window-ai-recipes` is shared between `RecipePersistence` (existing `recipes` store) and the new `MealPlanStore` (`meal-plan` store added in the same DB upgrade transaction).
- `useMealPlan()` hook lives at `chat/src/app/hooks/useMealPlan.ts` — read by `MealPlanColumn.tsx` only (Phase 4 scope); Phase 6's bridge will write via `MealPlanStore.addToPlan` and the hook will pick up the change automatically.

</code_context>

<specifics>
## Specific Ideas

- Demo-script alignment: the 12-recipe library must satisfy the future query "30-minute chicken recipe" with at least 3 hits so the Phase 6 carousel feels populated. Plan picks specific titles (e.g., "Sheet-Pan Chicken Fajitas", "Lemon Garlic Chicken Skillet", "Honey Soy Chicken Stir-Fry") with realistic `totalMinutes` values.
- The page shell's right meal-plan column must visibly exist (with empty-state copy) even before any plan entries exist — this is success criteria #2 (renders empty-state shell + survives hard reload without console errors).
- `seedIfMissing()` returns the count of newly inserted recipes for log/debug — useful when Phase 6 lands and the demo runs from a clean profile.
- DB_VERSION bump from 1 → 2: the `upgrade` callback in `openDB(..., DB_VERSION, { upgrade })` MUST inspect `oldVersion` so a fresh user (no existing DB) still gets both stores via the single upgrade path. Pattern: `if (oldVersion < 1) createRecipes; if (oldVersion < 2) createMealPlan`.

</specifics>

<deferred>
## Deferred Ideas

- `/generative-ui/docs` route + markdown explainer → Phase 7 (DOCS-style task per ROADMAP).
- `searchRecipes` and `commitRecipeToPlan` tool registration → Phase 6.
- Sandboxed iframe + JSON-RPC postMessage bridge → Phase 5.
- In-page chat panel using Chrome `LanguageModel` (responseFormat JSON dispatch) → Phase 6.
- 90-second demo polish + zero-network DevTools kicker → Phase 7.
- Date-keyed or multi-list meal plans (only single global plan in scope).
- Per-entry recipe edits in the meal plan (Phase 4 only supports add/remove/clear).

</deferred>
