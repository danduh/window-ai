---
phase: 01-foundation-skeleton
plan: 01
subsystem: persistence + types
tags: [webmcp, indexeddb, idb, typescript-ambient, persistence]
dependency_graph:
  requires: []
  provides:
    - chat/src/app/services/RecipePersistence.ts (Recipe CRUD + interfaces)
    - chat/src/app/services/recipeSeed.ts (SEED_RECIPES constant)
    - chat/src/app/types/webmcp.d.ts (global Navigator.modelContext ambient types)
  affects:
    - package.json (idb@^8.0.3 added to dependencies)
tech_stack:
  added:
    - idb@8.0.3 (promise-based IndexedDB wrapper with DBSchema generic typing)
  patterns:
    - idb DBSchema + IDBPDatabase singleton (getDB lazy-init)
    - TypeScript ambient declare global for Navigator augmentation
    - Count-gated idempotent seedIfEmpty
key_files:
  created:
    - chat/src/app/services/RecipePersistence.ts
    - chat/src/app/services/recipeSeed.ts
    - chat/src/app/types/webmcp.d.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "idb@8.0.3 installed at root package.json only (not chrome-llm-ts) — no published-lib surface added"
  - "webmcp.d.ts placed in chat/src/app/types/ matching dom-chromium-ai.d.ts precedent — no export {}"
  - "Two spec-mandated any uses in webmcp.d.ts (execute input + requestUserInteraction callback) left as-is per W3C IDL §4.2.1"
  - "npm install --legacy-peer-deps required due to pre-existing @aws/nx-plugin peer conflict (unrelated to this plan)"
metrics:
  duration_seconds: 221
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_changed: 5
---

# Phase 01 Plan 01: idb + RecipePersistence + WebMCP Types Summary

**One-liner:** IndexedDB persistence layer via idb@8.0.3 with typed Recipe CRUD, two seed recipes (Buttermilk Pancakes + Tomato Pasta), and ambient `navigator.modelContext` declarations enabling Phase 2 tool registration without any casts.

## What Was Built

### idb@8.0.3 installed

`idb@^8.0.3` added to root `package.json` dependencies between `fastify-plugin` and `prismjs` (alphabetical). Installed at `node_modules/idb` version `8.0.3`. Zero runtime deps, ISC license, written by Jake Archibald (Chrome team).

### RecipePersistence.ts — public API surface

```ts
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;       // free-form: 'g' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' | ...
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
}

export const getRecipes: () => Promise<Recipe[]>;
export const getRecipe: (id: string) => Promise<Recipe | undefined>;
export const saveRecipe: (recipe: Recipe) => Promise<void>;
export const deleteRecipe: (id: string) => Promise<void>;
export const seedIfEmpty: (seeds: Recipe[]) => Promise<void>;  // count-gated idempotent
```

DB name: `window-ai-recipes`, DB version: 1, store: `recipes`, keyPath: `id`.
Uses `idb`'s `DBSchema` generic + `IDBPDatabase<RecipeDB>` for full type safety.
Single shared `dbPromise` singleton (lazy-init via `getDB()`).

### recipeSeed.ts — seed data

```ts
export const SEED_RECIPES: Recipe[] = [
  { id: 'buttermilk-pancakes', title: 'Buttermilk Pancakes', servings: 4, ... },
  { id: 'tomato-pasta', title: 'Tomato Pasta', servings: 2, ... },
];
```

Imports `type { Recipe }` from `./RecipePersistence` — type-only import, no runtime coupling.

### webmcp.d.ts — ambient WebMCP globals declared

The following interfaces are now declared globally (no import required):

| Interface | Key members |
|-----------|-------------|
| `Navigator` (augmented) | `readonly modelContext?: ModelContext` |
| `ModelContext` | `registerTool(tool, options?)`, `provideContext(context)` |
| `ModelContextRegisterToolOptions` | `signal?: AbortSignal` |
| `ModelContextTool` | `name`, `description`, `inputSchema?`, `execute`, `title?`, `annotations?` |
| `ModelContextToolAnnotations` | `readOnlyHint?`, `untrustedContentHint?` |
| `ModelContextClient` | `requestUserInteraction(callback)` |

File is a TypeScript script (no `export {}`) so `declare global` augmentations apply repo-wide. Picked up automatically by `chat/tsconfig.app.json` `include: ["src/**/*.ts"]`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5df6ebc | feat(01-01): install idb@8.0.3 and ship typed RecipePersistence + seed module |
| 2 | b651f8d | feat(01-01): ship ambient WebMCP type declarations |

## Verification Results

All 7 plan verification checks passed:

1. `grep '"idb": "^8.0.3"' package.json` — PASS
2. `test -d node_modules/idb` — PASS
3. RecipePersistence.ts exports all 5 functions + 2 interfaces — PASS
4. recipeSeed.ts exports SEED_RECIPES with buttermilk-pancakes + tomato-pasta — PASS
5. webmcp.d.ts declares all 6 interfaces with modelContext? on Navigator, no export {} — PASS
6. `npx nx build chat` exits 0 — PASS (webpack compiled successfully)
7. No `as any` casts in any new file — PASS

## Deviations from Plan

**1. [Rule 3 - Blocking] npm install required --legacy-peer-deps flag**

- **Found during:** Task 1 (npm install step)
- **Issue:** `npm install` failed with ERESOLVE due to a pre-existing `@aws/nx-plugin@0.46.0` vs `nx@21.5.1` peer conflict. This conflict predates this plan — it's a monorepo-level pre-existing condition.
- **Fix:** Used `npm install --legacy-peer-deps` which matches how the repo's existing `node_modules/` was installed. `idb@8.0.3` installed successfully.
- **Files modified:** `package-lock.json` (updated by npm)
- **Commit:** 5df6ebc

All other tasks executed exactly as planned. No architectural changes, no security deviations.

## Known Stubs

None. This plan delivers pure data/types — no UI stubs, no placeholder values flowing to rendering. The seed recipes are fully specified (all fields populated).

## Threat Flags

None. The new files introduce no network endpoints, no auth paths, no file access patterns, and no schema changes at trust boundaries beyond the planned IndexedDB write surface (T-01-01-02: accepted).

## Self-Check: PASSED

- `chat/src/app/services/RecipePersistence.ts` — FOUND
- `chat/src/app/services/recipeSeed.ts` — FOUND
- `chat/src/app/types/webmcp.d.ts` — FOUND
- Commit `5df6ebc` — FOUND
- Commit `b651f8d` — FOUND
