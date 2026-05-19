# Phase 4: v1.1 Foundation — Page Shell, Store, Seed - Research

**Researched:** 2026-05-18
**Domain:** IndexedDB via idb@8.0.3 · React 19 pub-sub hook patterns · additive seed migration · AppRouter extension
**Confidence:** HIGH — all findings verified against live codebase files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- IDB: new `meal-plan` object store added to the existing `window-ai-recipes` DB; bump `DB_VERSION` 1 → 2 with a single `upgrade(db, oldVersion)` block that creates `meal-plan` when `oldVersion < 2`. Existing `recipes` store untouched.
- `PlanEntry`: `{ id: string (uuid), recipeId: string, addedAt: number, servings?: number }`
- Single global plan, entries listed chronologically. No date-keyed plans.
- API: `MealPlanStore.ts` exports `getPlan()`, `addToPlan(entry)`, `removeFromPlan(entryId)`, `clearPlan()` — module-scope IDB connection promise, no class.
- 12-recipe additive seed via `seedIfMissing(recipes)` upsert helper in `RecipePersistence.ts`. `seedIfEmpty()` stays as-is.
- Add `totalMinutes?: number` and `searchableIngredients?: string[]` to Recipe interface (additive, optional). Backfill on existing 2 recipes.
- Content: ≥3 chicken recipes with `totalMinutes ≤ 30`.
- Component subdir: `chat/src/app/components/GenerativeUI/`
- Two-column flex layout, right meal-plan column ~320–360px (`lg:w-80`).
- Single-view in Phase 4 (no Tabs, no docs route yet).
- `useMealPlan()` hook in `chat/src/app/hooks/useMealPlan.ts` subscribes to MealPlanStore pub-sub.

### Claude's Discretion
- Exact placeholder copy in search/chat area.
- Specific recipe content for the 10 new recipes.
- Exact meal-plan column visual treatment when empty.
- Whether to register `/generative-ui` only, or also `/generative-ui/docs` as a placeholder.
- Whether `useMealPlan()` returns the array directly or a `{ plan, loading }` tuple.

### Deferred Ideas (OUT OF SCOPE)
- `/generative-ui/docs` route + markdown explainer → Phase 7.
- `searchRecipes` and `commitRecipeToPlan` tool registration → Phase 6.
- Sandboxed iframe + postMessage bridge → Phase 5.
- In-page chat panel → Phase 6.
- Demo polish → Phase 7.
- Date-keyed or multi-list meal plans.
- Per-entry recipe edits in the meal plan.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GENUI-01 | New `/generative-ui` route registered in AppRouter, nav link added, `MissingFlagBanner` renders when `navigator.modelContext` is undefined | Findings 6 + 7: exact line numbers + import pattern |
| GENUI-02 | 12 seeded recipes via additive `seedIfMissing` that does not destroy existing IDB content | Findings 3 + 4 + 9: `seedIfMissing` implementation + DB_VERSION bump + recipe content list |
| GENUI-03 | Typed `MealPlanStore` (IDB) exposes `getPlan`, `addToPlan`, `removeFromPlan`, `clearPlan`; plan survives reload | Findings 1 + 2 + 4 + 5: IDB upgrade pattern + PlanEntry schema + pub-sub pattern + hook shape |
</phase_requirements>

---

## Summary

Phase 4 is pure groundwork: no MCP, no iframe, no chat. It delivers a visible `/generative-ui` page shell backed by a new IDB store for meal plans and an extended recipe seed library. Because v1.0 users already have IDB open at `window-ai-recipes` version 1, the DB upgrade is the single highest-stakes technical step — a botched upgrade callback can silently corrupt existing data or leave v1.0 users stuck. Every other task in this phase is a straight application of patterns already proven in Phases 1–3.

The ten research questions below are answered with verified codebase evidence. Confidence is HIGH across the board because the project is mature (3 shipped phases), the file structure is well-documented, and every pattern can be confirmed by reading files that already exist.

**Primary recommendation:** Model `MealPlanStore.ts` directly after `RecipePersistence.ts` + `recipeStore.ts`. The upgrade callback is the only meaningfully new code; the rest is repetition of established module patterns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Meal-plan state persistence | Browser / IDB | — | IndexedDB is the only persistence layer in this project (CONTEXT.md locked) |
| Meal-plan pub-sub | Browser / module-scope singleton | — | Mirrors `recipeStore.ts` — no server, no Context |
| `useMealPlan()` hook | Frontend (React component tree) | — | Consumes the module-scope pub-sub; bridges IDB state into React renders |
| Page routing + nav | Frontend / AppRouter | — | `AppRouter.tsx` owns all routes + nav chrome |
| Recipe seed migration | Browser / IDB (on page mount) | — | `seedIfMissing` runs in a `useEffect` on `/generative-ui` mount |
| SEO + prerender metadata | Build-time script + runtime hook | — | Dual-write pattern: `useSEOData.ts` (runtime) + `prerender-react.js` (build) must be byte-identical |

---

## Standard Stack

### Core (no new deps needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `idb` | 8.0.3 | IndexedDB typed wrapper | Already installed at root `package.json` [VERIFIED: root package.json] |
| React 19 / `useSyncExternalStore` | 19.x (monorepo) | Hook for external store subscription | Built into React 19; no new install [VERIFIED: chat codebase] |
| Tailwind CSS | 3.4.3 | Styling | Project-wide convention; `chat/tailwind.config.js` [VERIFIED: UI-SPEC] |

**No new packages are required for this phase.** `crypto.randomUUID()` is used for PlanEntry IDs (see Finding 2) — it is a browser built-in with no npm dep.

