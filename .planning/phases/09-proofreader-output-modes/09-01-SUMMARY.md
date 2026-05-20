---
phase: 09-proofreader-output-modes
plan: "01"
subsystem: chat/Proofreader
tags: [proofreader, diff, output-modes, localStorage, react]
dependency_graph:
  requires: [08-02]
  provides: [PROOF-04]
  affects: [chat/src/app/components/Proofreader]
tech_stack:
  added: []
  patterns:
    - Hand-rolled span diff algorithm (sort-and-walk corrections array)
    - useMemo for segment computation keyed on originalText + corrections
    - Lazy useState initializer for localStorage read on mount
decisions:
  - "Output mode stored as a constant (OUTPUT_MODE_KEY) rather than repeating the literal string — meets read+write requirement via single canonical key reference"
  - "originalText snapshot is captured at proofread-call time (setOriginalText(text) at top of onProofread) — mode switching reuses the snapshotted value, no re-call to ProofreaderService"
  - "ins element styled with style={{ textDecoration: 'none' }} inline in addition to no-underline Tailwind class — ensures browser default <ins> underline is suppressed across all browsers"
key_files:
  created:
    - chat/src/app/components/Proofreader/diffSegments.ts
  modified:
    - chat/src/app/components/Proofreader/ProofreaderResultPanel.tsx
    - chat/src/app/components/Proofreader/ProofreaderOutputModeToggle.tsx
    - chat/src/app/components/Proofreader/ProofreaderPage.tsx
metrics:
  duration_seconds: 183
  completed_date: "2026-05-20"
  task_count: 3
  file_count: 4
---

# Phase 9 Plan 01: Proofreader Output Modes Summary

**One-liner:** Hand-rolled span diff enables side-by-side (red/green mark highlights) and inline-strikethrough (del/ins semantic HTML) output modes with localStorage persistence across reloads.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create diffSegments helper | 0b64f62 | diffSegments.ts (new) |
| 2 | Implement side-by-side + inline-strikethrough rendering | fb71f52 | ProofreaderResultPanel.tsx |
| 3 | Enable toggle options + persist mode in localStorage | 1c68a48 | ProofreaderOutputModeToggle.tsx, ProofreaderPage.tsx |

## What Was Built

### diffSegments.ts (new)

Exports `DiffSegment` type and `buildDiffSegments(original, corrections)` function. The algorithm:
1. Sorts corrections by `startIndex` ascending (defensive copy)
2. Walks original text, emitting `unchanged` segments for gaps
3. Emits paired `removed` (original[start..end]) + `inserted` (correction text) for each span
4. Appends final `unchanged` tail if any characters remain

Handles edge cases: empty corrections array, pure insertions (empty removed text), and documents non-overlapping assumption.

### ProofreaderResultPanel.tsx

Added two new render branches consuming `buildDiffSegments` via `useMemo`:

- **side-by-side:** `grid grid-cols-1 lg:grid-cols-2 gap-4` layout. Left column shows original text with `<mark className="bg-red-100 dark:bg-red-900/30">` on removed segments. Right column shows corrected text with `<mark className="bg-green-100 dark:bg-green-900/30">` on inserted segments. Both columns have `whitespace-pre-wrap` and column headers.
- **inline-strikethrough:** Single column with `<del className="text-red-600 dark:text-red-400 line-through opacity-70">` for removed and `<ins className="text-green-700 dark:text-green-400 font-semibold no-underline">` for inserted. Zero-length segments skipped.
- **plain** branch unchanged from Phase 8.

### ProofreaderOutputModeToggle.tsx

Removed `disabled` attribute, `cursor-not-allowed` class, `opacity-50` class, and "Coming in Phase 9" tooltip from the two non-plain options. All three options are now keyboard-navigable and clickable. The Phase 8 coercion (`mode === 'plain' ? 'plain' : 'plain'`) was removed; `mode` is used directly.

### ProofreaderPage.tsx

- `outputMode` state initialized lazily from `localStorage.getItem('window-ai.proofreader.outputMode')` — validates against `VALID_MODES` array before using, defaults to `'plain'`
- `onModeChange` callback writes to localStorage on change (both read and write wrapped in try/catch for SSR/private-mode safety)
- Mode switch re-renders `ProofreaderResultPanel` from existing `result` + `originalText` state — `ProofreaderService.proofread()` is NOT called again

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Known Stubs

None — all three modes are fully wired to real data from `ProofreadResult.corrections`.

## Self-Check: PASSED

- `diffSegments.ts` exists and exports `buildDiffSegments` and `DiffSegment`
- `ProofreaderResultPanel.tsx` contains `buildDiffSegments`, `grid-cols-1 lg:grid-cols-2`, `<del`, `<ins`
- `ProofreaderOutputModeToggle.tsx` has 0 `disabled` occurrences, 0 "Coming in Phase 9" occurrences
- `ProofreaderPage.tsx` reads and writes `window-ai.proofreader.outputMode` via `OUTPUT_MODE_KEY` constant
- Commits 0b64f62, fb71f52, 1c68a48 exist in git log
- `npx nx typecheck chat` passed
- `npx nx build chat` passed
