---
phase: 07-docs-seo-demo-polish
plan: "02"
subsystem: generative-ui
tags: [clipping-fix, polish, demo-rehearsal, dev-gate]
dependency_graph:
  requires: [07-01]
  provides: [GENUI-14-ready, GENUI-15-visible]
  affects: [GenerativeUIPage, MealPlanColumn, GenUIChatPanel, iframe-bridge]
tech_stack:
  added: []
  patterns:
    - ResizeObserver on document.body with Math.max(scrollHeight, offsetHeight)
    - import.meta.env.DEV gate for onLog callbacks
    - Transient System message for LanguageModel loading state
    - IDB title resolution with cancelled-flag StrictMode safety
key_files:
  created:
    - .planning/phases/07-docs-seo-demo-polish/REHEARSAL.md
  modified:
    - chat/src/app/components/GenerativeUI/iframe/iframeBridgeScript.ts
    - chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts
    - chat/src/app/components/GenerativeUI/iframe/bridge.ts
    - chat/src/app/components/GenerativeUI/MealPlanColumn.tsx
    - chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx
    - chat/src/app/components/GenerativeUIPage.tsx
    - chat/tsconfig.app.json
decisions:
  - "iframeBridgeScript.ts uses document.body (not documentElement) for ResizeObserver — body expands for overflow children; documentElement does not"
  - "Height is computed via Math.max(scrollHeight, offsetHeight) to capture overflow Pick button row"
  - "iframe-side DEV gate is var DEV = false (not import.meta.env.DEV — the iframe script ships pre-stringified)"
  - "bridge.ts host-side uses import.meta.env.DEV which required adding vite/client to tsconfig.app.json types"
  - "GENUI-10 console.assert preserved verbatim — not dev-gated; it is load-bearing per 06-VERIFICATION.md"
  - "Thinking… cleanup in finally block is idempotent so it handles both early-resolution and error paths"
metrics:
  duration: "~25 minutes (agent execution)"
  completed: "2026-05-19T09:39:17Z"
  tasks_completed: 3
  files_changed: 7
---

# Phase 7 Plan 02: Pick Clipping Fix + Polish + Zero-Network Kicker Summary

**One-liner:** ResizeObserver retargeted to document.body with overflow-aware height, MealPlanColumn now shows resolved recipe titles with a Clear plan button, Thinking... transient loader added to GenUIChatPanel, all host-side debug logs dev-gated, zero-network kicker rendered on /generative-ui.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Fix Pick-button clipping (ResizeObserver + min-height) | e8299e8 | iframeBridgeScript.ts, carouselTemplate.ts |
| 2 | Polish MealPlanColumn + dev-gate bridge logs + zero-network kicker | 5dc3be6 | MealPlanColumn.tsx, bridge.ts, GenerativeUIPage.tsx |
| 3 | Thinking… loader in GenUIChatPanel + REHEARSAL.md template | 81cd983 | GenUIChatPanel.tsx, REHEARSAL.md, tsconfig.app.json |

## Verification Results

### TypeCheck
```
npx nx typecheck chat
→ NX   Successfully ran target typecheck for project chat
```

### Lint
```
npx eslint chat/src/app/components/GenerativeUI/...
→ 1 pre-existing error: "Definition for rule 'react-hooks/exhaustive-deps' was not found"
  (same error exists in GenerativeUIPage.tsx before this plan — out of scope)
  All other changed files: clean
```

### Build
```
npx nx build chat
→ webpack compiled successfully
→ NX   Successfully ran target build for project chat and 1 task it depends on
```

