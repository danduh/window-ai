---
phase: 07-docs-seo-demo-polish
plan: 01
subsystem: chat/generative-ui
tags: [docs, seo, routing, tabs, mcp-apps, sep-1865]
dependency_graph:
  requires: [06-02]
  provides: [Generative-UI-API.md, /generative-ui/docs route, seoConfigs.generativeUIDocs, GenerativeUIPage Tabs]
  affects: [AppRouter.tsx, useSEOData.ts, prerender-react.js, GenerativeUIPage.tsx]
tech_stack:
  added: []
  patterns: [path-aware SEO branching, Docs-first Tabs ordering, byte-identical prerender mirror]
key_files:
  created:
    - chat/src/app/docs/Generative-UI-API.md
  modified:
    - chat/src/app/AppRouter.tsx
    - chat/src/app/hooks/useSEOData.ts
    - chat/scripts/prerender-react.js
    - chat/src/app/components/GenerativeUIPage.tsx
decisions:
  - "Tabs Docs-first ordering: path='' (Workbench) matches everything via includes(), so Docs tab must come first"
  - "startsWith('/generative-ui/docs') used (not includes) per RESEARCH Pitfall 6 exact-prefix match"
  - "seoConfigs.generativeUIDocs entry byte-identical verified by grep -lF wc -l = 2"
  - "Rebase worktree branch onto main to obtain Phases 4-6 GenerativeUI files before executing"
metrics:
  duration: ~25 minutes
  completed: 2026-05-19
  tasks_completed: 2
  files_changed: 5
---

# Phase 07 Plan 01: Docs Route + SEO + Tabs Summary

**One-liner:** `/generative-ui/docs` route wired with a 6-section SEP-1865 markdown explainer (4 real-source code samples), byte-identical SEO mirror between `useSEOData.ts` and `prerender-react.js`, and a Docs-first Tabs strip on `GenerativeUIPage` that switches via `location.pathname`.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Author Generative-UI-API.md (6 sections, 4 typed code samples) | ad966a7 | chat/src/app/docs/Generative-UI-API.md (13794 bytes) |
| 2 | Wire /generative-ui/docs route, mirror SEO entry, add path-aware Tabs | 71bab3c | AppRouter.tsx, useSEOData.ts, prerender-react.js, GenerativeUIPage.tsx |

## What Was Built

### Task 1 — Generative-UI-API.md

Created `chat/src/app/docs/Generative-UI-API.md` (13794 bytes) with exactly 6 top-level sections:

1. **What is MCP Apps (SEP-1865)?** — spec link, wire format in two sentences
2. **Tool result wire format** — `ToolResultWithUIResource` TypeScript interface + real `searchRecipes` JSON result shape + searchRecipes tool registration code (Sample 1) + host-side `_meta` interceptor (Sample 4)
3. **Sandbox model** — double-iframe + CSP baseline, explains WHY (null-origin containment)
4. **postMessage protocol (JSON-RPC 2.0)** — 5-row method table + pre-load queue explanation + source-equality guard + iframeBridgeScript `tools/call` click handler (Sample 3)
5. **Bidirectional pattern** — `searchRecipes` (visible) + `commitRecipeToPlan` with `annotations: { visibility: ['app'] }` (hidden helper, Sample 2) + explanation of why Pick works without LLM round-trip
6. **Try it** — `/generative-ui` link + Chrome 146 Canary flag requirement + production-readiness note

Code samples drawn verbatim from real source:
- Sample 1 (`searchRecipes` tool): `genUITools.ts` lines 87-139
- Sample 2 (`commitRecipeToPlan` with `visibility: ['app']`): `genUITools.ts` lines 56-86
- Sample 3 (iframe-side `tools/call` click handler): `iframeBridgeScript.ts` lines 154-177
- Sample 4 (host-side `_meta` interceptor): `GenUIChatPanel.tsx` lines 331-363

Acceptance criteria: 14 code fences (>= 8 required), all 7 required identifier strings present, `_meta` appears 15 times (>= 3 required).

### Task 2 — Route + SEO + Tabs

**AppRouter.tsx:** Added `<Route path="/generative-ui/docs" element={<GenerativeUIPage/>}/>` immediately after the existing `/generative-ui` route. No top-nav link added (Tabs is the discovery surface).

**useSEOData.ts:** Added `seoConfigs.generativeUIDocs` entry after `generativeUI`:
```
title: 'Generative UI Docs — MCP Apps wire format + bidirectional pattern | Chrome AI APIs'
description: 'How to register UI-returning tools and hidden helpers with navigator.modelContext, sandboxed iframes, and JSON-RPC postMessage bridge — SEP-1865 reference.'
keywords: 'MCP Apps documentation, SEP-1865, navigator.modelContext, registerTool, _meta.ui.resourceUri, sandboxed iframe, JSON-RPC postMessage, visibility annotation, hidden helpers, recipe carousel'
```

