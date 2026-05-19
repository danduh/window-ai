---
phase: 04-v1-1-foundation-page-shell-store-seed
plan: "01"
subsystem: persistence
tags: [indexeddb, idb, persistence, react-hooks, pub-sub, brownfield, additive-migration]
dependency_graph:
  requires: []
  provides:
    - "RecipePersistence.ts v2: DB_VERSION=2, both IDB stores, exported getDB, PlanEntry type, seedIfMissing"
    - "recipeSeed.ts: 12-recipe SEED_RECIPES with totalMinutes + searchableIngredients on all entries"
    - "MealPlanStore.ts: IDB CRUD + pub-sub module for meal-plan store"
    - "useMealPlan.ts: React hook returning { plan, loading } subscribed to MealPlanStore"
  affects:
    - "chat/src/app/services/RecipePersistence.ts"
    - "chat/src/app/services/recipeSeed.ts"
    - "chat/src/app/services/MealPlanStore.ts"
    - "chat/src/app/hooks/useMealPlan.ts"
tech_stack:
  added: []
  patterns:
    - "Cascading-if versioned IDB upgrade callback (if oldVersion < N)"
    - "Additive upsert via single readwrite transaction (seedIfMissing)"
    - "Module-scope Set<Listener> pub-sub (mirrors recipeStore.ts)"
    - "useState + useEffect Shape B hook with cancelled flag (mirrors RecipeWorkbenchPage.tsx)"
key_files:
  created:
    - "chat/src/app/services/MealPlanStore.ts"
    - "chat/src/app/hooks/useMealPlan.ts"
  modified:
    - "chat/src/app/services/RecipePersistence.ts"
    - "chat/src/app/services/recipeSeed.ts"
decisions:
  - "PlanEntry defined in RecipePersistence.ts (not MealPlanStore.ts) so the shared DBSchema can reference it without a circular import; MealPlanStore.ts re-exports PlanEntry for ergonomic consumer imports"
  - "useMealPlan uses Shape B (useState + useEffect) not useSyncExternalStore per RESEARCH.md Finding 5 recommendation"
  - "Removed eslint-disable-next-line no-console directives: the no-console rule is not configured in this project's ESLint setup, so the directives generated unused-directive warnings"
  - "10 new recipe IDs: lemon-garlic-chicken-skillet, honey-soy-chicken-stir-fry, sheet-pan-chicken-fajitas, creamy-mushroom-risotto, salmon-teriyaki, beef-tacos, greek-salad, shrimp-scampi, veggie-curry, avocado-toast-eggs"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-18"
  tasks_completed: 4
  files_modified: 4
---

# Phase 04 Plan 01: v1.1 Foundation — RecipePersistence v2, MealPlanStore, useMealPlan, 12-Recipe Seed

**One-liner:** IDB schema bumped to v2 with additive meal-plan store, 12-recipe seed (3 chicken <=30min), typed MealPlanStore pub-sub module, and StrictMode-safe useMealPlan hook.

## What Was Built

Plan 04-01 delivers the complete persistence data layer for the `/generative-ui` feature with no UI. Four files were changed.

### Task 1: RecipePersistence.ts — DB_VERSION=2

- `DB_VERSION` bumped from 1 to 2.
- `upgrade(db, oldVersion)` uses the cascading-if pattern: `if (oldVersion < 1)` creates `recipes`; `if (oldVersion < 2)` creates `meal-plan`. Safe for fresh installs (oldVersion=0) and v1.0 upgrades (oldVersion=1).
- `blocked` and `blocking` callbacks added for two-tab upgrade concurrency safety.
- `getDB` exported (was previously module-private) so MealPlanStore.ts shares the single connection.
- `PlanEntry` interface exported: `{ id: string; recipeId: string; addedAt: number; servings?: number }`.
- `Recipe` interface extended with `totalMinutes?: number` and `searchableIngredients?: string[]` (additive optional, no breaking changes).
- `seedIfMissing` exported: additive upsert via a single `readwrite` transaction; does not overwrite existing recipes.
- All v1.0 exports (`getRecipes`, `getRecipe`, `saveRecipe`, `deleteRecipe`, `seedIfEmpty`, `Ingredient`, `Recipe`) unchanged.

### Task 2: recipeSeed.ts — 12 entries

- Backfilled `buttermilk-pancakes` (totalMinutes: 20) and `tomato-pasta` (totalMinutes: 25) with `searchableIngredients`.
- Added 10 new recipes. Three chicken recipes with `totalMinutes <= 30`:
  - `lemon-garlic-chicken-skillet` — 25min
  - `honey-soy-chicken-stir-fry` — 20min
  - `sheet-pan-chicken-fajitas` — 30min
