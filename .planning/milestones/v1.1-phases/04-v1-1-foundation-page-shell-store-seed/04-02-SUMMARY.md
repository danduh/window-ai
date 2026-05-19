---
phase: 04-v1-1-foundation-page-shell-store-seed
plan: "02"
subsystem: ui-shell
tags: [routing, react, ui, seo, prerender, brownfield, tailwind, dark-mode, generative-ui]
dependency_graph:
  requires:
    - "04-01: RecipePersistence v2 (seedIfMissing, PlanEntry), MealPlanStore, useMealPlan hook, 12-recipe SEED_RECIPES"
  provides:
    - "/generative-ui route registered in AppRouter.tsx with desktop + mobile nav links"
    - "GenerativeUIPage.tsx: top-level page component with banner + two-column shell + mount-time seedIfMissing"
    - "GenerativeUIHeader.tsx: page title + tagline + primary-500 gradient icon block"
    - "ChatPlaceholder.tsx: static left-column empty-state"
    - "MealPlanColumn.tsx: right column calling useMealPlan() with loading/empty/populated states"
    - "seoConfigs.generativeUI entry in useSEOData.ts (byte-identical to prerender-react.js)"
    - "/generative-ui route + seoConfigs entry in prerender-react.js"
  affects:
    - "chat/src/app/AppRouter.tsx"
    - "chat/src/app/hooks/useSEOData.ts"
    - "chat/scripts/prerender-react.js"
tech_stack:
  added: []
  patterns:
    - "StrictMode-safe mount-time seed effect (cancelled flag, async IIFE)"
    - "Two-column flex layout: flex-col lg:flex-row with lg:w-80 right column"
    - "Conditional banner render: !navigator.modelContext && <MissingFlagBanner />"
    - "Byte-identical SEO dual-write (useSEOData.ts + prerender-react.js)"
key_files:
  created:
    - "chat/src/app/components/GenerativeUI/GenerativeUIHeader.tsx"
    - "chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx"
    - "chat/src/app/components/GenerativeUI/MealPlanColumn.tsx"
    - "chat/src/app/components/GenerativeUIPage.tsx"
  modified:
    - "chat/src/app/AppRouter.tsx"
    - "chat/src/app/hooks/useSEOData.ts"
    - "chat/scripts/prerender-react.js"
decisions:
  - "seoConfigs.generativeUI added in Task 2 commit (not Task 4) to unblock typecheck — same commit also includes GenerativeUIPage.tsx"
  - "GenerativeUIPage.tsx uses !navigator.modelContext directly (matches RecipeWorkbenchPage.tsx line 315 pattern) rather than deriving hasModelContext variable"
  - "Removed unused eslint-disable-next-line no-console directives — same Rule 1 deviation as Plan 04-01 (no-console not configured in this project)"
  - "Used font-medium (not font-normal) per RESEARCH.md Pitfall 4 — matches existing nav link style"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-19"
  tasks_completed: 4
  files_modified: 7
---

# Phase 04 Plan 02: v1.1 Foundation — Page Shell, Route, SEO

**One-liner:** `/generative-ui` page shell with two-column layout, MissingFlagBanner, mount-time IDB seed, MealPlanColumn wired to useMealPlan(), and byte-identical SEO dual-write across useSEOData.ts and prerender-react.js.

## What Was Built

Plan 04-02 delivers the visible tracer-bullet skeleton for the Generative UI milestone. Four files created, three edited. All v1.0 routes and demos remain untouched.

### Worktree Initialization

The agent worktree was behind main (at `f454625`). A fast-forward `git merge main` brought in Plan 04-01 work (commits `ca5877e` through `4e8b85f`) before any implementation began. This is normal parallel-agent behavior — the orchestrator spawned this agent before Plan 04-01 committed.

### Task 1: Three GenerativeUI subcomponents (commit `9908d91`)