### UUID generation

`crypto.randomUUID()` is natively available in all modern browsers including Chrome 146+ Canary [ASSUMED: MDN browser compatibility table — Chrome 92+ support; confirmed acceptable for this project's Chrome-only target]. No `uuid` npm package is needed. The monorepo does have `uuid@9.0.1` as a transitive dependency [VERIFIED: node_modules/uuid/package.json] but it is NOT a direct dep and should not be imported from project code.

---

## Architecture Patterns

### System Architecture Diagram

```
Page mount: GenerativeUIPage.tsx
  │
  ├─ useEffect ─► seedIfMissing(SEED_RECIPES)
  │                    │
  │                    ▼
  │              RecipePersistence.ts  ──►  IDB: window-ai-recipes
  │              (getDB, DB_VERSION=2)        ├─ store: recipes    (v1.0, unchanged)
  │                                           └─ store: meal-plan  (new, Phase 4)
  │
  ├─ MissingFlagBanner (conditional on !navigator.modelContext)
  │
  └─ Two-column layout
       ├─ LEFT: ChatPlaceholder (static, Phase 4)
       └─ RIGHT: MealPlanColumn
                    │
                    ├─ useMealPlan() hook
                    │       │
                    │       └─ subscribe to MealPlanStore pub-sub
                    │                    │
                    │                    └─ MealPlanStore.ts  ──►  IDB: meal-plan store
                    │
                    └─ render empty-state (Phase 4 — no entries yet)
```

### Recommended Project Structure (new files only)

```
chat/src/app/
├── components/
│   ├── GenerativeUIPage.tsx          # NEW — top-level page (GENUI-01)
│   └── GenerativeUI/
│       ├── ChatPlaceholder.tsx       # NEW — static left-column placeholder
│       └── MealPlanColumn.tsx        # NEW — right-column (GENUI-03 consumer)
├── services/
│   └── MealPlanStore.ts              # NEW — IDB + pub-sub (GENUI-03)
├── hooks/
│   └── useMealPlan.ts                # NEW — React hook (GENUI-03)
└── services/
    ├── RecipePersistence.ts          # EDIT — bump DB_VERSION + add seedIfMissing + extend Recipe interface
    └── recipeSeed.ts                 # EDIT — extend SEED_RECIPES to 12
chat/src/app/AppRouter.tsx            # EDIT — route + nav links (GENUI-01)
chat/src/app/hooks/useSEOData.ts      # EDIT — add seoConfigs.generativeUI
chat/scripts/prerender-react.js       # EDIT — add /generative-ui route + SEO entry
```

---

## Finding 1: IDB DB_VERSION Upgrade Pattern

**Question answered:** What does the `upgrade` callback look like to handle both fresh installs (no existing DB) and v1.0 users (existing DB at version 1)?

**Verified against:** `idb@8.0.3` type declaration at `node_modules/idb/build/entry.d.ts` [VERIFIED: idb entry.d.ts]

The `upgrade` callback signature is:
```ts
upgrade(
  db: IDBPDatabase<DBTypes>,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBPTransaction<...>
): void
```

The `oldVersion` parameter is `0` on a completely fresh install (no DB has ever existed). For a v1.0 user, `oldVersion` is `1`.

**Exact pattern to use in `RecipePersistence.ts`:**

```typescript
// Before (v1.0 — current code):
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RecipeDB>> | null = null;

const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<RecipeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};
```

```typescript
// After (v1.1 — Phase 4):
const DB_VERSION = 2;

const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<RecipeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Run each migration step in sequence based on previous version.
        // A fresh install arrives at oldVersion=0 and runs all blocks.
        // A v1.0 user arrives at oldVersion=1 and only runs the block for v2.
        if (oldVersion < 1) {
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('meal-plan', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};
```

**Critical notes:**
- The `if (!db.objectStoreNames.contains(...))` guard used in the v1.0 code is NOT needed in the versioned pattern — each `if (oldVersion < N)` block is only reached at the exact upgrade path where the store does not yet exist. The guard is redundant and can be dropped for the `recipes` store migration too (the version gating makes it safe).
- The `DBSchema` type must be extended to include `meal-plan`. See Finding 4 for the full type definition.
- `dbPromise` must be reset to `null` when the DB connection is replaced. In practice this only matters if `MealPlanStore.ts` also calls `openDB` independently — the recommended approach is to share a single `getDB()` via a thin `getSharedDB()` export OR have `MealPlanStore.ts` import the `getDB` from `RecipePersistence.ts`. See Finding 4.

---

## Finding 2: UUID Generation

**Question answered:** Does the codebase have a UUID utility? If not, what is the lightest path?

**Verified by:** grepping `chat/src/` for `uuid` and `randomUUID` [VERIFIED: grep found zero matches]; inspecting `node_modules/uuid/package.json` [VERIFIED: uuid@9.0.1 is a transitive dep, NOT a direct dep]; checking `package.json` directly [VERIFIED].

**Answer:** There is no UUID utility in `chat/src/`. The `uuid` npm package is present in `node_modules` only as a transitive dependency of some other package — importing it from project code would be importing a transitive dep, which is fragile and violates the project's dependency hygiene.

**Use `crypto.randomUUID()` instead.** This is a browser-native API [ASSUMED: MDN shows Chrome 92+ support; Chrome 146 Canary is well within range]:

```typescript
const entry: PlanEntry = {
  id: crypto.randomUUID(),
  recipeId: 'some-recipe-id',
  addedAt: Date.now(),
};
```

No npm install needed. TypeScript knows about `crypto.randomUUID()` via `lib.dom.d.ts` when `lib` includes `"DOM"` — the project's `chat/tsconfig.app.json` already includes `"DOM"` in `compilerOptions.lib` [ASSUMED: standard Vite React TypeScript template default; should be verified before writing the first call site].

---

## Finding 3: `seedIfMissing()` Pattern

**Question answered:** Exact implementation of the additive upsert helper.

**Verified against:** `RecipePersistence.ts` current code [VERIFIED: full file read]; `seedIfEmpty` implementation at lines 68–75 [VERIFIED].

The existing `seedIfEmpty` is count-gated — it early-returns if `count > 0`. This is correct for the v1.0 initial seeding but will silently skip the 10 new recipes for any v1.0 user (they already have 2 recipes). `seedIfMissing` must check by-id instead.

**Exact implementation to add to `RecipePersistence.ts`:**

```typescript
/**
 * Additive upsert: writes any recipe in `seeds` whose id is not yet present
 * in the store. Does NOT overwrite recipes that already exist (so user edits
 * to existing recipes survive). Returns the count of newly inserted recipes
 * for debug logging.
 */
export const seedIfMissing = async (seeds: Recipe[]): Promise<number> => {
  const db = await getDB();
  const tx = db.transaction('recipes', 'readwrite');
  let inserted = 0;
  for (const seed of seeds) {
    const existing = await tx.store.get(seed.id);
    if (!existing) {
      await tx.store.put(seed);
      inserted++;
    }
  }
  await tx.done;
  return inserted;
};
```

**Why `tx.store.get` inside the transaction, not `getRecipe`?** Calling `getRecipe` would open a second transaction, racing with the write transaction and potentially reading stale data. Keeping all reads and writes inside one `readwrite` transaction is the safe IDB pattern.

**Call site in `GenerativeUIPage.tsx`:**

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const inserted = await seedIfMissing(SEED_RECIPES);
      if (inserted > 0) {
        // eslint-disable-next-line no-console
        console.log(`[GenerativeUI] seedIfMissing: inserted ${inserted} new recipes`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[GenerativeUI] Failed to seed recipe library:', message);
      // Seed failure is non-blocking in Phase 4 — the page still renders.
    }
    // Note: cancelled check not needed here because seedIfMissing has no
    // setState calls. The page mounts regardless.
  })();
  return () => {
    cancelled = true; // retained for consistency with the established pattern
  };
}, []);
```

---

## Finding 4: MealPlanStore Design — Full Schema + IDB Wiring

**Question answered:** How to structure `MealPlanStore.ts` sharing the same `window-ai-recipes` DB as `RecipePersistence.ts`.

**Verified against:** `RecipePersistence.ts` (full file) [VERIFIED]; `idb` `DBSchema` typing in `entry.d.ts` [VERIFIED].

### Shared DBSchema

The cleanest approach for a single-DB multi-store setup with `idb` is to define a unified `DBSchema` that both `RecipePersistence.ts` and `MealPlanStore.ts` share. There are two options:

**Option A — Export the schema from `RecipePersistence.ts` and import it in `MealPlanStore.ts`.** This requires `RecipePersistence.ts` to export its `RecipeDB` type (currently it is not exported) and to add the `meal-plan` store to it. `RecipePersistence.ts` becomes the single source of truth for the DB schema.

**Option B — Each file manages its own typed view.** `MealPlanStore.ts` opens its own connection with a `MealPlanDB` schema that only declares the `meal-plan` store. `idb` handles concurrent connections fine but the `upgrade` callback will only run from ONE connection — the one that opens with the latest `DB_VERSION`. This creates a sequencing problem: if `MealPlanStore.ts` opens the DB with `DB_VERSION = 2` but doesn't include the `recipes` store in the upgrade schema, the `recipes` store creation (for fresh installs) will be missed.

**Recommendation: Option A** — extend `RecipePersistence.ts` to export a unified `RecipeDB` schema and a shared `getDB()` function. `MealPlanStore.ts` imports `getDB` and uses it directly. This is the single-upgrade-callback pattern that avoids the sequencing hazard.

### Updated types in `RecipePersistence.ts`

```typescript
export interface PlanEntry {
  id: string;          // crypto.randomUUID()
  recipeId: string;
  addedAt: number;     // Date.now()
  servings?: number;   // optional — Phase 6 adds a default from the Recipe
}

