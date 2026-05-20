---
phase: 11-webcam-capture
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - chat/src/app/types/dom-chromium-ai.d.ts
  - chat/src/app/components/Multimodal/MultimodalWebcam.tsx
  - chat/src/app/components/Multimodal/MultimodalChatPanel.tsx
  - chat/src/app/components/Multimodal/MultimodalInput.tsx
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 11 is a well-structured implementation. MediaStream lifecycle (stopStream), ImageBitmap
cleanup (frameBitmap.close / downsampled.close in finally), canvas.toBlob null-check, AbortController
refresh, loadedMetadata gating, pageState mutex separation, no `: any` at new API boundaries,
and the chrome:// copy pattern are all correctly addressed. The TypeScript augmentation for
grabFrame() is correctly placed outside `declare global` to merge with the existing lib.dom.d.ts
`ImageCapture` interface at global scope.

Three blockers were found:

1. The `captureCycle` callback closes over `pageState` directly rather than via a ref. Because
   `setInterval` captures the callback once at live-mode start, any subsequent `pageState` change
   (e.g., the model becoming unavailable mid-session) is invisible to the running interval.

2. Non-abort errors inside `captureCycle` are logged but the live-mode interval is never
   stopped. The comment says "stop live mode to prevent error loop" but the code does not
   do so, causing the loop to keep firing after a fatal error.

3. Live response text accumulates across consecutive frames instead of being replaced. This
   is acknowledged in a comment as a known deviation, but the spec requires per-frame
   replacement, and the accumulated panel will grow unbounded during a long session.

---

## Critical Issues

### CR-01: Stale `pageState` in `setInterval` callback — Pitfall 8 guard is silently bypassed after any `pageState` transition

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:204-271`

**Issue:** `captureCycle` is a `useCallback` with `[pageState, onLiveChunk]` as its dependency
array (line 271). When `pageState` changes, React creates a new `captureCycle` function reference.
However, `setInterval(captureCycle, 3000)` (line 298) captures the function at the moment
`handleLiveModeStart` runs — React does not retroactively update the callback already passed to
`setInterval`. The `pageState` value used inside `captureCycle` is therefore frozen at the
value it had when live mode was started. If `pageState` subsequently changes to `'unavailable'`,
`'error'`, or `'downloading'` (all reachable via `MultimodalPage` → `MultimodalChatPanel` →
`setPageState`), the Pitfall 8 guard on line 206 (`if (pageState !== 'ready') return`) never
fires for the already-running interval. The cycle keeps calling `promptWithImage` on a session
that may no longer be valid.

The `livePrompt` prop is correctly handled via `livePromptRef` (Pattern 5), but `pageState`
receives no equivalent treatment.

**Fix:** Mirror `pageState` into a ref, the same pattern used for `livePrompt`. Read the ref
inside the callback instead of closing over the prop:

```typescript
// Add alongside livePromptRef
const pageStateRef = useRef<PageState>(pageState);
useEffect(() => {
  pageStateRef.current = pageState;
}, [pageState]);

// In captureCycle — replace line 206:
// Before: if (pageState !== 'ready') return;
if (pageStateRef.current !== 'ready') return;

// captureCycle dependency array no longer needs pageState:
}, [onLiveChunk]);  // was [pageState, onLiveChunk]
```

This also makes `handleLiveModeStart`'s dep array stable (`captureCycle` no longer changes
when `pageState` changes), eliminating a secondary churn.

---

### CR-02: Non-abort errors in `captureCycle` do not stop the live-mode interval — error loop

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:258-270`

**Issue:** The comment on line 264 says "stop live mode to prevent error loop" but the catch
block only calls `console.error`. Neither `clearInterval(intervalRef.current)` nor
`setIsLiveActive(false)` nor `setMode('idle')` is called. After a fatal non-abort error
(e.g., `NotSupportedError` from a destroyed session, `DOMException` from `grabFrame()` on a
stopped track), the interval fires again 3 seconds later with the same broken state, logging
the same error repeatedly until the user manually clicks "Stop live". During that time
`inFlightRef.current` is reset to `false` in `finally`, so every cycle enters, fails, and
accumulates errors.

**Fix:** On non-abort errors, tear down live mode exactly as `handleLiveModeStop` does:

