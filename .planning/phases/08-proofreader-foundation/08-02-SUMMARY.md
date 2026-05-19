---
phase: 08-proofreader-foundation
plan: 02
subsystem: chat/proofreader
tags: [proofreader, chrome-ai, page-shell, routing, seo, tabs, output-mode-toggle, brownfield]
dependency_graph:
  requires: ["08-01"]
  provides: ["/proofreader route", "/proofreader/docs route", "ProofreaderPage", "ProofreaderHeader", "ProofreaderForm", "ProofreaderOutputModeToggle", "ProofreaderResultPanel", "seoConfigs.proofreader", "seoConfigs.proofreaderDocs"]
  affects: ["chat/src/app/AppRouter.tsx", "chat/src/app/hooks/useSEOData.ts", "chat/scripts/prerender-react.js"]
tech_stack:
  added: []
  patterns: ["path-aware SEO via useLocation + startsWith", "page-state machine (6 states)", "localStorage language persistence", "StrictMode-safe availability effect with cancelled flag", "Docs-first Tab ordering", "byte-identical prerender SEO mirror"]
key_files:
  created:
    - chat/src/app/components/Proofreader/ProofreaderPage.tsx
    - chat/src/app/components/Proofreader/ProofreaderHeader.tsx
    - chat/src/app/components/Proofreader/ProofreaderForm.tsx
    - chat/src/app/components/Proofreader/ProofreaderOutputModeToggle.tsx
    - chat/src/app/components/Proofreader/ProofreaderResultPanel.tsx
  modified:
    - chat/src/app/AppRouter.tsx
    - chat/src/app/hooks/useSEOData.ts
    - chat/scripts/prerender-react.js
decisions:
  - "Added seoConfigs entries to useSEOData.ts in Task 1 commit (not Task 3) because ProofreaderPage has compile-time dependency on seoConfigs.proofreader — avoids split-commit TypeScript error"
  - "OutputMode coerced to 'plain' defensively in ProofreaderOutputModeToggle to prevent future callers from accidentally activating unimplemented Phase 9 modes"
  - "Rebased worktree onto main to acquire 08-01 foundation files (ProofreaderService.ts, updated MissingFlagBanner.tsx) missing from worktree spawn-time commit"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_changed: 8
---

# Phase 8 Plan 02: Proofreader Page Shell + Routing + SEO Summary

Shipped the `/proofreader` and `/proofreader/docs` route surface: 5-component React subtree under `chat/src/app/components/Proofreader/` with a 6-state page-state machine, path-aware SEO (startsWith), Docs-first Tabs, MissingFlagBanner with locked Chrome flag URLs, localStorage language persistence, and byte-identical SEO mirror across `useSEOData.ts` and `prerender-react.js`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Proofreader component subtree (5 files) | `568b621` | ProofreaderPage.tsx, ProofreaderHeader.tsx, ProofreaderForm.tsx, ProofreaderOutputModeToggle.tsx, ProofreaderResultPanel.tsx, useSEOData.ts |
| 2 | Register routes and nav links in AppRouter.tsx | `3ce39b4` | chat/src/app/AppRouter.tsx |
| 3 | Add SEO entries to prerender-react.js | `36c585f` | chat/scripts/prerender-react.js |

## Verification Results

- `npx nx build chat`: **PASSED** (webpack compiled successfully)
- `npx nx typecheck chat`: **PASSED** (tsc --noEmit exits 0)
- `npx nx lint chat`: **NOT CONFIGURED** (lint target absent from chat/project.json; ESLint run directly — only "react-hooks/exhaustive-deps rule not found" errors, which are a worktree plugin-config artifact identical to the existing pattern in GenerativeUIPage.tsx)
- No `:any` or `as any` in Proofreader components: **PASSED**
- Byte-identical SEO mirror verified: **PASSED** (grep -F returns 1+ hit per file for both titles and 2+ hits per file for shared description)
- Brownfield boundary: **PASSED** (only 8 expected files changed; mcp/, mcp-client/, devops/awsweb/ untouched)

## Acceptance Criteria Verification

### Task 1

| Check | Result |
|-------|--------|
| `export const ProofreaderPage` | 1 match |
| `export const ProofreaderHeader` | 1 match |
| `export const ProofreaderForm` | 1 match |
| `export const ProofreaderOutputModeToggle` | 1 match |
| `export type OutputMode` | 1 match |
| `export const ProofreaderResultPanel` | 1 match |
| DEFAULT_DEMO_TEXT locked string | 1 match |
| `window-ai.proofreader.language` literal (must be 0 — imported via LOCAL_STORAGE_KEY) | 0 matches |
| `LOCAL_STORAGE_KEY` (import + usage) | 3 matches |
| `useLocation` | 2 matches |
| `startsWith('/proofreader/docs')` (not includes) | 1 match |
| `max-w-6xl mx-auto p-4` | 1 match |
| "Coming in Phase 9" in OutputModeToggle | 2 matches (both disabled buttons) |
| "Documentation coming in Phase 12" | 1 match |
| Locked banner title | 1 match |
| `chrome://flags/#optimization-guide-on-device-model` | 1 match |
| `chrome://flags/#proofreader-api-for-gemini-nano` | 1 match |
| No `:any` / `as any` | PASS |

### Task 2

| Check | Result |
|-------|--------|
| `import {ProofreaderPage}` | 1 match |
| `to="/proofreader"` (desktop + mobile) | 2 matches |
| `path="/proofreader"` | 1 match |
| `path="/proofreader/docs"` | 1 match |
| `proofreader_link` (desktop tracking) | 2 matches (desktop + mobile combined key) |
| `proofreader_link_mobile` (mobile tracking) | 1 match |
| `ProofreaderPage` references | 3 matches (import + 2 Route elements) |
| Existing `/generative-ui` route preserved | 1 match |
| Existing `/webmcp` route preserved | 1 match |