**prerender-react.js:** Added `{ path: '/generative-ui/docs', filename: 'generative-ui-docs.html' }` to routes array and byte-identical `'/generative-ui/docs': { title, description, keywords, structuredData }` to seoConfigs map.

**GenerativeUIPage.tsx:** Refactored to:
- Import `useLocation` from `react-router-dom`, `Tabs` (default), `DocsRenderer` (named)
- Compute `isDocs = location.pathname.startsWith('/generative-ui/docs')` (startsWith per RESEARCH Pitfall 6)
- Branch `useSEOData(isDocs ? seoConfigs.generativeUIDocs : seoConfigs.generativeUI, isDocs ? '/generative-ui/docs' : '/generative-ui')`
- Extract existing two-column layout into `workbenchContent` const
- Build `tabs` array with Docs (path: '/docs') FIRST, Workbench (path: '') SECOND
- Render `<Tabs basePath="/generative-ui" defaultTab="workbench" tabs={tabs} />`
- Keep `MissingFlagBanner` and `GenerativeUIHeader` outside Tabs (appear on both tabs)
- Keep both `useEffect` hooks (seedIfMissing + registerGenUITools) unchanged

## SEO Drift-Check Output

```
grep -lF 'Generative UI Docs — MCP Apps wire format + bidirectional pattern | Chrome AI APIs' \
  chat/src/app/hooks/useSEOData.ts chat/scripts/prerender-react.js | wc -l
2  ← PASS (title in both files)

grep -lF 'How to register UI-returning tools...' useSEOData.ts prerender-react.js | wc -l
2  ← PASS (description in both files)

grep -lF 'MCP Apps documentation, SEP-1865...' useSEOData.ts prerender-react.js | wc -l
2  ← PASS (keywords in both files)
```

## Verification Results

- `npx nx typecheck chat`: PASS
- `npx nx build chat`: PASS (webpack compiled successfully)
- `npx nx lint chat`: N/A — lint target not configured in chat/project.json (pre-existing gap; `npx nx lint chat` returns "Cannot find configuration for task chat:lint" on the current codebase)
- Route `path="/generative-ui/docs"`: grep count = 1 PASS
- `generativeUIDocs:` in useSEOData.ts: count = 1 PASS
- `'/generative-ui/docs'` in prerender-react.js: count = 2 PASS (routes + seoConfigs)
- `import Tabs` in GenerativeUIPage.tsx: count = 1 PASS
- `DocsRenderer` in GenerativeUIPage.tsx: count = 2 PASS (import + usage)
- `docFile="Generative-UI-API.md"`: count = 1 PASS
- `isDocs` in GenerativeUIPage.tsx: count = 3 PASS
- Docs tab (line 75) before Workbench tab (line 85): PASS
- No nav `<Link to="/generative-ui/docs">` added: PASS

## Deviations from Plan

### Setup Deviation (pre-execution)

**Worktree branch needed rebase onto main.** The `worktree-agent-a4d764548ad79e56d` branch was based on `f454625` (merge from feature/mcp-preview, circa April 2026), while all Phase 4-7 GenerativeUI code lived on `main`. The plan referenced files that didn't exist in the worktree (`GenerativeUIPage.tsx`, `genUITools.ts`, `bridge.ts`, `iframeBridgeScript.ts`, `GenUIChatPanel.tsx`). Resolution: `git rebase main` in the worktree directory. No conflicts; rebase succeeded cleanly. This is a worktree setup issue, not a plan deviation.

### Auto-fixed: Tab content JSX exhaustive-deps

The `useMemo` tab array wraps stable JSX (no state dependencies). Added `// eslint-disable-next-line react-hooks/exhaustive-deps` comment consistent with the existing pattern in `RecipeWorkbenchPage.tsx:227`. The `react-hooks/exhaustive-deps` ESLint rule is configured in the codebase but the plugin is not resolvable from the ESLint binary path — pre-existing issue, not introduced by this plan.

## Known Stubs

None — the DocsRenderer renders the markdown file via `loadMDFile()` which uses Vite's `import.meta.glob` dynamic loader. The Generative-UI-API.md file exists at the required path. The Workbench tab wraps `GenUIChatPanel` and `MealPlanColumn` which have their own data wiring from Phase 6.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The new route and docs page are read-only surfaces.

## Self-Check: PASSED

- `chat/src/app/docs/Generative-UI-API.md` exists: FOUND
- `chat/src/app/AppRouter.tsx` exists: FOUND
- `chat/src/app/hooks/useSEOData.ts` exists: FOUND
- `chat/scripts/prerender-react.js` exists: FOUND
- `chat/src/app/components/GenerativeUIPage.tsx` exists: FOUND
- Commit ad966a7 (Task 1) exists: FOUND
- Commit 71bab3c (Task 2) exists: FOUND
- Markdown byte count: 13794 bytes