```typescript
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return;
  }
  console.error('[MultimodalWebcam] captureCycle error:', err);
  // Stop the live loop — do NOT let it keep firing after a fatal error
  if (intervalRef.current !== null) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  abortControllerRef.current?.abort();
  stopStream();
  inFlightRef.current = false;
  setIsLiveActive(false);
  setMode('idle');
}
```

`stopStream` and `setIsLiveActive` are already in scope via the outer `useCallback` closure.
Because `captureCycle` dep array currently only holds `[pageState, onLiveChunk]`, `stopStream`
and `setIsLiveActive` (both stable refs/callbacks) need to be added to the dep array after
this change.

---

### CR-03: Live response accumulates across frames — display is never replaced per frame

**File:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx:42-48`

**Issue:** The spec (CONTEXT.md § Response Display in Live Mode) states: "New frame → previous
response is replaced (not appended)." The `handleLiveChunk` callback always appends:

```typescript
setLiveResponse((prev) => (prev === null ? { text: chunk } : { text: prev.text + chunk }));
```

The comment at line 42 acknowledges this but characterises it as a "deferred follow-up." This
is a spec violation, not a cosmetic issue. The live panel grows unbounded: after frame 2, the
panel shows all of frame 1's text concatenated with frame 2's streaming chunks. After 10
frames at "Describe what you see in this image", the panel contains ~10× the expected text.
This is functionally broken for the scripted demo scenario.

**Fix:** `MultimodalWebcam.tsx` already calls `onLiveChunk` for each stream chunk but has no
mechanism to signal a new frame start. The minimal fix is to add an `onFrameStart` callback to
the props contract and call it at the beginning of each new streaming loop in `captureCycle`.
The parent clears `liveResponse` to `null` in the callback, so the next chunk initialises a
fresh response.

In `MultimodalWebcam.tsx` — props and captureCycle:

```typescript
// Add to MultimodalWebcamProps:
onFrameStart: () => void; // called at start of each new live frame — parent resets liveResponse

