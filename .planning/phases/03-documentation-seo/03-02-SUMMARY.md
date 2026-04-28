---
phase: 03-documentation-seo
plan: 02
subsystem: chat (SPA — WebMCP demo)
tags: [seo, docs-renderer, react-router, recipe-workbench]
requires:
  - chat/src/app/hooks/useSEOData.ts (existing seoConfigs map + useSEOData)
  - chat/src/app/tools/DocsRenderer.tsx (existing renderer)
  - chat/scripts/prerender-react.js (existing prerender SEO map)
  - chat/src/app/components/RecipeWorkbenchPage.tsx (existing page)
  - react-router-dom (already a dep — useLocation)
provides:
  - seoConfigs.webmcpDocs runtime SEO entry (single-source-of-truth aligned with prerender)
  - Path-aware <head> swap on /webmcp ↔ /webmcp/docs
  - DocsRenderer mount on the Docs tab — Plan 03-01's WebMCP-API.md becomes user-reachable
affects:
  - chat/src/app/components/RecipeWorkbenchPage.tsx (3 edits)
  - chat/src/app/hooks/useSEOData.ts (1 entry added)
  - chat/scripts/prerender-react.js (description + keywords drop provideContext)
tech-stack:
  added: []
  patterns:
    - Path-aware useSEOData via useLocation().pathname.startsWith
    - DocsRenderer mount inside <div className="max-w-none"> wrapper (no card-in-a-card)
key-files:
  created: []
  modified:
    - chat/src/app/hooks/useSEOData.ts
    - chat/scripts/prerender-react.js
    - chat/src/app/components/RecipeWorkbenchPage.tsx
decisions:
  - "Used .startsWith('/webmcp/docs') (not .includes('/docs')) per RESEARCH Pitfall 6"
  - "Stable seoConfigs.* references (not inline-constructed objects) to keep useSEOData [config, path, updateSEO] deps stable per RESEARCH Pitfall 7"
  - "useLocation() placed immediately above useSEOData; useSEOData remains the first SEO-write hook (first-hook invariant preserved)"
  - "Did NOT touch chat/src/app/types/webmcp.d.ts (D-12 point 4 — out of scope)"
  - "Did NOT touch the /webmcp prerender entry (CONTEXT scope — only /webmcp/docs)"
metrics:
  duration: "3m 23s"
  completed: 2026-04-28
  tasks: 2
  files-modified: 3
  files-created: 0
---

# Phase 03 Plan 02: Wire `/webmcp/docs` (DocsRenderer + path-aware SEO) Summary

Added the runtime `seoConfigs.webmcpDocs` entry, synced the prerender `/webmcp/docs` SEO strings to the post-D-12 copy (no `provideContext`), and refactored `RecipeWorkbenchPage` so the `<head>` now swaps as the user clicks between the Workbench and Docs tabs while the Docs tab body renders the `WebMCP-API.md` explainer (authored in parallel plan 03-01).

## What Changed (3 files)

### 1. `chat/src/app/hooks/useSEOData.ts` (+8/-1 lines)

Added a new `seoConfigs.webmcpDocs` sibling to `seoConfigs.webmcp` (after line 66, before the closing `} as const;`), with an in-source comment pointing at the prerender file as the single source of truth.

Verbatim landed copy (proof of post-D-12 strings — copied from the file post-edit):

```typescript
  // Must match prerender-react.js:357-367 verbatim — single source of truth
  // is the prerender file (crawler parity). See Phase 3 D-08 + D-12.
  webmcpDocs: {
    title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
    description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and the page-side tool descriptor.',
    keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, page-side tools docs, JSON Schema tools'
  }
} as const;
```

### 2. `chat/scripts/prerender-react.js` (lines 359-360)

Replaced the description/keywords for `/webmcp/docs` so they match the runtime config byte-for-byte. Title (line 358) and structuredData block (361-366) untouched. The unrelated `/webmcp` entry (lines 346-356) untouched.

```javascript
    '/webmcp/docs': {
      title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
      description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and the page-side tool descriptor.',
      keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, page-side tools docs, JSON Schema tools',
      structuredData: { ... },
    },
```

### 3. `chat/src/app/components/RecipeWorkbenchPage.tsx` (3 edits, +17/-6)

**Edit (a) — imports (lines 1-22):**
```typescript
import { useLocation } from 'react-router-dom';
// ...
import { DocsRenderer } from '../tools/DocsRenderer';
```

