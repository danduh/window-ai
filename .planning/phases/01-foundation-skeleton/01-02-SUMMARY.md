---
phase: 01-foundation-skeleton
plan: 02
subsystem: ui-shell
tags: [webmcp, react-page, ui, banner, picker, ingredients, tailwind, dark-mode]
dependency_graph:
  requires:
    - chat/src/app/services/RecipePersistence.ts (Plan 01 — Recipe CRUD + interfaces)
    - chat/src/app/services/recipeSeed.ts (Plan 01 — SEED_RECIPES)
    - chat/src/app/types/webmcp.d.ts (Plan 01 — Navigator.modelContext ambient types)
  provides:
    - chat/src/app/components/RecipeWorkbenchPage.tsx (page shell + WorkbenchPanel + Tabs)
    - chat/src/app/components/RecipeWorkbench/RecipePicker.tsx
    - chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx
    - chat/src/app/components/RecipeWorkbench/IngredientsList.tsx
    - chat/src/app/components/RecipeWorkbench/StepsList.tsx
    - chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx
  affects:
    - chat/src/app/types/webmcp.d.ts (added export {} to fix declare global in module context)
tech_stack:
  added: []
  patterns:
    - Canonical demo-page shell (min-h-screen / max-w-6xl / header + ThemeToggle + Tabs) mirroring Summary.tsx
    - Segmented vertical picker buttons with aria-pressed (from WriteRewritePage.tsx pattern)
    - IndexedDB mount effect: seedIfEmpty -> getRecipes with cancelled-flag StrictMode safety
    - Conditional banner on !navigator.modelContext (inline feature detection per UI-SPEC)
    - Tabs docs-before-workbench ordering to fix currentPath.includes(tab.path) resolution
key_files:
  created:
    - chat/src/app/components/RecipeWorkbenchPage.tsx
    - chat/src/app/components/RecipeWorkbench/RecipePicker.tsx
    - chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx
    - chat/src/app/components/RecipeWorkbench/IngredientsList.tsx
    - chat/src/app/components/RecipeWorkbench/StepsList.tsx
    - chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx
  modified:
    - chat/src/app/types/webmcp.d.ts (added export {})
decisions:
  - "webmcp.d.ts required export {} to be treated as a module so declare global {} is valid — plain script mode rejects declare global augmentations per TS2669"
  - "Tabs array lists docs tab BEFORE workbench so /webmcp/docs path wins the currentPath.includes(tab.path) find() over the workbench empty-string path"
  - "useSEOData intentionally omitted from RecipeWorkbenchPage — Plan 03 adds it together with the seoConfigs.webmcp entry to avoid a Wave-3 dependency in Wave-2 build"
  - "WorkbenchPanel extracted as a named inner component (not an anonymous JSX block) to keep the useMemo tabs array legible"
metrics:
  duration_seconds: 720
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_changed: 7
---

# Phase 01 Plan 02: RecipeWorkbench UI Shell Summary

**One-liner:** Five RecipeWorkbench sub-components (RecipePicker, RecipeHeader, IngredientsList, StepsList, MissingFlagBanner) plus a RecipeWorkbenchPage shell wiring IndexedDB mount-time seed/load to a Tabs+WorkbenchPanel layout with conditional WebMCP flag banner.

## What Was Built

### File Tree: RecipeWorkbench/ Directory

```
chat/src/app/components/
├── RecipeWorkbenchPage.tsx          ← page component (new)
└── RecipeWorkbench/
    ├── RecipePicker.tsx             ← segmented vertical buttons (new)
    ├── RecipeHeader.tsx             ← title + servings card (new)
    ├── IngredientsList.tsx          ← ingredients <ul> card (new)
    ├── StepsList.tsx                ← steps <ol> card (new)
    └── MissingFlagBanner.tsx        ← yellow WebMCP flag alert (new)
```

### Props Interfaces

**RecipePicker**
```tsx
interface RecipePickerProps {
  recipes: Recipe[];           // full Recipe objects for button labels
  activeId: string | null;     // which button gets bg-primary-600 + aria-pressed=true
  onSelect: (id: string) => void;
}
```

**RecipeHeader**
```tsx
interface RecipeHeaderProps {
  title: string;    // rendered as <h2 className="text-xl font-semibold">
  servings: number; // rendered as "Serves {n}" in Label role (text-sm font-medium)
}
```

**IngredientsList**
```tsx
interface IngredientsListProps {
  ingredients: Ingredient[];  // {name, quantity, unit} — rendered as "{quantity} {unit} {name}"
}
```

**StepsList**
```tsx
interface StepsListProps {
  steps: string[];  // ordered list via <ol list-decimal list-inside>
}
```

**MissingFlagBanner** — no props (self-contained copy from UI-SPEC §Copywriting)

### Page State Model

```tsx
const [recipes, setRecipes]   = useState<Recipe[]>([]);    // from getRecipes() at mount
const [activeId, setActiveId] = useState<string | null>(null);  // first recipe's id after load
const [loading, setLoading]   = useState<boolean>(true);   // cleared in useEffect finally
```

### Mount-Effect Behavior