### Task 3

| Check | Result |
|-------|--------|
| `proofreader:` in useSEOData.ts | 1 match |
| `proofreaderDocs:` in useSEOData.ts | 1 match |
| `'/proofreader'` in prerender-react.js | 2 matches (routes + seoConfigs) |
| `'/proofreader/docs'` in prerender-react.js | 2 matches (routes + seoConfigs) |
| `proofreader.html` in prerender-react.js | 1 match |
| `proofreader-docs.html` in prerender-react.js | 1 match |
| Byte-identical title (page) in both files | 1 each |
| Byte-identical title (docs) in both files | 1 each |
| Byte-identical description in both files | 2 each |
| Existing `generativeUI:` preserved | 1 match |
| Existing `'/generative-ui'` preserved | 2+ matches |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Worktree was behind main (missing 08-01 files)**
- **Found during:** Task 1 build attempt
- **Issue:** The worktree was spawned from `9d77db4` (before 08-01 commits landed on main). `ProofreaderService.ts`, updated `MissingFlagBanner.tsx`, and Proofreader ambient types in `dom-chromium-ai.d.ts` were missing from the worktree.
- **Fix:** `git rebase main` — rebased cleanly onto the latest main (f24ff29) without conflicts. Untracked Proofreader component files were preserved through the rebase.
- **Impact:** None — rebase was clean; all Task 1 files remained untracked as expected.

**2. [Rule 3 - Blocking Issue] ProofreaderCorrection not recognized as global type in ResultPanel**
- **Found during:** Task 1 build
- **Issue:** Initial `(c, i)` parameters in `.map()` caused TS7006 (implicit any). After fixing with `(c: ProofreaderCorrection, i: number)`, another TS2304 error appeared because `ProofreaderResultPanel.tsx` doesn't import from `ProofreaderService.ts` and the `declare global` in that file only augments when the file is included as a module. The ambient type in `dom-chromium-ai.d.ts` is properly global.
- **Fix:** Added explicit type annotation `(c: ProofreaderCorrection, i: number)` — the type IS available as ambient global from `dom-chromium-ai.d.ts`. The initial error was because the `declare global` block in `ProofreaderService.ts` has a slightly different interface shape than the one in `dom-chromium-ai.d.ts` but both define `ProofreaderCorrection` globally.
- **Resolution:** After rebase, `ProofreaderCorrection` resolved correctly from `dom-chromium-ai.d.ts`. Build passed cleanly.

**3. [Compile-time coupling] useSEOData.ts changes added to Task 1 commit**
- **Reason:** `ProofreaderPage.tsx` references `seoConfigs.proofreader` and `seoConfigs.proofreaderDocs` at compile time. Without those keys in `useSEOData.ts`, the TypeScript build fails with TS2339.
- **Resolution:** `useSEOData.ts` was staged with the Task 1 commit. `prerender-react.js` (the byte-identical mirror) was committed separately in Task 3 as planned. Net effect: Task 3 only touched `prerender-react.js`.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `ProofreaderOutputModeToggle`: 'Side-by-side' and 'Inline strikethrough' buttons disabled with tooltip "Coming in Phase 9" | `ProofreaderOutputModeToggle.tsx` | Intentional — Phase 9 wires alternate result rendering modes |
| `ProofreaderResultPanel`: non-'plain' mode renders placeholder card | `ProofreaderResultPanel.tsx` | Intentional — Phase 9 implements side-by-side and inline-strikethrough |
| Docs tab content: "Documentation coming in Phase 12." | `ProofreaderPage.tsx` | Intentional — Phase 12 fills with DocsRenderer content |

These stubs do NOT prevent the plan's goal from being achieved. The workbench functions fully for the 'plain' mode (correctedInput + suggestion list), which is the Phase 8 definition of done.

## Smoke Notes (manual verification guide)

Without Chrome flags (any browser):
- `/proofreader` loads with `MissingFlagBanner` showing both flag URLs as code chips, `"Proofreader API isn't enabled in this browser."` title, form is disabled (textarea + button disabled), page does NOT crash.

With Chrome flags (Chrome 146+ Canary with both flags enabled):
- `/proofreader` loads, textarea pre-filled with the locked demo string, language `<select>` defaults to 'en' (or last localStorage value), Proofread button enabled.
- Submit form → `ProofreaderResultPanel` renders `correctedInput` paragraph + bulleted `<ul>` with correction items.
- Error path: if proofread() rejects → inline red error card with message and Retry button; retry re-invokes the call.
- Download path: if getAvailability() returns 'downloadable' → progress bar appears with percentage counter; transitions to 'ready' on completion.

Navigation:
- Desktop nav: "Proofreader" appears between "Generative UI" and "Writer/Rewriter".
- Mobile menu (hamburger): "Proofreader" appears in the same position.
- `/proofreader/docs` → Docs tab active, "Documentation coming in Phase 12." placeholder.
- Clicking Docs tab from `/proofreader` navigates to `/proofreader/docs` (Tabs internal navigation).

localStorage:
- Change language to Spanish → reload → Spanish pre-selected in `<select>`.

## Self-Check: PASSED

All 5 component files exist under `chat/src/app/components/Proofreader/`. All 3 modified files exist. All 3 task commits verified: `568b621`, `3ce39b4`, `36c585f`. Build passes. Typecheck passes. No unexpected file deletions.