**Edit (b) — path-aware useSEOData (replacing the unconditional call at old line 105):**
```typescript
export const RecipeWorkbenchPage: React.FC = () => {
  // Path-aware SEO: when the user is on /webmcp/docs, the rendered <head> swaps
  // to seoConfigs.webmcpDocs; everything else under /webmcp gets seoConfigs.webmcp.
  // useLocation() is order-stable; useSEOData remains the first SEO write so
  // the Rules of Hooks invariant is preserved. The two seoConfigs.* references
  // are stable module-scope objects → useSEOData's [config, path, updateSEO]
  // deps only re-fire when the branch flips, not on every render.
  // Use startsWith (NOT includes) per RESEARCH Pitfall 6 — exact-prefix match.
  const location = useLocation();
  const isDocs = location.pathname.startsWith('/webmcp/docs');
  useSEOData(
    isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
    isDocs ? '/webmcp/docs' : '/webmcp',
  );
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // ... rest unchanged
```

**Edit (c) — Docs tab content (replacing the placeholder at old lines 250-256):**
```tsx
{
  id: 'docs',
  label: 'Docs',
  path: '/docs',
  content: (
    <div className="max-w-none">
      <DocsRenderer docFile="WebMCP-API.md" initOpen={true} />
    </div>
  ),
},
```

`id`, `label`, `path` preserved; tab ordering (docs at line 260, workbench at line 270) preserved.

## Verification — All Acceptance Checks

### Cross-file SEO parity (D-08 single source of truth)
```
$ grep -lF "the page-side tool descriptor" chat/src/app/hooks/useSEOData.ts chat/scripts/prerender-react.js
chat/src/app/hooks/useSEOData.ts
chat/scripts/prerender-react.js
```
2 hits — runtime + prerender agree byte-for-byte.

### `provideContext` removed from both SEO sources (D-12)
```
$ grep -F "provideContext" chat/scripts/prerender-react.js
[no output]
$ grep -F "provideContext" chat/src/app/hooks/useSEOData.ts
[no output]
```

### RecipeWorkbenchPage wiring
```
$ grep -F "import { useLocation } from 'react-router-dom'"   → 1 hit
$ grep -F "import { DocsRenderer } from '../tools/DocsRenderer'" → 1 hit
$ grep -F "const location = useLocation();"                   → 1 hit
$ grep -F "location.pathname.startsWith('/webmcp/docs')"      → 1 hit
$ grep -F "isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp" → 1 hit
$ grep -F 'DocsRenderer docFile="WebMCP-API.md"'              → 1 hit
$ grep -F 'initOpen={true}'                                   → 1 hit
$ grep -F 'className="max-w-none"'                            → 1 hit
$ grep -F "Documentation coming in Phase 3"                   → 0 hits (placeholder gone)
$ grep -F "rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors" → 0 hits (card-in-a-card antipattern absent in the docs tab)
$ grep -F "as any"                                            → 0 hits
$ grep -F "pathname.includes('/docs')"                        → 0 hits (no .includes regression)
```

### First-hook invariant preserved (lines 106-120)

```typescript
106  export const RecipeWorkbenchPage: React.FC = () => {
107    // Path-aware SEO: when the user is on /webmcp/docs, the rendered <head> swaps
108    // to seoConfigs.webmcpDocs; everything else under /webmcp gets seoConfigs.webmcp.
109    // useLocation() is order-stable; useSEOData remains the first SEO write so
110    // the Rules of Hooks invariant is preserved. ...
113    // Use startsWith (NOT includes) per RESEARCH Pitfall 6 — exact-prefix match.
114    const location = useLocation();
115    const isDocs = location.pathname.startsWith('/webmcp/docs');
116    useSEOData(
117      isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
118      isDocs ? '/webmcp/docs' : '/webmcp',
119    );
120    const [recipes, setRecipes] = useState<Recipe[]>([]);
```

`useSEOData` is still the first SEO-write hook; `useLocation` is the only React hook above it (order-stable, fine per RESEARCH Example 1). All `useState`/`useEffect`/`useMemo`/`useCallback` calls remain in their original relative order.

### Build + Tests