```
1. cancelled = false
2. await seedIfEmpty(SEED_RECIPES)  — count-gated; no-op if store already has records
3. const all = await getRecipes()   — loads all recipes from IndexedDB
4. if (cancelled) return            — StrictMode safety: ignore second invocation result
5. setRecipes(all)                  — populates picker
6. setActiveId(all[0]?.id ?? null)  — selects first recipe by default
7. finally: if (!cancelled) setLoading(false)
8. cleanup: () => { cancelled = true }
```

### Deferred: useSEOData call

`RecipeWorkbenchPage.tsx` intentionally does NOT call `useSEOData(seoConfigs.webmcp, '/webmcp')`. Plan 03 adds this line together with:
- The `webmcp` key in `seoConfigs` object (useSEOData.ts)
- The route registration in AppRouter.tsx
- The nav link additions in AppRouter.tsx
- The prerender-react.js route entries

This prevents Plan 02 from referencing a key that only exists after Plan 03 ships.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0359aa4 | feat(01-02): build RecipeWorkbench sub-components |
| 2 | cd9b614 | feat(01-02): build RecipeWorkbenchPage with mount-time seed/load and Tabs shell |

## Verification Results

All plan verification checks passed:

1. Directory `chat/src/app/components/RecipeWorkbench/` exists with 5 `.tsx` files — PASS
2. RecipePicker: exports, aria-pressed, bg-primary-600, dark variants — PASS
3. RecipeHeader: exports, `<h2>`, `Serves {servings}`, dark variants — PASS
4. IngredientsList: exports, `<ul>`, quantity/unit/name format, empty state, dark variants — PASS
5. StepsList: exports, `<ol>`, list-decimal list-inside, empty state, dark variants — PASS
6. MissingFlagBanner: exports, bg-yellow-50/dark:bg-yellow-900/20, Chrome 146+ Canary, chrome://flags/#WebMCP, role="status", aria-hidden on SVG — PASS
7. No `as any` in RecipeWorkbench/ — PASS
8. No `dangerouslySetInnerHTML` in RecipeWorkbench/ — PASS
9. RecipeWorkbenchPage: named + default export, all imports, seedIfEmpty, getRecipes, banner check, H1 text, subtitle, shell classes, gradient, cancelled flag, basePath, defaultTab, no useSEOData — PASS
10. `npx nx build chat` exits 0 — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] webmcp.d.ts declare global invalid in script-mode file**

- **Found during:** Task 2 (first build attempt after writing RecipeWorkbenchPage.tsx)
- **Issue:** `npx nx build chat` emitted `TS2339: Property 'modelContext' does not exist on type 'Navigator'`. The webmcp.d.ts file used `declare global { interface Navigator { ... } }` but was treated as a TypeScript script (no imports/exports). Per TS2669, `declare global` augmentations are only valid inside external modules or ambient module declarations — not in plain script files. The file was compiled but the augmentation was silently rejected.
- **Fix:** Added `export {}` at the end of `chat/src/app/types/webmcp.d.ts`. This converts the file from a script to a module, making the `declare global { }` wrapper valid. TypeScript now correctly merges the `modelContext` property into the global `Navigator` interface.
- **Files modified:** `chat/src/app/types/webmcp.d.ts` (+1 line)
- **Commit:** cd9b614 (included in the Task 2 commit — same fix, same build gate)
- **Note:** The plan documentation (01-PATTERNS.md) explicitly predicted this exact error: "Verify by running `npx nx build chat` — TS will emit 'Property 'modelContext' does not exist on type 'Navigator'' if the file isn't picked up." The fix (export {}) was also documented as an option in the same note. Applied per deviation Rule 1 (broken behavior).

## Known Stubs

None. All rendered content is wired to real data from IndexedDB (via `getRecipes()` after `seedIfEmpty()`). Loading state copy (`Loading your recipes…`) and empty state copy (`No recipes yet. Reload the page to seed the demo recipes.`) are defensive fallbacks that should never appear with correctly seeded data — not stubs.

The one deliberate placeholder is the Docs tab content (`Documentation coming in Phase 3 — see WebMCP-API.md`), which is intentional per the plan and explicitly noted as a Phase 3 deliverable in REQUIREMENTS.md (DOCS-01).

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced. All surfaces are read-only browser-side (IndexedDB read + React state + `navigator.modelContext` read-only check). Within the plan's documented threat model (T-01-02-01 through T-01-02-05), all `mitigate` items were addressed:
- T-01-02-01 (XSS): No `dangerouslySetInnerHTML`, all recipe strings through JSX text nodes
- T-01-02-02 (error logging): Only `err.message` logged, not stack trace
- T-01-02-03 (StrictMode double-invoke): `cancelled` flag + count-gated `seedIfEmpty` both present

## Self-Check: PASSED

- `chat/src/app/components/RecipeWorkbenchPage.tsx` — FOUND
- `chat/src/app/components/RecipeWorkbench/RecipePicker.tsx` — FOUND
- `chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx` — FOUND
- `chat/src/app/components/RecipeWorkbench/IngredientsList.tsx` — FOUND
- `chat/src/app/components/RecipeWorkbench/StepsList.tsx` — FOUND
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — FOUND
- `chat/src/app/types/webmcp.d.ts` (modified) — FOUND
- Commit `0359aa4` (Task 1) — FOUND
- Commit `cd9b614` (Task 2) — FOUND
- `npx nx build chat` exits 0 — VERIFIED