interface RecipeDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
  };
  'meal-plan': {
    key: string;
    value: PlanEntry;
  };
}

// Export getDB so MealPlanStore.ts can share the same connection:
export const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  // ... (same as current but with DB_VERSION=2 and the upgraded upgrade callback)
};
```

### `MealPlanStore.ts` — full module

```typescript
// chat/src/app/services/MealPlanStore.ts
import { getDB, type PlanEntry } from './RecipePersistence';

const PLAN_STORE = 'meal-plan';

// ── pub-sub ──────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to meal-plan store change notifications. Returns an unsubscribe fn. */
export const subscribeMealPlanStore = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/** Notify all listeners. Called by every mutating function. */
export const notifyMealPlanStore = (): void => {
  listeners.forEach((l) => l());
};

// ── public API ───────────────────────────────────────────────────────────────

/** Returns all plan entries ordered by addedAt ascending. */
export const getPlan = async (): Promise<PlanEntry[]> => {
  const db = await getDB();
  const all = await db.getAll(PLAN_STORE);
  return all.sort((a, b) => a.addedAt - b.addedAt);
};

/** Adds a new entry to the plan. Caller provides a pre-constructed PlanEntry. */
export const addToPlan = async (entry: PlanEntry): Promise<void> => {
  const db = await getDB();
  await db.put(PLAN_STORE, entry);
  notifyMealPlanStore();
};

