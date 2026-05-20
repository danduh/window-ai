# Phase 9: Proofreader Output Modes — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 enables the two output modes left disabled in Phase 8 — **side-by-side diff** and **inline strikethrough** — alongside the already-shipping **plain + suggestion list** mode. The output mode toggle becomes fully functional. The last result re-renders instantly when the user switches modes (no re-run of the model). User's mode choice persists across reloads.

Out of scope: any Phase 8 behavior changes, any Multimodal work (Phase 10+), docs markdown (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Diff algorithm
- **Hand-rolled span diff** using the `corrections` array Proofreader already returns. Each correction has `{ startIndex, endIndex, correction }` — Phase 9 walks the original text + sorted corrections list and emits an array of segments: `{ type: 'unchanged' | 'removed' | 'inserted', text: string }`.
- New helper: `chat/src/app/components/Proofreader/diffSegments.ts` exporting `function buildDiffSegments(original: string, corrections: ProofreaderCorrection[]): DiffSegment[]`.
- DiffSegment type: `{ type: 'unchanged' | 'removed' | 'inserted', text: string, correctionTypes?: ProofreaderCorrectionType[], explanation?: string }`.
- Algorithm: sort corrections by `startIndex`; iterate; emit `unchanged` for gaps, then `removed` (original[startIndex..endIndex]) + `inserted` (correction.correction) for each span; emit final `unchanged` tail.
- No new npm dep. ~40 LOC.

### Side-by-side mode rendering
- Two columns inside `ProofreaderResultPanel`: left = original text with `<mark className="bg-red-100 dark:bg-red-900/30">` wrapping each `removed` segment; right = corrected text with `<mark className="bg-green-100 dark:bg-green-900/30">` wrapping each `inserted` segment.
- Columns: Tailwind `grid grid-cols-1 lg:grid-cols-2 gap-4`. On `< 640px` stacks vertically.
- Each column has a small header label: "Original" / "Corrected".
- Both columns preserve `white-space: pre-wrap` so newlines render.

### Inline strikethrough mode rendering
- Single column rendering all segments inline.
- `unchanged` → plain text
- `removed` → `<del className="text-red-600 dark:text-red-400 line-through opacity-70">`
- `inserted` → `<ins className="text-green-700 dark:text-green-400 font-semibold underline decoration-2 decoration-green-500 dark:decoration-green-400 no-underline-offset">` (no underline, just color + bold)

Actually using `<ins>` semantically but with Tailwind disabling the default underline: `no-underline font-semibold text-green-700 dark:text-green-400`.

- Color contrast: red-600 on white background passes WCAG AA; red-400 on dark passes too. Same for green pair.
- `white-space: pre-wrap` to preserve newlines.

### Plain mode (already shipped Phase 8 — no changes needed)
- Phase 8's `'plain'` branch in `ProofreaderResultPanel` stays exactly as-is. Phase 9 only adds the OTHER two branches.

### Output mode toggle
- `ProofreaderOutputModeToggle.tsx` (Phase 8 file) — REMOVE the `disabled` attribute + tooltip on the two non-plain options.
- `outputMode` state lifted to `ProofreaderPage.tsx` (already the case in Phase 8 — verify).
- localStorage key `window-ai.proofreader.outputMode` (default `'plain'`). Read on mount, write on change.
- Type: `type OutputMode = 'plain' | 'side-by-side' | 'inline-strikethrough'`.

### Re-render without re-running model
- The last `ProofreadResult` is kept in `ProofreaderPage` state. Changing `outputMode` does NOT re-call `ProofreaderService.proofread()` — the result + corrections are reused. `ProofreaderResultPanel` re-renders cheaply.

### Claude's Discretion
- Exact mark colors (red/green shades) — planner picks but stays within the v1.0 / v1.1 color tokens
- Whether to add a "Copy corrected" button in plain/side-by-side modes — planner can include if trivial; otherwise defer to Phase 12 polish
- Animation on mode switch — planner can add a subtle `transition-opacity` if it doesn't add complexity

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/components/Proofreader/ProofreaderResultPanel.tsx` (Phase 8) — the file getting two new render branches
- `chat/src/app/components/Proofreader/ProofreaderOutputModeToggle.tsx` (Phase 8) — enable the disabled options
- `chat/src/app/components/Proofreader/ProofreaderPage.tsx` (Phase 8) — `outputMode` state already lifted here; lastResult should also be here. localStorage persistence wiring goes here.
- `chat/src/app/services/ProofreaderService.ts` (Phase 8) — unchanged; the `ProofreadResult.corrections` array is what powers the diff

### Established Patterns
- Tailwind dark-mode `:dark` variants on every color token
- Module-scope helpers in `Proofreader/` subdir for non-component utilities (mirrors `chat/src/app/components/GenerativeUI/iframe/` pattern from v1.1)
- TS strict, no `: any`

### Integration Points
- `ProofreaderResultPanel.tsx` imports `buildDiffSegments` from the new `./diffSegments.ts`
- `ProofreaderOutputModeToggle.tsx` removes the `disabled` flag + tooltip on non-plain options
- `ProofreaderPage.tsx` adds localStorage read/write for `outputMode`

</code_context>

<specifics>
## Specific Ideas

- The default demo text `"i think there going to a meetting tommorow at the office. there progress have been great on the project!"` should produce a useful demo across all three modes: side-by-side shows the lowercase 'i' fix on the left + 'I' on the right; inline-strikethrough shows `there going to a ~~meetting~~ ~~tommorow~~ → meeting tomorrow`; plain shows the bulleted list. Demonstrates each mode's strength immediately.

</specifics>

<deferred>
## Deferred Ideas

- "Copy corrected text" button — Phase 12 polish if user demand surfaces
- Diff line numbers / per-paragraph anchoring — out of v1.2 scope
- Mode-specific URL query param for shareable links — out of scope; localStorage is enough
- Streaming partial results during proofreading — research notes `proofreadStreaming()` was broken in OT; defer to v1.3 verification

</deferred>