// In captureCycle, immediately before the reader.read() loop:
const reader = stream.getReader();
onFrameStart();           // signals parent to clear previous frame text
let firstChunk = true;
try {
  // ... existing loop unchanged
```

In `MultimodalChatPanel.tsx`:

```typescript
// Replace handleLiveChunk with two callbacks:
const handleFrameStart = useCallback(() => {
  setLiveResponse(null);
}, []);

// handleLiveChunk is unchanged — it still appends, but now appends to a fresh null
// because handleFrameStart already reset it before the first chunk of the new frame arrives.

// Pass to MultimodalWebcam:
onFrameStart={handleFrameStart}
onLiveChunk={handleLiveChunk}
```

---

## Warnings

### WR-01: Silent failure when `canvas.toBlob()` returns `null` — user gets no feedback

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:176-188`

**Issue:** When `canvas.toBlob` returns `null`, the code correctly skips `onFrameAttach` but
still calls `stopStream()` and `setMode('idle')`. The camera stops, the video preview disappears,
and the user sees nothing — no error card, no retry affordance. The user is left staring at an
empty tools row with no indication that the capture silently failed. This can happen legitimately
when `video.videoWidth` is 0 (defensive guard is belt-and-suspenders for the `captureReady`
state gate, but the guard itself only covers the 0×0 case — a JPEG encoder failure returning
null bypasses it).

**Fix:**

```typescript
canvas.toBlob(
  (blob) => {
    if (blob) {
      onFrameAttach(blob);
      stopStream();
      setMode('idle');
      setCaptureReady(false);
    } else {
      // Encoder returned null — surface an error card instead of silent failure
      console.warn('[MultimodalWebcam] canvas.toBlob returned null');
      stopStream();
      setErrorState('unknown');
      setMode('error');
      setCaptureReady(false);
    }
  },
  'image/jpeg',
  0.92,
);
```

---

### WR-02: `unknown` error state discards `err.message` — body always shows hardcoded fallback

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:109-117, 571`

**Issue:** The UI-SPEC (§ Error Cards) specifies that the `'unknown'` variant body should show
`{err.message}` (truncated to 80 chars). The `mapMediaError` helper returns only the error
category string and discards the original error object. The error state type `WebcamErrorState`
holds no message. The rendered body at line 571 is hardcoded to `"Unknown camera error"` for
all unknown errors, including those with descriptive messages from the browser.

**Fix:** Extend the error state to carry an optional message, or store the message separately:

```typescript
// Option A: extend WebcamErrorState to carry the original message
const [errorMessage, setErrorMessage] = useState<string | null>(null);

// In handleTakePhoto / handleLiveModeStart catch block, after setErrorState:
if (mapMediaError(err) === 'unknown' && err instanceof Error) {
  setErrorMessage(err.message.slice(0, 80));
} else {
  setErrorMessage(null);
}

// In JSX, replace line 571:
{errorState === 'unknown' && (
  <p>{errorMessage ?? 'Unknown camera error'}</p>
)}
```

---

### WR-03: `navigator.clipboard.writeText()` promise is not handled — unhandled rejection on permission denial

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:122-124`

**Issue:** `navigator.clipboard.writeText()` returns a `Promise<void>`. The `handleCopyChromeUrl`
callback neither `await`s it nor attaches a `.catch()`. In a context where clipboard access is
denied (secure context requirements, or the user has denied the Clipboard API permission),
the browser throws a `NotAllowedError` that becomes an unhandled promise rejection, producing
a console error and potentially a browser warning.

**Fix:**

```typescript
const handleCopyChromeUrl = useCallback(() => {
  navigator.clipboard.writeText('chrome://settings/content/camera').catch(() => {
    // Clipboard API unavailable or denied — silently ignore; the <code> text is still copyable
    // by the user via standard browser text selection + copy.
  });
}, []);
```

---

### WR-04: `captureCycle` passes `downsampled` to `promptWithImage` then closes it in `finally` — potential use-after-close if service holds a reference

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:236-269`

**Issue:** `downsampled` is passed to `promptWithImage` at line 236, which passes it as an
array element to `session.promptStreaming(...)`. The streaming loop runs to completion (or
until AbortError) before the outer `finally` at line 266 calls `downsampled.close()`. In the
normal completion path this is safe. However, on `AbortError` the catch block returns early
at line 262 — the `finally` block still runs (correct JavaScript behavior), closing the bitmap.

The concern is whether the `LanguageModel.promptStreaming` implementation holds a reference to
the bitmap value during streaming. If Chrome's Gemini Nano implementation reads the bitmap
lazily or holds a reference across `await` suspension points and the abort races with an
internal read, closing the bitmap mid-stream could corrupt the model's internal state. This
is a gray area — the spec does not guarantee when the model stops reading the bitmap.

The safer pattern is to close `downsampled` immediately after `promptWithImage` returns (i.e.,
after the stream handle is obtained, not after all chunks are consumed), before the model
potentially receives an abort:

```typescript
const stream = await promptWithImage(promptText, downsampled, {
  signal: abortControllerRef.current?.signal,
});
// promptWithImage has the stream handle; the model has ingested the bitmap value.
// Close the downsampled bitmap immediately — before the streaming loop.
downsampled.close();
downsampled = undefined;  // prevent double-close in finally

const reader = stream.getReader();
// ... rest of streaming loop
```

Update the `finally` to guard:

```typescript
} finally {
  downsampled?.close(); // already undefined in normal path; guards createImageBitmap throw path
  inFlightRef.current = false;
}
```

---

## Info

### IN-01: `'unknown'` error captured for non-`DOMException` errors from `getUserMedia`

**File:** `chat/src/app/components/Multimodal/MultimodalWebcam.tsx:109-117`

**Issue:** `mapMediaError` returns `'unknown'` for non-`DOMException` errors. In practice
`getUserMedia` only throws `DOMException`, but the fallback branch is reachable if a polyfill
or future browser version changes the throw type. This is low risk for a demo context, but
worth noting that the `'unknown'` branch is a catch-all for both `DOMException` with an
unmapped name and truly unexpected error types.

No code change required — the current fallback is acceptable for a demo context. The WR-02 fix
(surfacing `err.message`) makes this more informative anyway.

---

### IN-02: `isLiveActive` prop on `MultimodalInput` is optional (`isLiveActive?: boolean`) — inconsistent with required usage

**File:** `chat/src/app/components/Multimodal/MultimodalInput.tsx:16`

**Issue:** `isLiveActive` is typed as `boolean | undefined` (optional prop) with a default of
`false` (line 30). It is always passed by `MultimodalChatPanel` so it will never be
`undefined` in practice. The optional typing allows future callsites to forget it without a
type error, which would silently leave the textarea enabled during live mode.

**Fix:** Change to a required `boolean` prop:

```typescript
isLiveActive: boolean;   // was isLiveActive?: boolean
```

If backward compatibility with other callsites is needed, keep optional and add a comment.

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