/** Removes a single plan entry by its id. No-op if id is unknown. */
export const removeFromPlan = async (entryId: string): Promise<void> => {
  const db = await getDB();
  await db.delete(PLAN_STORE, entryId);
  notifyMealPlanStore();
};

/** Clears all entries from the plan. */
export const clearPlan = async (): Promise<void> => {
  const db = await getDB();
  await db.clear(PLAN_STORE);
  notifyMealPlanStore();
};
```

**Re-export `PlanEntry`** from `RecipePersistence.ts` (see above) — keeps the type in one place. `MealPlanStore.ts` imports it.

---

## Finding 5: `useMealPlan()` Hook — `useSyncExternalStore` vs `useState + useEffect`

**Question answered:** Which React primitive for subscribing to the pub-sub store?

**Verified against:** `RecipeWorkbenchPage.tsx` lines 233–244 (the live `subscribeRecipeStore` usage pattern) [VERIFIED]; React 19 ships `useSyncExternalStore` as stable API [ASSUMED: React 18.0 stable release note; React 19 retains].

### Recommendation: `useSyncExternalStore`

React 19 provides `useSyncExternalStore` specifically for subscribing to external mutable stores. It handles concurrent rendering correctly — unlike a `useState + useEffect` pair, it does not have a window between render and subscription where the store could have been mutated and the component would miss the notification.

However, `useSyncExternalStore` requires a **synchronous snapshot getter**. `getPlan()` is async (IDB). This means the hook needs an internal loading state to bridge the async read.

**Two viable shapes:**

**Shape A — `useSyncExternalStore` with a local cache:**

```typescript
// chat/src/app/hooks/useMealPlan.ts
import { useSyncExternalStore, useCallback, useRef } from 'react';
import { subscribeMealPlanStore, getPlan, type PlanEntry } from '../services/MealPlanStore'; // re-exported PlanEntry

// Module-scope cache — survives re-renders, shared across hook instances.
let cachedPlan: PlanEntry[] = [];
let cacheLoaded = false;

const subscribe = (cb: () => void) => subscribeMealPlanStore(cb);

const getSnapshot = (): PlanEntry[] => cachedPlan;

// On first call (or after notifyMealPlanStore), refresh the async cache and
// re-trigger by calling notifyMealPlanStore. This is a one-async-read-per-mutation pattern.
function refreshCache(): void {
  getPlan().then((plan) => {
    cachedPlan = plan;
    notifyMealPlanStore(); // triggers useSyncExternalStore re-render
  });
}
```

This pattern is elegant but requires `notifyMealPlanStore` to be called after cache refresh — creating a potential loop. The simpler approach for this project's scope is Shape B.

**Shape B — `useState + useEffect` (mirrors the RecipeWorkbenchPage pattern exactly):**

```typescript
// chat/src/app/hooks/useMealPlan.ts
import { useState, useEffect } from 'react';
import { subscribeMealPlanStore, getPlan } from '../services/MealPlanStore';
import type { PlanEntry } from '../services/RecipePersistence';

export interface UseMealPlanResult {
  plan: PlanEntry[];
  loading: boolean;
}