- **GenerativeUIHeader.tsx**: `<header>` with flex row, gradient icon block (`from-primary-500 to-purple-600`, chat SVG icon), `<h1>` "Generative UI" + `<p>` tagline. Named export, no props.
- **ChatPlaceholder.tsx**: Static card with `min-h-[400px]`, chat bubble SVG, heading + body from locked UI-SPEC copy. No interactivity.
- **MealPlanColumn.tsx**: Calls `useMealPlan()`, renders three branches — `loading` spinner text, empty-state with clipboard SVG + "Your meal plan is empty" copy, and a `<ul>` for populated entries keyed by `entry.id`.

### Task 2: GenerativeUIPage.tsx (commit `5826085`)

- Calls `useSEOData(seoConfigs.generativeUI)` at top.
- Mount-time `useEffect` calls `seedIfMissing(SEED_RECIPES)` with `cancelled` flag (StrictMode-safe, mirrors RecipeWorkbenchPage.tsx:129-150 pattern).
- Renders: `{!navigator.modelContext && <MissingFlagBanner />}` + `<GenerativeUIHeader />` + two-column `flex flex-col lg:flex-row gap-6` wrapper.
- Left: `flex-1 min-w-0` wrapping `<ChatPlaceholder />`. Right: `lg:w-80 flex-shrink-0` wrapping `<MealPlanColumn />`.
- **Deviation**: `seoConfigs.generativeUI` added to `useSEOData.ts` in this commit to unblock typecheck (Task 4 was planned to add it, but typecheck fails without it).

### Task 3: AppRouter.tsx wiring (commit `049fbcb`)

- Import: `import {GenerativeUIPage} from "./components/GenerativeUIPage";` at line 11.
- Desktop nav link at line 74 (after WebMCP line 70, before Writer line 78): `font-medium`, `trackUserInteraction('navigation_click', 'generative_ui_link')`.
- Mobile nav link at line 167 (after WebMCP mobile line 160, before Writer mobile line 171): adds `block` prefix, `text-base`, `trackUserInteraction('navigation_click', 'generative_ui_link_mobile')`.
- Route at line 243: `<Route path="/generative-ui" element={<GenerativeUIPage/>}/>` (after `/webmcp/docs` block).
- Catch-all `<Route path="*">` remains last at line 247.

### Task 4: SEO dual-write (commit `89b3aa6`)

- `prerender-react.js` routes array: `{ path: '/generative-ui', filename: 'generative-ui.html' }` (after `/webmcp/docs`).
- `prerender-react.js` seoConfigs map: `/generative-ui` entry with `structuredData` (`@type: WebPage`).
- Drift gate: `grep -F 'Generative UI — MCP Apps demo with on-device recipe cards | Chrome AI APIs'` returns 2 lines (one per file).
- Drift gate: description and keywords also return 2 lines each.

### Fix: ESLint unused directives (commit `faa7164`)

Removed two `// eslint-disable-next-line no-console` comments from `GenerativeUIPage.tsx`. Same Rule 1 deviation as Plan 04-01 — no-console rule is not configured in the project's ESLint setup. Console calls remain (they are intentional debug/seed logs).

## AppRouter Insertion Points (Post-Edit Line Numbers)

| Element | Line | Insertion point |
|---------|------|-----------------|
| `import {GenerativeUIPage}` | 11 | After `{RecipeWorkbenchPage}` import |
| Desktop nav `<Link to="/generative-ui">` | 74 | After WebMCP (line 70), before Writer (line 78) |
| Mobile nav `<Link to="/generative-ui">` | 167 | After WebMCP mobile (line 160), before Writer mobile (line 171) |
| `<Route path="/generative-ui">` | 243 | After `/webmcp/docs` route, before Writer routes comment |

## Drift Gate Verification