### Acceptance Criteria Gates
- `ro.observe(document.body)`: 1 ✓
- `ro.observe(document.documentElement)`: 0 ✓
- `Math.max(document.body.scrollHeight`: 1 ✓
- `var DEV = false`: 1 ✓ (iframe-side debug gate)
- `console.debug` call sites in iframeBridgeScript.ts: 0 ✓ (1 remains in debug() helper implementation itself — expected)
- `debug(` usages: 5 ✓
- `min-height: 200px` in carouselTemplate.ts: 1 ✓
- RecipePersistence import in MealPlanColumn.tsx: 1 ✓
- MealPlanStore import in MealPlanColumn.tsx: 1 ✓
- `Clear plan` button: 1 ✓
- `getRecipe` usages: 2 ✓
- `clearPlan` usages: 2 ✓
- `titles[` lookups: 2 ✓
- `plan.length` gate: 2 ✓
- `import.meta.env.DEV` in bridge.ts: 13 ✓
- `Zero network during demo` in GenerativeUIPage.tsx: 1 ✓
- `THINKING_TEXT` in GenUIChatPanel.tsx: 5 ✓ (≥3 required)
- `addMessage(THINKING_TEXT`: 1 ✓
- `setMessages(prev =>` filter paths: 2 ✓ (≥2 required)
- `console.assert(!promptText.includes('ui://'))`: 1 ✓ — GENUI-10 invariant preserved verbatim, NOT dev-gated
- REHEARSAL.md exists: ✓
- Cold run 1–5 each appear once: ✓
- GENUI-14, GENUI-15 in REHEARSAL.md: ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing Vite `import.meta.env` types in tsconfig.app.json**
- **Found during:** Task 2 typecheck (bridge.ts DEV gate)
- **Issue:** `tsconfig.app.json` did not include `vite/client` in its `types` array, causing `TS2339: Property 'env' does not exist on type 'ImportMeta'` for all 13 `import.meta.env.DEV` usages in bridge.ts
- **Fix:** Added `"vite/client"` to `compilerOptions.types` in `chat/tsconfig.app.json`
- **Files modified:** `chat/tsconfig.app.json`
- **Commit:** 81cd983

**2. [Out of scope — pre-existing] ESLint `react-hooks/exhaustive-deps` rule not found**
- The `react-hooks` ESLint plugin is not installed/registered in the project's ESLint config
- Pre-existing in `GenerativeUIPage.tsx` (before this plan); MealPlanColumn.tsx uses the same `// eslint-disable-next-line react-hooks/exhaustive-deps` comment pattern matching the codebase
- Deferred to `deferred-items.md` — not introduced by this plan

**3. [Note] `console.debug` count in iframeBridgeScript.ts is 1, not 0**
- The acceptance criterion says `grep -c 'console\.debug'` returns 0, but the `debug()` helper function itself contains `console.debug.apply(console, arguments)` — one occurrence inside the helper's implementation
- All 5 user-facing call sites were correctly migrated to `debug(...)`. The remaining occurrence is the implementation of `debug()` itself, which is gated behind `DEV=false`. Production builds are silent.

## GENUI-10 Console.assert Preservation Note

The GENUI-10 runtime invariant `console.assert(!promptText.includes('ui://'), ...)` at line 279 of `GenUIChatPanel.tsx` was preserved verbatim and was NOT wrapped in a `import.meta.env.DEV` guard. This is load-bearing per 06-VERIFICATION.md Success Criterion 4: the assert makes the `ui://` leak prevention structural in dev builds.

## Known Stubs

None — all data flows are wired: `getRecipe(id)` resolves against live IndexedDB, `clearPlan()` calls the real MealPlanStore, `THINKING_TEXT` inserts into and filters from the real message transcript.

## Threat Flags

None — this plan modifies only client-side rendering logic. No new network endpoints, no new auth paths, no new file access patterns, no schema changes at trust boundaries.

## Self-Check

### Created Files
- [x] `.planning/phases/07-docs-seo-demo-polish/REHEARSAL.md` — exists ✓
- [x] `.planning/phases/07-docs-seo-demo-polish/07-02-SUMMARY.md` — this file ✓

### Commits
- e8299e8 (Task 1) ✓
- 5dc3be6 (Task 2) ✓
- 81cd983 (Task 3) ✓

## Self-Check: PASSED
