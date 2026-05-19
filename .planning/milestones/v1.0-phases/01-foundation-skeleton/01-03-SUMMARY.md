---
phase: 01-foundation-skeleton
plan: 03
subsystem: routing + navigation + seo
tags: [webmcp, routing, navigation, seo, prerender, appseo]
dependency_graph:
  requires:
    - chat/src/app/components/RecipeWorkbenchPage.tsx (Plan 02 — page shell + named export)
    - chat/src/app/hooks/useSEOData.ts (Plan 01/02 — existing seoConfigs object)
  provides:
    - /webmcp route registered in AppRouter (renders RecipeWorkbenchPage)
    - /webmcp/docs route registered in AppRouter (renders RecipeWorkbenchPage, Tabs handles tab)
    - Desktop nav WebMCP link (between Translate and Writer/Rewriter)
    - Mobile nav WebMCP link (between Translate and Writer/Rewriter)
    - seoConfigs.webmcp key in useSEOData.ts
    - useSEOData(seoConfigs.webmcp, '/webmcp') call wired into RecipeWorkbenchPage
    - prerender-react.js routes[] entries for /webmcp and /webmcp/docs
    - prerender-react.js getSEODataForRoute SEO config entries for /webmcp and /webmcp/docs
  affects:
    - chat/src/app/AppRouter.tsx (4 insertions: import + desktop link + mobile link + 2 routes)
    - chat/src/app/hooks/useSEOData.ts (1 new key: webmcp)
    - chat/src/app/components/RecipeWorkbenchPage.tsx (1 import line + 1 hook call)
    - chat/scripts/prerender-react.js (2 route entries + 2 SEO config entries)
tech_stack:
  added: []
  patterns:
    - Self-analog extension: AppRouter, useSEOData, prerender-react.js all extended in place
    - useSEOData as first hook call in component body (matching Summary.tsx:16-18 pattern)
    - Named import style for RecipeWorkbenchPage (matching HomePage precedent)
    - WebMCP routes before catch-all sentinel per react-router-dom v6 first-match semantics
key_files:
  created: []
  modified:
    - chat/src/app/AppRouter.tsx
    - chat/src/app/hooks/useSEOData.ts
    - chat/src/app/components/RecipeWorkbenchPage.tsx
    - chat/scripts/prerender-react.js
decisions:
  - "Inserted WebMCP routes BEFORE the catch-all <Route path='*' .../> sentinel — required by react-router-dom v6 first-match semantics (T-01-03-01 mitigation)"
  - "Used named import style for RecipeWorkbenchPage (matching HomePage precedent) rather than default import"
  - "npx nx lint chat has no lint target configured in this Nx workspace — confirmed pre-existing project config, not a regression; build exit 0 is the substantive check"
  - "Placed /webmcp and /webmcp/docs routes between Translate and Writer/Rewriter route blocks to mirror nav ordering"
metrics:
  duration_seconds: 360
  completed_date: "2026-04-27"
  tasks_completed: 2
  files_changed: 4
---

# Phase 01 Plan 03: Route + Nav + SEO Wiring Summary

**One-liner:** AppRouter wired with /webmcp and /webmcp/docs routes + desktop/mobile nav links between Translate and Writer/Rewriter, seoConfigs.webmcp registered in useSEOData.ts, useSEOData call landed in RecipeWorkbenchPage, and prerender-react.js extended with two route entries and two full SEO config blocks.

## What Was Built

### Task 1: seoConfigs.webmcp + useSEOData wiring (commit f4984e9)

**`chat/src/app/hooks/useSEOData.ts`** — new `webmcp` key appended before `} as const;`:

```ts
webmcp: {
  title: 'WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs',
  description: 'A page-side WebMCP demo using navigator.modelContext in Chrome 146+ Canary. Browse seeded recipes from IndexedDB and (in later phases) drive them with native browser tools — no MCP server required.',
  keywords: 'WebMCP, navigator.modelContext, Model Context Protocol, page-side tools, Chrome 146, recipe workbench, browser AI tools, IndexedDB demo'
}
```