| Check | Exit code | Notes |
|-------|-----------|-------|
| `npx nx build chat` (after Task 1) | 0 | webpack compiled successfully |
| `npx nx build chat` (after Task 2) | 0 | webpack compiled successfully |
| `npx nx test chat` | 1 | **No test files exist anywhere in `chat/src`** — vitest exits 1 on "No test files found". This is a pre-existing project condition, not a regression from this plan's edits. See "Deviations" below. |

## Deviations from Plan

### Auto-fixed / Auto-handled

**1. [Worktree base] Merged `feature/mcp-preview` into the executor's worktree branch**

- **Found during:** Initial state load (before Task 1).
- **Issue:** The executor was spawned in a worktree based on a very old commit (`4e12c39`) that did NOT contain any of the WebMCP files (`RecipeWorkbenchPage.tsx`, `useSEOData.ts`, `prerender-react.js`, etc.). The plan files exist only on `feature/mcp-preview` (HEAD `7452be6`), and the worktree was set to a stale base.
- **Fix:** Ran `git merge feature/mcp-preview --no-edit` in the worktree to bring it up to the parent branch's HEAD before performing any plan edits. This is the equivalent of the worktree being correctly created from `feature/mcp-preview` in the first place.
- **Files modified:** None (merge only — no conflicts, no plan-related code changes).
- **Commit:** Merge commit was created automatically by `git merge`; no separate commit hash beyond that since the next commits are the actual task commits.

### Documented but not auto-fixed

**2. [Test infrastructure] `npx nx test chat` exits 1 due to zero test files in `chat/src`**

- **Found during:** Task 2 verification.
- **Issue:** `chat` workspace has no `*.test.{ts,tsx}` or `*.spec.{ts,tsx}` files anywhere under `src/`. Vitest treats this as an error (`No test files found, exiting with code 1`).
- **Why not fixed:** Pre-existing project condition. Out of plan scope (the plan does not introduce new tests). The plan's `<deviation_handling>` section explicitly authorizes proceeding: *"if test framework also requires the markdown file, note it in SUMMARY.md and proceed — final verification post-merge is the source of truth."*
- **Files modified:** None.
- **Mitigation:** All grep-level acceptance criteria pass; build is green; no behavior regression. The vitest-empty-suite issue should be addressed in a separate dedicated plan (e.g., a future `chat:test` infrastructure plan or a one-line `vitest.workspace.ts` `passWithNoTests` toggle).

### Auth gates / Architectural decisions

None.

## Files Touched

| File | Lines added | Lines removed | Commit |
|------|-------------|---------------|--------|
| `chat/src/app/hooks/useSEOData.ts` | +8 | -1 | a51f37e |
| `chat/scripts/prerender-react.js` | +1 | -1 | a51f37e |
| `chat/src/app/components/RecipeWorkbenchPage.tsx` | +17 | -6 | e6c5016 |

## Commits

- `a51f37e` — feat(03-02): add seoConfigs.webmcpDocs and sync prerender SEO map
- `e6c5016` — feat(03-02): wire Docs tab + path-aware SEO on /webmcp

## Known Stubs

None. The Docs tab now renders real content (DocsRenderer + WebMCP-API.md from parallel plan 03-01); the placeholder copy is gone. No empty arrays / mock data / "coming soon" / "TODO" remain in any of the touched files.

## Threat Flags

None — the changes match the plan's `<threat_model>` exactly (T-03-03 mitigated by `.startsWith` exact-prefix match; T-03-04 mitigated by repo-controlled markdown source; T-03-05 mitigated by the cross-file `grep -lF "the page-side tool descriptor"` invariant which yields exactly 2 hits).

## TDD Gate Compliance

Plan type is `execute` (not `tdd`); no RED/GREEN/REFACTOR commits required.

## Self-Check: PASSED

- File `chat/src/app/hooks/useSEOData.ts` exists with `webmcpDocs:` block: FOUND
- File `chat/scripts/prerender-react.js` exists with updated `/webmcp/docs` entry (no `provideContext`): FOUND
- File `chat/src/app/components/RecipeWorkbenchPage.tsx` exists with the 3 edits: FOUND
- Commit `a51f37e` (Task 1): FOUND in `git log`
- Commit `e6c5016` (Task 2): FOUND in `git log`
- Cross-file grep `the page-side tool descriptor` → 2 hits: FOUND
- `provideContext` absent from both SEO sources: FOUND
- Phase 1 placeholder gone: FOUND
- Build green: FOUND (exit 0)
- Tests: pre-existing empty-suite condition documented; not a regression
