---
phase: 11-webcam-capture
fixed_at: 2026-05-20T00:00:00Z
review_path: .planning/phases/11-webcam-capture/11-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-05-20
**Source review:** .planning/phases/11-webcam-capture/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (3 Critical + 4 Warning + IN-02)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Stale `pageState` in `setInterval` callback

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** c5e2c98
**Applied fix:** Added `pageStateRef = useRef<PageState>(pageState)` and a `useEffect` to keep it current. Changed `captureCycle` Pitfall 8 guard from `pageState !== 'ready'` to `pageStateRef.current !== 'ready'`. Removed `pageState` from `captureCycle`'s dependency array (was causing the captured-once-at-start stale value problem).

---

### CR-02: Non-abort errors in `captureCycle` do not stop the live-mode interval

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** 71189a2
**Applied fix:** In the catch block (after the AbortError early-return), added full live-mode teardown: `clearInterval(intervalRef.current)`, `abortControllerRef.current?.abort()`, `stopStream()`, `inFlightRef.current = false`, `setIsLiveActive(false)`, `setMode('idle')`. Added `stopStream` and `setIsLiveActive` to `captureCycle` dep array.

---

### CR-03: Live response accumulates across frames — display never replaced per frame

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`, `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx`
**Commit:** 66fbd1c
**Applied fix:** Added `onFrameStart: () => void` required prop to `MultimodalWebcamProps`. Called `onFrameStart()` inside `captureCycle` immediately before the `reader.read()` loop (after `promptWithImage` returns the stream handle). In `MultimodalChatPanel`, added `handleFrameStart = useCallback(() => setLiveResponse(null), [])` and passed it as `onFrameStart={handleFrameStart}`. `handleLiveChunk` is unchanged — it still appends, but now appends to `null` (fresh state) at the start of each frame rather than to accumulated prior-frame text.

---

### WR-01: Silent failure when `canvas.toBlob()` returns `null`

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** 43c93aa
**Applied fix:** Split the `canvas.toBlob` callback into explicit `if (blob)` and `else` branches. The success path is unchanged. The null path now calls `setErrorState('unknown')`, `setMode('error')`, and `console.warn` instead of silently stopping the stream with no user feedback.

---

### WR-02: `unknown` error state discards `err.message`

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** df546b4
**Applied fix:** Added `errorMessage: string | null` state. In both `handleTakePhoto` and `handleLiveModeStart` catch blocks, after calling `mapMediaError`, set `errorMessage` to `err.message.slice(0, 80)` when the mapped state is `'unknown'` and `err instanceof Error`; otherwise `null`. In `handleDismissError`, added `setErrorMessage(null)`. In JSX, changed the `'unknown'` error body from hardcoded `"Unknown camera error"` to `{errorMessage ?? 'Unknown camera error'}`.

---

### WR-03: `navigator.clipboard.writeText()` unhandled rejection

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** d585128
**Applied fix:** Added `.catch(() => { /* clipboard API unavailable or denied — silent fallback */ })` to `navigator.clipboard.writeText(...)` in `handleCopyChromeUrl`. The `<code>` text remains copy-selectable via standard browser text selection as the fallback.

---

### WR-04: `downsampled.close()` in `finally` — potential use-after-close race

**Files modified:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx`
**Commit:** fb0be9e
**Applied fix:** Moved `downsampled.close()` to immediately after `promptWithImage` returns (before the `reader.read()` loop). Set `downsampled = undefined` to prevent double-close. Updated the `finally` block comment to explain it now only guards the `createImageBitmap`-threw edge case (where `downsampled` is still defined because it was never passed to `promptWithImage`).

---

### IN-02: `isLiveActive` prop optionality allows silent omission

**Files modified:** `chat/src/app/components/Multimodal/MultimodalInput.tsx`
**Commit:** 959ce03
**Applied fix:** Changed `isLiveActive?: boolean` to `isLiveActive: boolean` in `MultimodalInputProps`. Removed the `= false` default from the destructuring signature. `MultimodalChatPanel` already passes the prop explicitly; no callsite changes needed.

---

## Skipped Issues

None — all 7 in-scope findings were fixed.

---

_Fixed: 2026-05-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