Final `seoConfigs` key list (7 keys): `home`, `chat`, `toolCalling`, `summary`, `translate`, `writer`, `webmcp`.

**`chat/src/app/components/RecipeWorkbenchPage.tsx`** — two insertions:

1. Import added after existing imports:
   ```tsx
   import { useSEOData, seoConfigs } from '../hooks/useSEOData';
   ```

2. Hook call as FIRST statement in `RecipeWorkbenchPage` component body (before any `useState`):
   ```tsx
   export const RecipeWorkbenchPage: React.FC = () => {
     useSEOData(seoConfigs.webmcp, '/webmcp');
     const [recipes, setRecipes] = useState<Recipe[]>([]);
   ```

### Task 2: AppRouter routes + nav links + prerender entries (commit ca0159e)

**`chat/src/app/AppRouter.tsx`** — four insertions:

1. Import at line ~9 (after existing `{HomePage}` import):
   ```tsx
   import {RecipeWorkbenchPage} from "./components/RecipeWorkbenchPage";
   ```

2. Desktop nav link inserted between Translate and Writer/Rewriter links (~line 66):
   ```tsx
   <Link to="/webmcp"
         onClick={() => trackUserInteraction('navigation_click', 'webmcp_link')}
         className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">WebMCP</Link>
   ```

3. Mobile nav link inserted between Translate and Writer/Rewriter links (~line 151):
   ```tsx
   <Link to="/webmcp"
         onClick={() => trackUserInteraction('navigation_click', 'webmcp_link_mobile')}
         className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">WebMCP</Link>
   ```

4. Routes block — two new routes inserted between Translate routes and Writer/Rewriter routes, BEFORE the catch-all:
   ```tsx
   {/* WebMCP routes */}
   <Route path="/webmcp" element={<RecipeWorkbenchPage/>}/>
   <Route path="/webmcp/docs" element={<RecipeWorkbenchPage/>}/>
   ```

   Catch-all `<Route path="*" element={<Navigate to="/" replace/>}/>` remains LAST (T-01-03-01 mitigation).

**`chat/scripts/prerender-react.js`** — two locations extended:

1. `routes[]` array — two entries appended after Writer routes (before closing `]`):
   ```js
   // WebMCP routes
   { path: '/webmcp', filename: 'webmcp.html' },
   { path: '/webmcp/docs', filename: 'webmcp-docs.html' },
   ```

2. `getSEODataForRoute` per-path SEO config map — two entries added before closing `}`:
   ```js
   '/webmcp': {
     title: 'WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs',
     description: 'A page-side WebMCP demo using navigator.modelContext in Chrome 146+ Canary. Browse seeded recipes from IndexedDB.',
     keywords: 'WebMCP, navigator.modelContext, Model Context Protocol, page-side tools, Chrome 146, recipe workbench, browser AI tools',
     structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'WebMCP Recipe Workbench', ... },
   },
   '/webmcp/docs': {
     title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
     ...
     structuredData: { '@context': 'https://schema.org', '@type': 'TechArticle', name: 'WebMCP API Documentation', ... },
   },
   ```

## Commits

| Task | Commit  | Description |
|------|---------|-------------|
| 1    | f4984e9 | feat(01-03): add seoConfigs.webmcp and wire useSEOData into RecipeWorkbenchPage |
| 2    | ca0159e | feat(01-03): register /webmcp routes + nav links in AppRouter and append prerender entries |

## Verification Results

All plan verification checks passed:

1. `useSEOData.ts` contains `webmcp:` key — PASS
2. `useSEOData.ts` contains correct title string — PASS
3. `useSEOData.ts` still ends with `} as const;` — PASS
4. `RecipeWorkbenchPage.tsx` imports `useSEOData` and `seoConfigs` — PASS
5. `RecipeWorkbenchPage.tsx` calls `useSEOData(seoConfigs.webmcp, '/webmcp')` as first hook — PASS
6. `AppRouter.tsx` imports `RecipeWorkbenchPage` (named, from `./components/RecipeWorkbenchPage`) — PASS
7. `AppRouter.tsx` has 2x `to="/webmcp"` (desktop + mobile) — PASS
8. `AppRouter.tsx` desktop link has analytics tag `'webmcp_link'` — PASS
9. `AppRouter.tsx` mobile link has analytics tag `'webmcp_link_mobile'` — PASS
10. `AppRouter.tsx` has `path="/webmcp" element={<RecipeWorkbenchPage/>}` — PASS
11. `AppRouter.tsx` has `path="/webmcp/docs" element={<RecipeWorkbenchPage/>}` — PASS
12. Catch-all `<Route path="*" .../>` is still LAST inside `<Routes>` — PASS
13. `prerender-react.js` has `path: '/webmcp'` with `filename: 'webmcp.html'` — PASS
14. `prerender-react.js` has `path: '/webmcp/docs'` with `filename: 'webmcp-docs.html'` — PASS
15. `prerender-react.js` has `'/webmcp':` SEO config key — PASS
16. `prerender-react.js` has `'/webmcp/docs':` SEO config key — PASS
17. `npx nx build chat` exits 0 — PASS

### Phase 1 Canonical Verification (manual, after `nx serve chat`)

Visit `http://localhost:4200/webmcp` and confirm:
1. Page loads with H1 "Recipe Workbench"
2. Two recipes appear in the picker (Buttermilk Pancakes, Tomato Pasta)
3. Clicking a picker button switches the active recipe view
4. Reload preserves the recipes (IndexedDB persistence)
5. On a non-Chrome-146 browser (or Chrome with the flag off), the yellow banner appears above the Tabs
6. Browser tab title reads "WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs"

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

**`npx nx lint chat` target missing:** The plan's acceptance criteria specifies `npx nx lint chat` must exit 0. This command fails with "Cannot find configuration for task chat:lint" — a pre-existing project configuration fact in this Nx workspace (no ESLint target is registered for the `chat` project). This is not a regression from this plan's changes; `npx nx run-many -t lint` also runs zero tasks. The build exit 0 with TypeScript strict-mode compilation is the substantive correctness check.

## Known Stubs

None. All wiring is real:
- Routes serve the real `RecipeWorkbenchPage` component
- Nav links navigate to live routes
- `seoConfigs.webmcp` values are authored strings, not placeholders
- `useSEOData` call is live on mount, setting `<title>` and meta tags

The Docs tab content in `RecipeWorkbenchPage` ("Documentation coming in Phase 3") is an intentional Phase 3 deliverable (DOCS-01), not a stub introduced by this plan.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced. All additions are:
- Static route registrations (react-router-dom)
- Static nav `<Link>` elements
- Static string literals in SEO configs
- A hook call that writes to `<head>` via React's standard text-node mechanism

All STRIDE threats from the plan's threat model were addressed:
- T-01-03-01 (catch-all ordering): catch-all verified LAST in Routes block
- T-01-03-02/03/04/05: accepted (static strings, public copy, anonymous events, build-time script)

## Self-Check: PASSED

- `chat/src/app/hooks/useSEOData.ts` modified — FOUND, contains `webmcp:` key
- `chat/src/app/components/RecipeWorkbenchPage.tsx` modified — FOUND, contains `useSEOData(seoConfigs.webmcp, '/webmcp')`
- `chat/src/app/AppRouter.tsx` modified — FOUND, contains import + 2 nav links + 2 routes
- `chat/scripts/prerender-react.js` modified — FOUND, contains 2 route entries + 2 SEO config entries
- Commit `f4984e9` (Task 1) — FOUND
- Commit `ca0159e` (Task 2) — FOUND
- `npx nx build chat` exits 0 — VERIFIED
