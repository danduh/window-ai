# Phase 11: Webcam Capture — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 4 (1 new + 2 modified + 1 type augmentation)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `chat/src/app/components/Multimodal/MultimodalWebcam.tsx` | component | streaming + event-driven | `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` | role-match (lifecycle refs + streaming reader loop) |
| `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` | component — EXTEND | streaming | itself (lines 1–262) | exact (brownfield add) |
| `chat/src/app/components/Multimodal/MultimodalInput.tsx` | component — EXTEND | event-driven | itself (lines 1–176) | exact (brownfield add) |
| `chat/src/app/types/dom-chromium-ai.d.ts` | types — EXTEND | — | itself — existing `declare global { interface ... }` augmentations | exact (declaration-merge pattern) |

**No new files needed in:** `MultimodalService.ts`, `MultimodalTranscript.tsx`, `imageFileValidation.ts`, `MultimodalPage.tsx` — all unchanged per CONTEXT.md.

---

## Pattern Assignments

---

### `chat/src/app/types/dom-chromium-ai.d.ts` (types, augmentation)

**Analog:** itself — existing `declare global { interface ... }` blocks at lines 1–198.

**Existing augmentation pattern** (lines 1–9, structure to copy):
```typescript
declare global {
  interface LanguageModelParams {
    readonly defaultTopK: number;
    // ...
  }
  // other interfaces follow the same shape
}
```

**Insertion: Add `grabFrame()` to the existing `ImageCapture` interface** (new block, append after line 198 or inline with the existing `declare global`):
```typescript
// grabFrame() is absent from TypeScript 5.9.2 lib.dom.d.ts — verified by grep (0 occurrences).
// Declaration-merging with the lib.dom.d.ts ImageCapture interface (which declares
// takePhoto, getPhotoCapabilities, getPhotoSettings, track).
// MDN: https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/grabFrame
declare global {
  interface ImageCapture {
    grabFrame(): Promise<ImageBitmap>;
  }
}
```

This is the ONLY required change to `dom-chromium-ai.d.ts`. The `MultimodalLanguageModel` interface (multimodal promptStreaming overload) lives in `MultimodalService.ts` only — do NOT add it here (per Phase 10 PATTERNS note 2).

---

### `chat/src/app/components/Multimodal/MultimodalWebcam.tsx` (NEW component, streaming + event-driven)