```
grep -F 'Generative UI — MCP Apps demo with on-device recipe cards | Chrome AI APIs' \
  chat/src/app/hooks/useSEOData.ts chat/scripts/prerender-react.js
```
Output: **2 lines** (one per file). Title, description, and keywords all match byte-for-byte.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] seoConfigs.generativeUI added in Task 2 to unblock typecheck**
- **Found during:** Task 2 — `GenerativeUIPage.tsx` references `seoConfigs.generativeUI` which TypeScript couldn't resolve until the entry was added to `useSEOData.ts`
- **Issue:** Plan ordered `seoConfigs.generativeUI` addition to Task 4, but TypeScript strict mode rejects the reference at compile time in Task 2
- **Fix:** Added `generativeUI:` entry to `useSEOData.ts` as part of the Task 2 commit; Task 4 then completed the prerender-react.js mirror
- **Files modified:** `chat/src/app/hooks/useSEOData.ts`
- **Commit:** `5826085`

**2. [Rule 1 - Bug] Removed unused eslint-disable directives in GenerativeUIPage.tsx**
- **Found during:** ESLint run post Task 4
- **Issue:** The plan's task description included `// eslint-disable-next-line no-console` comments. But per Plan 04-01 deviation, `no-console` is not in the project's ESLint config — the directives generate "unused directive" warnings
- **Fix:** Removed 2 disable comments; console calls remain
- **Files modified:** `chat/src/app/components/GenerativeUIPage.tsx`
- **Commit:** `faa7164`

## Known Stubs

None. The "Chat coming in a future phase" copy in ChatPlaceholder is intentional per UI-SPEC (locked copy, not a stub). `useMealPlan()` is wired to real IDB data and will re-render when Phase 6 adds entries.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or cross-origin communication. The `/generative-ui` page reads from the existing IndexedDB `window-ai-recipes` database (same origin, established in Plan 04-01). No new trust boundaries.

## Notes for Phases 5, 6, 7

- **Phase 5 (iframe bridge):** `GenerativeUIPage.tsx` has no iframe yet. Phase 5 should render the iframe inside the `ChatPlaceholder`'s area (replace or wrap `<ChatPlaceholder />`).
- **Phase 6 (chat + tools):** The banner gate uses `!navigator.modelContext` directly — reuse this pattern rather than reimplementing. `MealPlanColumn` is already subscribed to `useMealPlan()`; Phase 6's `commitRecipeToPlan` calling `MealPlanStore.addToPlan` will automatically re-render the column with no component changes needed.
- **Phase 7 (docs route):** `/generative-ui/docs` is NOT registered — add it in Phase 7 following the same `RecipeWorkbenchPage` docs-tab pattern. The SEO config for docs will need another dual-write (useSEOData.ts + prerender-react.js).
- **`seoConfigs` as const typing:** The `as const` on `seoConfigs` means Phase 7 must add `generativeUIDocs` (camelCase key) to get proper TypeScript types on the new docs entry.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| chat/src/app/components/GenerativeUI/GenerativeUIHeader.tsx | FOUND |
| chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx | FOUND |
| chat/src/app/components/GenerativeUI/MealPlanColumn.tsx | FOUND |
| chat/src/app/components/GenerativeUIPage.tsx | FOUND |
| chat/src/app/AppRouter.tsx (modified) | FOUND |
| chat/src/app/hooks/useSEOData.ts (modified) | FOUND |
| chat/scripts/prerender-react.js (modified) | FOUND |
| Commit 9908d91 (Task 1) | FOUND |
| Commit 5826085 (Task 2) | FOUND |
| Commit 049fbcb (Task 3) | FOUND |
| Commit 89b3aa6 (Task 4) | FOUND |
| Commit faa7164 (lint fix) | FOUND |
| TypeScript typecheck | PASSED (exit 0) |
| ESLint (direct, new files) | PASSED (0 errors, 0 warnings) |
| SEO drift gate (title) | PASSED (2 lines) |
| SEO drift gate (description) | PASSED (2 lines) |
| SEO drift gate (keywords) | PASSED (2 lines) |