- Other 7 recipes: creamy-mushroom-risotto (45min), salmon-teriyaki (25min), beef-tacos (20min), greek-salad (15min), shrimp-scampi (20min), veggie-curry (35min), avocado-toast-eggs (15min).
- All 12 entries carry `totalMinutes` and `searchableIngredients`; all chicken recipes have `'chicken'` in `searchableIngredients`.

### Task 3: MealPlanStore.ts (new file)

- Imports `getDB` and `PlanEntry` from `RecipePersistence.ts` — no direct `openDB` call.
- Re-exports `PlanEntry` for ergonomic consumer imports.
- Module-scope `Set<Listener>` pub-sub: `subscribeMealPlanStore` + `notifyMealPlanStore`.
- Four async CRUD functions: `getPlan` (chronological ascending), `addToPlan`, `removeFromPlan`, `clearPlan`. All mutating functions call `notifyMealPlanStore` after the IDB write.

### Task 4: useMealPlan.ts (new file)

- Shape B hook per RESEARCH.md Finding 5: `useState<PlanEntry[]>([])` + `useState(true)` for loading.
- Effect 1 (initial load, `[]` deps): `cancelled` flag prevents setState after unmount (StrictMode-safe).
- Effect 2 (subscription, `[]` deps): `subscribeMealPlanStore` fires `getPlan()` on mutations; cleanup returns `unsub`.
- Returns `{ plan: PlanEntry[], loading: boolean }`.
- No `useSyncExternalStore`, no module-scope cache.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused eslint-disable directives**
- **Found during:** Overall lint verification (post all tasks)
- **Issue:** The plan's task instructions specified adding `// eslint-disable-next-line no-console` before `console.warn` and `console.error` calls, following the pattern documented in RESEARCH.md. However, the project's ESLint configuration does NOT enable the `no-console` rule — confirmed by grepping `eslint.base.config.js` and `eslint.config.js`. ESLint reported 3 "unused eslint-disable directive" warnings.
- **Fix:** Removed the 3 disable comments from `RecipePersistence.ts` (1) and `useMealPlan.ts` (2). The console calls remain; they just have no directive.
- **Files modified:** `RecipePersistence.ts`, `useMealPlan.ts`
- **Commit:** `74b3683`

### Minor Planner Note (not a deviation, informational)

The acceptance criteria for Task 4 says `grep -c "useEffect"` returns `2`. The actual count is 3: 1 import line + 2 calls. The import `import { useState, useEffect } from 'react'` contains "useEffect". The exact criterion `grep -c "useEffect("` (with the opening paren) does return `2`. The spirit of the criterion is satisfied — there are exactly 2 `useEffect` calls.

## Notes for Plan 04-02

- `MealPlanStore.PlanEntry` is re-exported from `MealPlanStore` for ergonomic imports — consumers can `import type { PlanEntry } from '../services/MealPlanStore'` without reaching into `RecipePersistence`.
- `useMealPlan()` is ready to be imported by `MealPlanColumn.tsx` in Plan 04-02. The hook returns `{ plan, loading }` where `loading: true` until the first IDB read resolves.
- `seedIfMissing(SEED_RECIPES)` should be called in a mount-time `useEffect` inside `GenerativeUIPage.tsx` (Plan 04-02). The RESEARCH.md Finding 3 code example is the exact pattern to use.
- No UI, route, or SEO changes were made in this plan — all deferred to Plan 04-02.

## Known Stubs

None. This plan is data-layer only (no UI rendering, no placeholder text).

## Threat Flags

None. No new network endpoints, auth paths, file access, or cross-origin communication. The `meal-plan` IDB store accepts same-origin JavaScript input only, identical to the existing `recipes` store.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| chat/src/app/services/RecipePersistence.ts | FOUND |
| chat/src/app/services/recipeSeed.ts | FOUND |
| chat/src/app/services/MealPlanStore.ts | FOUND |
| chat/src/app/hooks/useMealPlan.ts | FOUND |
| Commit ca5877e (Task 1) | FOUND |
| Commit 3760d82 (Task 2) | FOUND |
| Commit 25086d1 (Task 3) | FOUND |
| Commit 0084ed1 (Task 4) | FOUND |
| Commit 74b3683 (lint fix) | FOUND |
| TypeScript typecheck | PASSED (exit 0) |
| ESLint (direct) | PASSED (0 errors, 0 warnings on touched files) |
