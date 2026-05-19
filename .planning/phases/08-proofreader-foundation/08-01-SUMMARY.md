---
phase: "08-proofreader-foundation"
plan: "01"
subsystem: "chat/proofreader"
tags: [proofreader, chrome-ai, service-wrapper, missing-flag-banner, brownfield-refactor, ambient-types]
dependency_graph:
  requires: []
  provides:
    - "Ambient Proofreader API types in dom-chromium-ai.d.ts"
    - "ProofreaderService with pooled sessions"
    - "Generalized MissingFlagBanner at chat/src/app/components/"
  affects:
    - "chat/src/app/components/RecipeWorkbenchPage.tsx (import path)"
    - "chat/src/app/components/GenerativeUIPage.tsx (import path)"
tech_stack:
  added: []
  patterns:
    - "Module-scope Map<string, Promise<T>> session pool keyed by language"
    - "Inline declare global in service files (webpack/babel compilation pattern)"
    - "Optional-props-with-defaults for additive banner extension"
key_files:
  created:
    - "chat/src/app/services/ProofreaderService.ts"
    - "chat/src/app/components/MissingFlagBanner.tsx"
  modified:
    - "chat/src/app/types/dom-chromium-ai.d.ts"
    - "chat/src/app/components/RecipeWorkbenchPage.tsx"
    - "chat/src/app/components/GenerativeUIPage.tsx"
  deleted:
    - "chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx (moved via git mv)"
decisions:
  - "Inline declare global in ProofreaderService.ts required because webpack/babel build does not resolve types declared in dom-chromium-ai.d.ts (only global.d.ts and per-service blocks work in this compilation context)"
  - "ProofreaderConstructor uses interface (not abstract class) since the API is not constructible via new; window.Proofreader is a namespace-style factory"
  - "destroyAllSessions uses eslint-disable-next-line no-empty-function rather than a no-op return because the async destroy is intentionally fire-and-forget cleanup"
metrics:
  duration: "89 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 3
---

# Phase 8 Plan 01: Proofreader types + service + MissingFlagBanner refactor Summary

**One-liner:** Type-safe Proofreader API surface in dom-chromium-ai.d.ts, ProofreaderService with language-keyed session pool and defaults locked to includeCorrectionTypes/Explanations:true, and MissingFlagBanner moved to components/ with additive optional props.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add ambient Proofreader API declarations | 9c86d5b | chat/src/app/types/dom-chromium-ai.d.ts |
| 2 | Create ProofreaderService.ts with pooled sessions | 4519da2 | chat/src/app/services/ProofreaderService.ts |
| 3 | Move MissingFlagBanner + extend + update callers | 1424565 | chat/src/app/components/MissingFlagBanner.tsx + 2 import updates |

## Verification Results

- `npx nx build chat` exit code: 0 (webpack compiled successfully)
- `npx nx lint chat`: target not configured; per-file eslint passes on all new/modified files
- `grep -RF "RecipeWorkbench/MissingFlagBanner" chat/src/app/components/`: 0 hits
- `tsc -p tsconfig.app.json --noEmit`: 0 errors

## Decisions Made

1. **Inline `declare global` in ProofreaderService.ts**: The webpack/babel build uses `tsconfig.app.json` with `include: ["src/**/*.ts"]`. TypeScript project compilation (`tsc --listFiles`) confirms `dom-chromium-ai.d.ts` is included, but the types declared inside its `declare global {}` block are not resolvable from service files (root cause: `tsconfig.app.json` overrides the base `include`, and the webpack compile context differs from `tsc` project-reference mode). All existing service files (TranslateService, WriterService, ChatAIService) follow the same pattern: declare types inline or in their own `declare global` block. The `dom-chromium-ai.d.ts` remains the authoritative documentation and IDE reference; the inline block in the service is what makes the webpack build pass. This is not a duplication — it is the established codebase pattern.

2. **`ProofreaderConstructor` as interface**: The W3C spec and Chrome OT expose `window.Proofreader.create()` and `window.Proofreader.availability()` as static methods on a namespace object (not a constructible class). Using `interface ProofreaderConstructor` is correct; `typeof` references to it are handled via the `Window` augmentation.

3. **Default export added to MissingFlagBanner**: Added `export default MissingFlagBanner` alongside the named export so future import patterns (both `import { MissingFlagBanner }` and `import MissingFlagBanner`) work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline `declare global` block required for webpack compilation**

- **Found during:** Task 2 (ProofreaderService.ts compilation)
- **Issue:** `dom-chromium-ai.d.ts` types (`Proofreader`, `ProofreadResult`, `AICreateMonitor`, `ProofreaderConstructor`) were not resolvable in service files despite `tsc --listFiles` confirming the file was included. Error: `TS2304: Cannot find name 'Proofreader'` on every reference. Investigation showed ALL other service files in the codebase define their types inline (TranslateService: inline `declare global { interface Window { LanguageDetector: ... } }`, ChatAIService: inline `type LMParams`, WriterService: own `declare global`). The `dom-chromium-ai.d.ts` file is compiled but its `declare global {}` block does not propagate to other files in the webpack/babel compilation path.
- **Fix:** Added an inline `declare global` block to `ProofreaderService.ts` containing the Proofreader type definitions. Triple-slash `/// <reference path>` was also tried and did not resolve the issue (same TS2304 errors). Inline block resolved all 9 compilation errors.
- **Files modified:** `chat/src/app/services/ProofreaderService.ts`
- **Commit:** included in 4519da2

**2. [Rule 1 - Bug] ESLint no-empty-function on destroyAllSessions**

- **Found during:** Task 2 lint check
- **Issue:** `promise.then(p => p.destroy()).catch(() => {})` triggered `@typescript-eslint/no-empty-function`
- **Fix:** Added `// eslint-disable-next-line @typescript-eslint/no-empty-function` inline comment — the empty catch is intentional fire-and-forget cleanup on page unmount
- **Files modified:** `chat/src/app/services/ProofreaderService.ts`
- **Commit:** included in 4519da2

### Out-of-Scope Issues Observed (not fixed)

Pre-existing lint errors in `RecipeWorkbenchPage.tsx` (confirmed pre-existing via git stash test):
- `react-hooks/exhaustive-deps` rule not found (lines 227, 239)
- Unused `eslint-disable` directives for `no-console` (lines 141, 212, 239)

These are in scope for a dedicated lint cleanup task, not this plan.

## Banner Smoke Note

The `/webmcp` and `/generative-ui` pages call `<MissingFlagBanner />` with zero props. The new component defaults produce identical output to the old hardcoded component:
- Title: `"WebMCP isn't enabled in this browser."` (same apostrophe via JS string, React escapes automatically)
- Body: The full sentence about Chrome 146+ Canary
- Flags: `[{ name: 'WebMCP', url: 'chrome://flags/#WebMCP', note: 'set to "For testing"' }]` — renders single flag row
- Browser: `"Chrome 146+ Canary"`

The Tailwind classes are preserved verbatim (`mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg`). No visual regression.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `chat/src/app/types/dom-chromium-ai.d.ts` — found with Proofreader types (grep confirmed)
- `chat/src/app/services/ProofreaderService.ts` — found with all 6 exports
- `chat/src/app/components/MissingFlagBanner.tsx` — found at new path
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — confirmed absent
- Commits 9c86d5b, 4519da2, 1424565 — verified via git log
- `npx nx build chat` — webpack compiled successfully (exit 0)