**Primary analog:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx`

Reason: same ref-based lifecycle pattern (AbortController, cleanup useEffect), same streaming reader loop (`reader.read()` + `releaseLock()` in finally), same `DOMException` error handling, same `pageState` gate. The webcam-specific APIs (MediaStream, ImageCapture, setInterval) have no codebase analog — use RESEARCH.md patterns for those.

**Imports pattern** — copy from `MultimodalChatPanel.tsx` lines 1–6, extend for webcam:
```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type PageState } from './MultimodalPage';
import { promptWithImage } from '../../services/MultimodalService';
```

**Props interface** (source: CONTEXT.md § Component Layout — locked):
```tsx
interface MultimodalWebcamProps {
  pageState: PageState;
  livePrompt: string;           // textarea text from parent (or '' for empty)
  onFrameAttach: (blob: Blob) => void; // single-frame path → calls setPendingImage
  setIsLiveActive: (b: boolean) => void;
  onLiveChunk: (text: string) => void; // accumulates into liveResponse state in parent
}
```

**Mode and error state types** (source: RESEARCH.md § Pattern 2):
```tsx
type WebcamMode = 'idle' | 'preview' | 'live' | 'error';
type WebcamErrorState = 'blocked' | 'no-camera' | 'in-use' | 'unknown' | null;
```

**Ref inventory** — mirrors `MultimodalChatPanel.tsx` lines 31–35, extended for webcam:
```tsx
// Non-reactive state — useRef keeps these out of the render cycle
const streamRef      = useRef<MediaStream | null>(null);
const videoRef       = useRef<HTMLVideoElement>(null);
const canvasRef      = useRef<HTMLCanvasElement>(null);
const imageCaptureRef = useRef<ImageCapture | null>(null);
const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
const inFlightRef    = useRef<boolean>(false);
const abortControllerRef = useRef<AbortController | null>(null); // fresh per live-session start
// Stale-closure safety for livePrompt inside setInterval (RESEARCH Pitfall 5):
const livePromptRef  = useRef<string>(livePrompt);
```

**Stale-closure mirror effect** (source: RESEARCH.md § Pattern 5):
```tsx
useEffect(() => {
  livePromptRef.current = livePrompt;
}, [livePrompt]);
```

**Single cleanup effect** — copy shape from `MultimodalChatPanel.tsx` lines 85–89, extend for webcam resources:
```tsx
// StrictMode-safe: no async work on mount → no double-getUserMedia race.
// Camera is requested only on user click, so this cleanup runs on a
// null streamRef in dev StrictMode's simulated remount — ?. handles it.
useEffect(() => {
  return () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    imageCaptureRef.current = null;
    abortControllerRef.current?.abort();
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    inFlightRef.current = false;
  };
}, []); // empty deps — cleanup-only effect, matches Phase 10 Plan 02 pattern
```

**getUserMedia error handling** — mirrors `MultimodalChatPanel.tsx` lines 62–78 (DOMException + AbortError pattern), adapted for camera errors:
```tsx
// Source: CONTEXT.md § Permission / Error Handling (locked)
catch (err) {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError')       setErrorState('blocked');
    else if (err.name === 'NotFoundError' ||
             err.name === 'OverconstrainedError') setErrorState('no-camera');
    else if (err.name === 'NotReadableError') setErrorState('in-use');
    else                                      setErrorState('unknown');
  } else {
    setErrorState('unknown');
  }
  setMode('error');
}
```

**Streaming reader loop** — copy exactly from `MultimodalChatPanel.tsx` lines 48–61 (Pitfall 1 comment + `reader.read()` + `releaseLock` in finally):
```tsx
// Pitfall 1: use reader.read() loop, NOT for-await; releaseLock in finally
const reader = stream.getReader();
let firstChunk = true;
try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (firstChunk) {
      setLastLatencyMs(Math.round(performance.now() - t0));
      firstChunk = false;
    }
    onLiveChunk(value);
  }
} finally {
  reader.releaseLock();
}
```

**AbortError silent-swallow** — copy from `MultimodalChatPanel.tsx` lines 65–68:
```tsx
// WR-01 equivalent: AbortError = intentional cancel (toggle-off or unmount)
if (err instanceof DOMException && err.name === 'AbortError') {
  return; // silent — live mode was intentionally stopped
}
```

**AbortController per-session creation** (source: RESEARCH.md § Pitfall 6 — must create fresh on each live-start, not reuse an aborted one):
```tsx
// On "Live mode" button click — create FRESH AbortController (never reuse aborted one)
abortControllerRef.current = new AbortController();
```

**canvas.toBlob() wrapper** (source: RESEARCH.md § Pattern 2 — callback-based, NOT a Promise):
```tsx
// canvas.toBlob is void/callback (TS 5.9.2 lib.dom.d.ts). Must set dimensions first.
canvas.width = video.videoWidth;    // guard against 0×0 (Pitfall 7)
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
if (!ctx) return;
ctx.drawImage(video, 0, 0);
canvas.toBlob(
  (blob) => {
    if (blob) onFrameAttach(blob);
    // After capture: stop stream and return to idle
    stopStream();
    setMode('idle');
  },
  'image/jpeg',
  0.92,
);
```

**stopStream helper** — mirrors `stream.getTracks().forEach(t => t.stop())` from CONTEXT.md, with ref nulling (RESEARCH Pitfall — imageCaptureRef must also be nulled):
```tsx
function stopStream(): void {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  imageCaptureRef.current = null; // prevent stale grabFrame() call
}
```

**Live capture cycle gating** (source: CONTEXT.md § Live Mode Loop — locked):
```tsx
async function captureCycle(): Promise<void> {
  if (inFlightRef.current) {
    setWasSkipped(true);
    setTimeout(() => setWasSkipped(false), 500);
    return;
  }
  // Pitfall 8: guard pageState before firing prompt
  if (pageState !== 'ready') return;
  inFlightRef.current = true;
  const t0 = performance.now();
  let downsampled: ImageBitmap | undefined;
  try {
    const frameBitmap = await imageCaptureRef.current!.grabFrame();
    downsampled = await createImageBitmap(frameBitmap, {
      resizeWidth: 512,
      resizeHeight: 512,
    });
    frameBitmap.close(); // free full-res immediately (Pitfall 4)
    const promptText =
      livePromptRef.current.trim() || 'Describe what you see in this image';
    const stream = await promptWithImage(promptText, downsampled, {
      signal: abortControllerRef.current?.signal,
    });
    // ... streaming reader loop (see reader pattern above)
  } finally {
    downsampled?.close(); // safe even if createImageBitmap threw (Pitfall 4)
    inFlightRef.current = false;
  }
}
```

**Error card chrome:// copy pattern** — adapted from `MissingFlagBanner.tsx` lines 39–48 (`<code>` element with mono font, gray background). Phase 11 adds `onClick` copy:
```tsx
// MissingFlagBanner.tsx lines 39–48 (existing pattern: <code> as static display)
// Phase 11 extension: onClick → navigator.clipboard.writeText (no <a href="chrome://...">)
<code
  className="block mt-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200
             px-2 py-1 rounded font-mono text-xs cursor-pointer
             hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
  onClick={() => navigator.clipboard.writeText('chrome://settings/content/camera')}
  title="Click to copy"
  aria-label="Copy chrome://settings/content/camera to clipboard"