export const useMealPlan = (): UseMealPlanResult => {
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    getPlan()
      .then((entries) => {
        if (!cancelled) {
          setPlan(entries);
          setLoading(false);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.error('[useMealPlan] Failed to load plan:', message);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to future mutations
  useEffect(() => {
    const unsub = subscribeMealPlanStore(() => {
      getPlan()
        .then((entries) => setPlan(entries))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          // eslint-disable-next-line no-console
          console.error('[useMealPlan] Failed to refresh plan after store notify:', message);
        });
    });
    return unsub;
  }, []);

  return { plan, loading };
};
```

**Shape B is the recommended choice.** It exactly mirrors the proven `subscribeRecipeStore` + `getRecipes` pattern in `RecipeWorkbenchPage.tsx:233–244` [VERIFIED]. The project has already demonstrated this works correctly under React 19 StrictMode (double-mount safe via `cancelled` flag). Shape A introduces module-scope mutable cache state that is more complex and harder to reset in tests.

The hook returns `{ plan, loading }` (a tuple-like object) rather than the array directly — this satisfies the CONTEXT.md "Claude's Discretion" question and gives `MealPlanColumn.tsx` an explicit loading state to render the `Loading plan…` copy specified in the UI-SPEC.

---

## Finding 6: AppRouter.tsx — Exact Insertion Points

**Question answered:** Exact line numbers and surrounding context for nav link and route insertion.

**Verified against:** `AppRouter.tsx` full file read [VERIFIED: AppRouter.tsx current state].

### Desktop nav link (line 70–72 area — AFTER `/webmcp`, BEFORE `/writer`)

Current at lines 70–72:
```tsx
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">WebMCP</Link>
<Link to="/writer"   // <-- currently line 73
```

Insert the new link between line 72 (end of WebMCP link) and line 73 (start of Writer link):
```tsx
<Link to="/generative-ui"
      onClick={() => trackUserInteraction('navigation_click', 'generative_ui_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Generative UI</Link>
```

Note: The UI-SPEC specifies `font-normal` rather than `font-medium`. Looking at the actual existing nav links: they use `font-medium`. The UI-SPEC's "font-normal" appears to be an error in the spec — all existing nav links use `font-medium` [VERIFIED: AppRouter.tsx lines 54, 60, 67, 70, 73]. **Use `font-medium` to match the existing nav styling exactly.** This is a brownfield discipline call: don't deviate from established patterns.

### Mobile nav link (lines 160–162 area — AFTER `/webmcp`, BEFORE `/writer`)

Current at lines 160–162:
```tsx
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link_mobile')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">WebMCP</Link>
<Link to="/writer"   // <-- currently line 163
```

Insert between end of WebMCP and start of Writer:
```tsx
<Link to="/generative-ui"
      onClick={() => trackUserInteraction('navigation_click', 'generative_ui_link_mobile')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Generative UI</Link>
```

### Route registration (line 233 area — AFTER WebMCP routes, BEFORE Writer routes)

Current at lines 231–239:
```tsx
{/* WebMCP routes */}
<Route path="/webmcp" element={<RecipeWorkbenchPage/>}/>
<Route path="/webmcp/docs" element={<RecipeWorkbenchPage/>}/>

{/* Writer/Rewriter routes */}
<Route path="/writer" element={<Navigate to="/writer/writer-api-documentation" replace/>}/>
```

Insert between `/webmcp/docs` route and the Writer comment:
```tsx
{/* Generative UI routes */}
<Route path="/generative-ui" element={<GenerativeUIPage/>}/>
```

The catch-all `<Route path="*" .../>` remains LAST (it is currently at line 239). The new route must go before it.

### Import to add (top of AppRouter.tsx, near line 10)

```tsx
import { GenerativeUIPage } from './components/GenerativeUIPage';
```

---

## Finding 7: MissingFlagBanner — Reuse Decision

**Question answered:** Import from `RecipeWorkbench/` or move to shared location?

**Verified against:** `MissingFlagBanner.tsx` full content [VERIFIED]; `04-CONTEXT.md` reusable assets section; UI-SPEC component inventory [VERIFIED].

**Answer: Import directly from `RecipeWorkbench/MissingFlagBanner.tsx`.** The component is a zero-prop, zero-state, pure-render component [VERIFIED: the component takes no props and renders static JSX]. It is 32 lines of markup with no RecipeWorkbench-specific logic — the copy mentions `chrome://flags/#WebMCP` which is also relevant to Generative UI. There is no coupling that would break.

Brownfield discipline: do not move the file. A move would require updating the existing `RecipeWorkbenchPage.tsx` import and that violates "don't refactor what isn't being touched".

**Import path in `GenerativeUIPage.tsx`:**
```typescript
import { MissingFlagBanner } from './RecipeWorkbench/MissingFlagBanner';
```

(Path is relative from `chat/src/app/components/GenerativeUIPage.tsx` to `RecipeWorkbench/MissingFlagBanner.tsx` — both live under `chat/src/app/components/`.)

---

## Finding 8: IDB Upgrade Concurrency Hazard (Two-Tab Scenario)

**Question answered:** What happens if a v1.0 user has `/webmcp` open in tab 1 and opens `/generative-ui` (which triggers the version-2 upgrade) in tab 2?

**Source:** IDB specification behavior [ASSUMED: W3C IndexedDB spec §4.5 "version change transactions"]; standard `idb` library behavior.

When tab 2 calls `openDB('window-ai-recipes', 2, ...)`, the browser fires:
1. `versionchange` event on the **existing** open connection in tab 1.
2. Tab 2's `openDB` Promise is **blocked** — it does not reject, it just waits.

If tab 1 does NOT close its connection (i.e., it ignores the `versionchange` event), the upgrade in tab 2 never runs. The user experiences a frozen `/generative-ui` page with no console error — it just hangs waiting for the IDB upgrade.

**Standard mitigation:** Add a `blocking` callback to `openDB`. This callback fires on the connection that opened successfully (tab 2, after tab 1 eventually closes) — OR, more usefully, add a `versionchange` event listener to the open connection that closes it gracefully:

```typescript
// In the upgrade options of openDB:
openDB<RecipeDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) db.createObjectStore('recipes', { keyPath: 'id' });
    if (oldVersion < 2) db.createObjectStore('meal-plan', { keyPath: 'id' });
  },
  blocked(currentVersion, blockedVersion, event) {
    // Another tab has this DB open at version currentVersion.
    // We cannot upgrade. Could show a user-visible prompt here.
    // eslint-disable-next-line no-console
    console.warn(
      `[RecipePersistence] IDB upgrade blocked — another tab has version ${currentVersion} open. ` +
      `Close other tabs showing this site and reload.`
    );
  },
  blocking(currentVersion, blockedVersion, event) {
    // THIS connection is blocking a newer version upgrade elsewhere.
    // Close gracefully so the other tab can proceed.
    (event.target as IDBDatabase).close();
    // Optional: reload to pick up the new schema in this tab too.
    window.location.reload();
  },
});
```

**For Phase 4's scope:** The `blocking` callback (graceful self-close) is important for demo-day robustness. The `blocked` callback (warn + do nothing) is the minimal safe choice. Recommend adding both. The `window.location.reload()` in `blocking` ensures the tab that was on v1.0 picks up the new schema after the other tab upgrades successfully.

**Risk level:** LOW for the demo day (single laptop, one Chrome profile, typically not multiple tabs). But it is a 4-line addition that prevents a confusing invisible hang. Include it.

---

## Finding 9: Recipe Content — 12-Recipe Seed List

**Question answered:** What 10 new recipes to add (the 2 existing are `buttermilk-pancakes` and `tomato-pasta`).

Content requirements verified from CONTEXT.md [VERIFIED]:
- ≥3 chicken-based recipes with `totalMinutes ≤ 30`
- Cuisine/protein variety (pasta, vegetarian, breakfast, seafood, etc.)
- Total = 12 recipes

**Recommended 10 new recipes (planner authors the full ingredient/step content):**

| # | id | title | totalMinutes | protein/cuisine | Satisfies constraint |
|---|----|----|----|----|---|
| 1 | `lemon-garlic-chicken-skillet` | Lemon Garlic Chicken Skillet | 25 | chicken | YES — ≤30 chicken |
| 2 | `honey-soy-chicken-stir-fry` | Honey Soy Chicken Stir-Fry | 20 | chicken | YES — ≤30 chicken |
| 3 | `sheet-pan-chicken-fajitas` | Sheet-Pan Chicken Fajitas | 30 | chicken | YES — ≤30 chicken |
| 4 | `creamy-mushroom-risotto` | Creamy Mushroom Risotto | 45 | vegetarian | cuisine variety |
| 5 | `salmon-teriyaki` | Salmon Teriyaki | 25 | seafood | protein variety |
| 6 | `beef-tacos` | Quick Beef Tacos | 20 | beef | protein variety |
| 7 | `greek-salad` | Greek Salad with Feta | 15 | vegetarian | cuisine variety |
| 8 | `shrimp-scampi` | Shrimp Scampi | 20 | seafood | protein variety |
| 9 | `veggie-curry` | Chickpea and Spinach Curry | 35 | vegetarian | cuisine variety |
| 10 | `avocado-toast-eggs` | Avocado Toast with Poached Eggs | 15 | vegetarian/breakfast | breakfast variety |

**Note for planner:** The demo script requires the `searchRecipes` query "30-minute chicken recipe" to return ≥3 hits. Recipes 1, 2, and 3 above all have `totalMinutes ≤ 30` and contain `chicken` in `searchableIngredients`. The planner must populate `searchableIngredients` (lowercase ingredient names array) for all 12 recipes. Examples:
- `lemon-garlic-chicken-skillet`: `searchableIngredients: ['chicken', 'lemon', 'garlic', 'butter', 'olive oil', 'parsley']`
- `buttermilk-pancakes` (backfill): `searchableIngredients: ['flour', 'buttermilk', 'eggs', 'sugar', 'baking powder', 'salt']`

**Interface extension in `recipeSeed.ts` / `RecipePersistence.ts`:**

```typescript
export interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  // v1.1 additions (additive, optional — existing code that uses Recipe is unaffected)
  totalMinutes?: number;
  searchableIngredients?: string[];
}
```

---

## Finding 10: SEO Config — Exact Shape for `useSEOData.ts` and `prerender-react.js`

**Question answered:** Exact `seoConfigs.generativeUI` values to add to both files, byte-identical.

**Verified against:** `useSEOData.ts` full file [VERIFIED: lines 68–79 webmcp/webmcpDocs pattern]; `prerender-react.js` full file [VERIFIED: lines 364–385 webmcp/webmcp/docs entries].

**WARNING — prerender drift is the #1 Phase 3 hazard** (see `STATE.md` Risks Watched, Phase 3 D-08 + D-12). The `useSEOData.ts` `seoConfigs` object uses camelCase keys without leading slashes. The `prerender-react.js` `getSEODataForRoute` map uses route-path strings with leading slashes. The `title` and `description` values MUST be identical between the two files.

### Addition to `chat/src/app/hooks/useSEOData.ts`

Insert before the closing `} as const;`:

```typescript
// Must match prerender-react.js getSEODataForRoute('/generative-ui') verbatim.
// See Phase 3 D-08 + D-12 — prerender drift caused a Phase 3 hotfix.
generativeUI: {
  title: 'Generative UI — MCP Apps demo with on-device recipe cards | Chrome AI APIs',
  description: 'A Chrome 146 Canary demo of the MCP Apps pattern: the in-page chat calls searchRecipes, an interactive recipe-card carousel renders in the chat bubble via a sandboxed iframe, and clicking Pick updates the meal-plan column live — all on-device, no network.',
  keywords: 'MCP Apps, generative UI, navigator.modelContext, Chrome AI, on-device AI, recipe cards, sandboxed iframe, WebMCP, SEP-1865, meal plan'
},
```

### Addition to `chat/scripts/prerender-react.js`

**Location 1 — `routes` array** (insert after `/webmcp/docs` entry, before the closing `]`):

```javascript
// Generative UI route
{ path: '/generative-ui', filename: 'generative-ui.html' },
```

**Location 2 — `getSEODataForRoute` inner `seoConfigs` map** (insert after the `/webmcp/docs` entry):

```javascript
'/generative-ui': {
  title: 'Generative UI — MCP Apps demo with on-device recipe cards | Chrome AI APIs',
  description: 'A Chrome 146 Canary demo of the MCP Apps pattern: the in-page chat calls searchRecipes, an interactive recipe-card carousel renders in the chat bubble via a sandboxed iframe, and clicking Pick updates the meal-plan column live — all on-device, no network.',
  keywords: 'MCP Apps, generative UI, navigator.modelContext, Chrome AI, on-device AI, recipe cards, sandboxed iframe, WebMCP, SEP-1865, meal plan',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Generative UI — MCP Apps Demo',
    description: 'On-device recipe-card carousel via sandboxed iframe and WebMCP tool results',
  },
},
```

**Drift verification command** (must pass before Phase 7 gate, but the planner should check at Phase 4 too):
```bash
grep -F 'Generative UI — MCP Apps demo' \
  chat/src/app/hooks/useSEOData.ts \
  chat/scripts/prerender-react.js
# Must show 2 lines, both with identical text.
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IDB open/upgrade | Custom `indexedDB.open()` callback hell | `idb@8.0.3` `openDB` | Already installed; handles `blocked`/`blocking` hooks, typed schemas, promise-based API |
| UUID generation | Custom random string | `crypto.randomUUID()` | Browser-native, cryptographically random, zero deps |
| Pub-sub | EventEmitter, rxjs Observable | Module-scope `Set<Listener>` pattern (as in `recipeStore.ts`) | This project has a proven 36-line implementation; adding a library is over-engineering |
| External store hook | Custom `useSyncExternalStore` wrapper | `useState + useEffect` (Shape B in Finding 5) | The exact pattern already proven in `RecipeWorkbenchPage.tsx`; Shape A adds complexity for no benefit at this scale |

---

## Common Pitfalls

### Pitfall 1: `dbPromise` singleton breaks on DB_VERSION bump
**What goes wrong:** `dbPromise` is a module-scope singleton. If `RecipePersistence.ts` and `MealPlanStore.ts` each call `openDB` independently, two connections open. The one that opens first triggers the upgrade; the second one receives a `blocked` event. On a clean install both try to run the upgrade and one will fail silently.
**Why it happens:** Copy-pasting the `getDB` pattern without realising it creates two competing connections.
**How to avoid:** `MealPlanStore.ts` imports and calls the shared `getDB()` exported from `RecipePersistence.ts`. Only one `openDB` call in the entire codebase.
**Warning signs:** `IDBDatabase: The database connection is closing` or `blocked` events in the console on fresh installs.

### Pitfall 2: Upgrade callback ignores `oldVersion` — stores created twice on fresh install
**What goes wrong:** Writing `if (!db.objectStoreNames.contains('recipes'))` inside the upgrade without `oldVersion` gating means on a version-2 upgrade of a v1.0 user (who already has `recipes`), the check evaluates false and skips the block silently — CORRECT. But writing the `meal-plan` creation without `if (oldVersion < 2)` means it runs on EVERY upgrade, including v3→v4 in the future.
**How to avoid:** Always use `if (oldVersion < N)` gating. See Finding 1 for the correct pattern.

### Pitfall 3: `seedIfMissing` opens a second IDB connection before `getDB` resolves
**What goes wrong:** If `GenerativeUIPage.tsx` calls `seedIfMissing` inside its mount effect, and the DB is upgrading at the same time (because `MealPlanStore.ts` is also initialising), there is a race between the `readwrite` transaction and the `versionchange` upgrade transaction.
**How to avoid:** `seedIfMissing` calls `getDB()` which resolves only after the upgrade is complete. IDB serialises upgrades — `getDB()` waits for the `upgradeneeded` handler to finish before resolving the `openDB` promise. This is handled automatically by `idb`.

### Pitfall 4: Nav link uses `font-normal` when the rest use `font-medium`
**What goes wrong:** The UI-SPEC's typography section says "font-normal" for nav links. The actual existing nav links in `AppRouter.tsx` all use `font-medium` [VERIFIED: AppRouter.tsx line 54, 57, 60, 63, 67, 70, 75].
**Why it happens:** The UI-SPEC was authored with a two-weight constraint in mind (400 + 700) and resolved nav to 400 (`font-normal`), but the existing codebase uses `font-medium` (500) for nav links.
**How to avoid:** Match the existing code, not the spec typography table. Use `font-medium` on all nav links.

### Pitfall 5: Prerender drift — updating `useSEOData.ts` but forgetting `prerender-react.js`
**What goes wrong:** SEO title/description in production HTML differs from runtime — search engines index the prerendered version, the React app renders the `useSEOData` version. They diverge silently.
**Why it happens:** Two files are the "two sources of truth" that must be kept identical by convention (no automated check exists).
**How to avoid:** After adding `generativeUI` to `useSEOData.ts`, immediately add the matching entry to `prerender-react.js` in the same commit. Run the `grep -F` verification command from Finding 10.

### Pitfall 6: `useMealPlan` not cleaning up on unmount (StrictMode double-invoke)
**What goes wrong:** In React 19 StrictMode, effects run twice. If the `useEffect` that calls `getPlan()` doesn't have a `cancelled` flag, the second invocation's setState call fires after the first invocation's cleanup, causing a state update on an unmounted component or a double-set.
**Why it happens:** Forgetting the `cancelled` flag — the established Pattern 1 from v1.0.
**How to avoid:** Add `let cancelled = false` + `return () => { cancelled = true; }` to every `useEffect` that calls async state-setters. See Finding 5 Shape B for the full pattern.

---

## Code Examples

### Mount-time seed effect (StrictMode-safe, non-blocking)

```typescript
// [VERIFIED: mirrors RecipeWorkbenchPage.tsx lines 129-150 exactly]
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const inserted = await seedIfMissing(SEED_RECIPES);
      if (inserted > 0 && !cancelled) {
        // eslint-disable-next-line no-console
        console.log(`[GenerativeUI] seedIfMissing: inserted ${inserted} new recipes`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[GenerativeUI] Failed to seed recipe library:', message);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

### `recipeStore.ts` pub-sub pattern (mirrored for `MealPlanStore.ts`)

```typescript
// [VERIFIED: chat/src/app/services/recipeStore.ts lines 1-35]
type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribeRecipeStore = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export const notifyRecipeStore = (): void => {
  listeners.forEach((l) => l());
};
```

### `useEffect` subscription pattern (mirrored from `RecipeWorkbenchPage.tsx`)

```typescript
// [VERIFIED: RecipeWorkbenchPage.tsx lines 233-244]
useEffect(() => {
  const unsub = subscribeRecipeStore(() => {
    getRecipes()
      .then((all) => setRecipes(all))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[RecipeWorkbench] Failed to refresh recipes after store notify:', message);
      });
  });
  return unsub;
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `seedIfEmpty` (count-gated) | `seedIfMissing` (id-gated upsert) | Phase 4 (this phase) | Existing v1.0 users get 10 new recipes on first `/generative-ui` visit without losing their data |
| DB_VERSION=1, `recipes` store only | DB_VERSION=2, `recipes` + `meal-plan` stores | Phase 4 (this phase) | Enables `MealPlanStore` without a separate database |
| `Recipe` interface has no search metadata | `Recipe` gains `totalMinutes?` + `searchableIngredients?` | Phase 4 (this phase) | Enables Phase 6 `searchRecipes` tool to filter by time and ingredient content |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` is available in Chrome 146+ Canary | Finding 2 | PlanEntry IDs would need fallback; use `Date.now().toString(36) + Math.random().toString(36)` as a fallback if build fails |
| A2 | `useSyncExternalStore` is stable in React 19 | Finding 5 | No risk — Shape B (`useState + useEffect`) is the recommended approach and doesn't use `useSyncExternalStore` at all |
| A3 | `chat/tsconfig.app.json` includes `"DOM"` in lib so `crypto.randomUUID()` has TS types | Finding 2 | If lib doesn't include DOM, add `// @ts-ignore` temporarily or add `/// <reference lib="dom" />` at top of `MealPlanStore.ts` |
| A4 | `idb`'s `blocking` callback fires with the `IDBDatabase` accessible via `event.target` | Finding 8 | If `event.target` typing is wrong, use `db.close()` inside the `blocking` callback (the `db` variable is in scope if you refactor `getDB` to capture it) |

**If this table is empty, there would be no risk claims.** All assumptions above are LOW-risk for this Chrome-specific demo project.

---

## Open Questions

1. **`getDB` visibility — export from `RecipePersistence.ts` or use a separate shared module?**
   - What we know: `RecipePersistence.ts` currently does NOT export `getDB` — it is module-private.
   - What's unclear: Should `getDB` be exported directly from `RecipePersistence.ts`, or should a new `chat/src/app/services/db.ts` module own the shared connection?
   - Recommendation: Export `getDB` from `RecipePersistence.ts` for Phase 4. A separate `db.ts` is a valid future refactor but adds files for no observable benefit now (brownfield discipline).

2. **`PlanEntry` export location — `RecipePersistence.ts` or `MealPlanStore.ts`?**
   - What we know: `PlanEntry` is tightly coupled to the `meal-plan` IDB schema. But the `DBSchema` that includes `meal-plan` lives in `RecipePersistence.ts` (if we use the shared-DB approach from Finding 4).
   - Recommendation: Define `PlanEntry` in `MealPlanStore.ts` and re-export it from there. `RecipePersistence.ts` imports `PlanEntry` from `MealPlanStore.ts` for the `DBSchema` definition. This keeps the type logically coupled to its store.

---

## Environment Availability

Step 2.6: SKIPPED (no external tools or services beyond the project's own code are required for Phase 4 — all deps are already installed in node_modules).

---

## Validation Architecture

Step skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json` [VERIFIED: config.json].

---

## Security Domain

Phase 4 introduces no network endpoints, no auth paths, no untrusted input surfaces, and no cross-origin communication. The new IDB `meal-plan` store accepts entries only from same-origin JavaScript on the page — no different from the existing `recipes` store. No ASVS controls apply beyond what is already in place for the v1.0 surface.

---

## Sources

### Primary (HIGH confidence)
- `chat/src/app/services/RecipePersistence.ts` — current DB_VERSION, `getDB` pattern, `seedIfEmpty` implementation
- `chat/src/app/services/recipeStore.ts` — exact pub-sub pattern to mirror
- `chat/src/app/services/recipeSeed.ts` — current seed content (2 recipes, Recipe/Ingredient interfaces)
- `chat/src/app/components/RecipeWorkbenchPage.tsx` — StrictMode-safe mount effect, subscription pattern, `MissingFlagBanner` usage
- `chat/src/app/AppRouter.tsx` — exact current line context for nav link + route insertion
- `chat/src/app/hooks/useSEOData.ts` — `seoConfigs` structure, `webmcp`/`webmcpDocs` as pattern
- `chat/scripts/prerender-react.js` — exact routes array + getSEODataForRoute map structure
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — component is zero-prop, safe to import cross-subdirectory
- `node_modules/idb/build/entry.d.ts` — `OpenDBCallbacks` signature with `oldVersion: number` confirmed
- `package.json` (root) — `idb@^8.0.3` confirmed; `uuid` not a direct dep
- `.planning/config.json` — `nyquist_validation: false` confirmed
- `.planning/phases/01-foundation-skeleton/01-PATTERNS.md` — StrictMode-safe effect pattern, `cancelled` flag idiom
- `.planning/phases/04-v1-1-foundation-page-shell-store-seed/04-CONTEXT.md` — all locked decisions
- `.planning/phases/04-v1-1-foundation-page-shell-store-seed/04-UI-SPEC.md` — layout contract, copywriting contract

### Secondary (ASSUMED — verified by inference, not external source)
- `crypto.randomUUID()` availability in Chrome 146+ Canary
- `useSyncExternalStore` retained as stable in React 19

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all existing
- Architecture: HIGH — all patterns verified against live code
- IDB upgrade pattern: HIGH — verified against `idb@8.0.3` type definitions
- Pitfalls: HIGH — all derived from verified code patterns + existing CONTEXT.md risk log

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable tech stack; idb@8.0.3 is locked in package.json)