>
  chrome://settings/content/camera
</code>
```

**Video element** (no codebase analog — Web API only):
```tsx
<video
  ref={videoRef}
  className="w-full h-full object-cover animate-fade-in"
  autoPlay
  muted
  playsInline
  aria-label="Webcam live preview"
/>
<canvas ref={canvasRef} className="hidden" aria-hidden="true" />
```

**Perf badge** (source: CONTEXT.md § Perf Indicator — locked Tailwind classes):
```tsx
// absolute bottom-2 right-2 (locked position from CONTEXT.md)
<div
  className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded"
  aria-live="off"
>
  {wasSkipped
    ? '3s interval · skipped (in flight)'
    : lastLatencyMs === null
      ? '3s interval · …'
      : `3s interval · last: ${lastLatencyMs} ms`}
</div>
```

**Tools row pill button** — mirrors send button from `MultimodalInput.tsx` line 121–126 (focus ring, disabled, transition-colors), adapted to pill/gray:
```tsx
// "Take photo" pill — idle state
<button
  onClick={handleTakePhoto}
  disabled={isLiveActive || pageState !== 'ready'}
  className="flex items-center gap-1.5 px-3 py-2 rounded-lg
             bg-gray-100 dark:bg-gray-700
             text-gray-700 dark:text-gray-300
             text-sm font-medium
             hover:bg-gray-200 dark:hover:bg-gray-600
             disabled:opacity-60 disabled:cursor-not-allowed
             transition-colors duration-200
             focus:outline-none focus:ring-2 focus:ring-primary-500
             focus:ring-offset-2 dark:focus:ring-offset-gray-800"
>
  {/* camera SVG w-4 h-4 aria-hidden */}
  Take photo
</button>
```

---

### `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` (EXTEND — 3 insertion points)

**Analog:** itself (current file at lines 1–262).

**New state to add** (after existing `isDragOver` state, around line 28):
```tsx
// Phase 11 additions: live mode state
const [isLiveActive, setIsLiveActive] = useState(false);
const [liveResponse, setLiveResponse] = useState<{ text: string } | null>(null);
```

**onLiveChunk callback** (call site for `<MultimodalWebcam onLiveChunk={...}>`):
```tsx
const handleLiveChunk = useCallback((chunk: string) => {
  setLiveResponse((prev) =>
    prev === null
      ? { text: chunk }
      : { text: prev.text + chunk }
  );
}, []);

const handleLiveStart = useCallback(() => {
  setLiveResponse(null); // clear previous response on each new frame
}, []);
```

**Transcript visibility toggle** — wrap existing transcript `<div>` (line 229) with visibility:hidden during live mode:
```tsx
{/* visibility:hidden — not unmounted — preserves DOM + scroll + object URLs during live mode */}
<div className={isLiveActive ? 'invisible flex-1 min-h-0' : 'flex-1 min-h-0 overflow-y-auto'}>
  <MultimodalTranscript messages={messages} onRetry={handleRetry} />
</div>
```

**Live response panel** — inline JSX block, insert between transcript div and download progress bar:
```tsx
{/* Live response panel — shown only while live mode is active */}
{isLiveActive && (
  <div className="mt-2 mb-2">
    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700
                    text-gray-800 dark:text-gray-200
                    text-base font-medium leading-relaxed animate-fade-in">
      {liveResponse === null ? (
        <span className="animate-pulse text-gray-500 dark:text-gray-400 font-medium">
          Thinking…
        </span>
      ) : (
        liveResponse.text
      )}
    </div>
  </div>
)}
```

**MultimodalInput extension** — add two new props to the `<MultimodalInput>` call (lines 249–258):
```tsx
<MultimodalInput
  text={text}
  setText={setText}
  pendingImage={pendingImage}
  setPendingImage={setPendingImage}
  onSend={handleSend}
  pageState={pageState}
  mimeError={mimeError}
  setMimeError={setMimeError}
  isLiveActive={isLiveActive}        {/* Phase 11: disables textarea + send row */}
  webcamSlot={                        {/* Phase 11: renders tools row + video preview */}
    <MultimodalWebcam
      pageState={pageState}
      livePrompt={text}
      onFrameAttach={(blob) => setPendingImage(blob)}
      setIsLiveActive={setIsLiveActive}
      onLiveChunk={handleLiveChunk}
    />
  }
/>
```

**Import addition** (after line 5):
```tsx
import { MultimodalWebcam } from './MultimodalWebcam';
```

---

### `chat/src/app/components/Multimodal/MultimodalInput.tsx` (EXTEND — 2 new props + 2 conditional renders)

**Analog:** itself (current file at lines 1–176).

**New props interface** — extend existing `MultimodalInputProps` (lines 5–15):
```tsx
interface MultimodalInputProps {
  text: string;
  setText: (text: string) => void;
  pendingImage: Blob | null;
  setPendingImage: (blob: Blob | null) => void;
  onSend: () => void;
  pageState: PageState;
  mimeError: string | null;
  setMimeError: (error: string | null) => void;
  // Phase 11 additions:
  isLiveActive?: boolean;          // disables textarea + hides send row, replaces with badge
  webcamSlot?: React.ReactNode;    // <MultimodalWebcam> rendered above thumbnail preview
}
```

**webcamSlot render** — insert at top of return, before existing `pendingImage` block (line 93):
```tsx
{/* Phase 11: webcam tools row + video preview (rendered by parent as <MultimodalWebcam>) */}
{webcamSlot && (
  <div className="mb-2">{webcamSlot}</div>
)}
```

**Textarea disabled extension** — modify line 115 to include `isLiveActive`:
```tsx
// Before (line 115):
disabled={pageState === 'unavailable' || pageState === 'prompting'}

// After:
disabled={isLiveActive || pageState === 'unavailable' || pageState === 'prompting'}
// + add className conditionals for opacity-60 cursor-not-allowed when isLiveActive
```

**Send row / prompt-lock badge switch** — replace existing `<div className="flex justify-end mt-2">` block (lines 120–173) with conditional:
```tsx
{isLiveActive ? (
  // Prompt lock badge replaces send button during live mode (UI-SPEC § Prompt Lock Badge)
  <div className="flex items-center justify-center mt-2">
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                     bg-gray-100 dark:bg-gray-700
                     text-xs font-medium text-gray-500 dark:text-gray-400">
      Live mode active — prompt locked
    </span>
  </div>
) : (
  // Existing send button row — UNCHANGED from Phase 10 (lines 120–173)
  <div className="flex justify-end mt-2">
    <button
      onClick={onSend}
      disabled={!canSend}
      title={sendButtonTooltip}
      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    >
      {/* spinner / paper-plane SVG + label — unchanged */}
    </button>
  </div>
)}
```

---

## Shared Patterns

### Streaming Reader Loop (Pitfall 1)
**Source:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` lines 48–61
**Apply to:** `MultimodalWebcam.tsx` live capture cycle — DO NOT use `for await...of`
```tsx
// Pitfall 1: use reader.read() loop, NOT for-await; releaseLock in finally
const reader = stream.getReader();
try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // ... process value
  }
} finally {
  reader.releaseLock();
}
```

### AbortError Silent Swallow
**Source:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` lines 65–68
**Apply to:** `MultimodalWebcam.tsx` captureCycle catch block
```tsx
if (err instanceof DOMException && err.name === 'AbortError') {
  return; // intentional cancel — no error state
}
```

### Cleanup useEffect (Single, Empty Deps)
**Source:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` lines 85–89
**Apply to:** `MultimodalWebcam.tsx` — extend with MediaStream + interval teardown
```tsx
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

### Focus Ring
**Source:** `chat/src/app/components/Multimodal/MultimodalInput.tsx` line 103, 125
**Apply to:** All new buttons in `MultimodalWebcam.tsx` (Take photo, Live mode, Capture, Cancel, dismiss ×)
```tsx
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
```

### Dark Mode Color Tokens
**Source:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` lines 207–211
**Apply to:** `MultimodalWebcam.tsx` all elements
- Surface: `bg-gray-100 dark:bg-gray-700`
- Text: `text-gray-700 dark:text-gray-300`
- Error: `text-red-600 dark:text-red-400`
- Accent (Capture button): `bg-primary-500 hover:bg-primary-600 text-white`
- Active live mode: `bg-primary-600 hover:bg-primary-700 text-white`

### `<code>` URL Display (no `<a href="chrome://...">`)
**Source:** `chat/src/app/components/MissingFlagBanner.tsx` lines 39–48
**Apply to:** `MultimodalWebcam.tsx` blocked error card — chrome:// URL rendered as `<code>` with `onClick` copy
```tsx
// MissingFlagBanner uses: bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm
// Phase 11 adds cursor-pointer + onClick for clipboard copy
```

### `animate-fade-in` (existing keyframe — no new keyframes)
**Source:** `chat/tailwind.config.js` (already defined, used throughout Phase 10)
**Apply to:** `MultimodalWebcam.tsx` — `<video>` element appearance, error card appearance, live response panel first render

---

## No Analog Found

Files with no close codebase match (use RESEARCH.md patterns directly):

| Pattern | Location | Reason |
|---|---|---|
| `navigator.mediaDevices.getUserMedia()` | `MultimodalWebcam.tsx` handleTakePhoto / handleLiveMode | No MediaStream usage anywhere in `chat/src` (grep confirmed 0 results) |
| `new ImageCapture(track)` + `.grabFrame()` | `MultimodalWebcam.tsx` captureCycle | No ImageCapture usage in codebase |
| `canvas.toBlob(callback, 'image/jpeg', 0.92)` | `MultimodalWebcam.tsx` single-frame capture | No canvas draw pattern in `chat/src` |
| `createImageBitmap(bitmap, { resizeWidth, resizeHeight })` | `MultimodalWebcam.tsx` captureCycle | No ImageBitmap manipulation in codebase |
| `setInterval` / `clearInterval` live loop | `MultimodalWebcam.tsx` live mode | No polling/interval pattern in `chat/src` |
| `performance.now()` latency measurement | `MultimodalWebcam.tsx` perf badge | No perf timing in codebase — use RESEARCH.md § Pattern 3 |
| `loadedmetadata` event gating Capture button | `MultimodalWebcam.tsx` preview mode | No video element in codebase — use RESEARCH.md § Open Question 1 |

---

## Critical Implementation Notes for Planner

1. **Wave 0 (hard blocker):** `grabFrame()` augmentation in `dom-chromium-ai.d.ts` must land before any `MultimodalWebcam.tsx` code that calls `imageCaptureRef.current!.grabFrame()`. The TypeScript build will fail without it.

2. **`canvas.toBlob()` is a callback, NOT a Promise.** `canvas.toBlob(callback, type, quality)` returns `void`. The callback receives `Blob | null`. Always null-check and set `canvas.width = video.videoWidth; canvas.height = video.videoHeight` before `ctx.drawImage()` to prevent 0×0 canvas (Pitfall 3 + 7).

3. **`imageCaptureRef.current` must be nulled together with `streamRef.current`** in `stopStream()`. If only the stream is stopped, subsequent `grabFrame()` on the dead track throws. See RESEARCH.md Pitfall listing.

4. **Fresh `AbortController` on each live-session start.** After `abort()` is called, `signal.aborted` is permanently `true` — the old controller cannot be reused (RESEARCH.md Pitfall 6). Create `new AbortController()` at the top of the live-start handler.

5. **`MultimodalService.ts` is UNCHANGED.** The existing `promptWithImage(text, Blob | ImageBitmap, { signal })` signature already accepts `ImageBitmap` directly from `grabFrame()`. Session reuse is free.

6. **`livePrompt` inside `setInterval` callback must read from `livePromptRef.current`**, not from the prop directly — the closure captures the value at interval-creation time (RESEARCH.md Pitfall 5).

7. **Both `frameBitmap.close()` and `downsampled.close()` are mandatory** in every captureCycle path (RESEARCH.md Pitfall 4). `frameBitmap.close()` immediately after `createImageBitmap` resolves; `downsampled.close()` in the `finally` block.

8. **Brownfield constraint:** `MultimodalPage.tsx`, `MultimodalTranscript.tsx`, `imageFileValidation.ts`, `MultimodalService.ts` — NO modifications.

---

## Metadata

**Analog search scope:** `chat/src/app/components/Multimodal/`, `chat/src/app/services/`, `chat/src/app/components/MissingFlagBanner.tsx`, `chat/src/app/types/dom-chromium-ai.d.ts`
**Files scanned:** 5 analog files read in full (`MultimodalChatPanel.tsx`, `MultimodalInput.tsx`, `MultimodalService.ts`, `MissingFlagBanner.tsx`, `dom-chromium-ai.d.ts`)
**Confirmed no MediaStream analog:** grep of entire `chat/src` for `getUserMedia`, `MediaStream`, `videoRef`, `srcObject`, `ImageCapture`, `grabFrame`, `webcam`, `camera` — 0 matches (excluding the transcript type file)
**Pattern extraction date:** 2026-05-20
