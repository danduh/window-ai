# Phase 11: Webcam Capture — Research

**Researched:** 2026-05-20
**Domain:** MediaStream API / ImageCapture API / React lifecycle / TypeScript declarations
**Confidence:** HIGH (all critical claims verified against local TypeScript lib and codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- New component `MultimodalWebcam.tsx` owns camera lifecycle (MediaStream, ImageCapture, error state, live loop)
- Tools row: two pill buttons "Take photo" + "Live mode" above textarea in `MultimodalInput.tsx`
- Video preview replaces thumbnail-preview slot (mutually exclusive with `pendingImage` state), ~240×180
- getUserMedia video constraints: `{ width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false`
- Single-frame capture via `<canvas>.toBlob(..., 'image/jpeg', 0.92)` (NOT `ImageCapture.takePhoto()`)
- Live mode: `setInterval(captureCycle, 3000)` with `ImageCapture.grabFrame()` + `createImageBitmap(frame, { resizeWidth: 512, resizeHeight: 512 })`
- Single-in-flight gating via `inFlightRef = useRef<boolean>(false)`
- Both `frameBitmap.close()` and `downsampled.close()` called explicitly in finally block
- Loop teardown: `clearInterval`, AbortController abort, stream tracks stop, reset refs
- Live response panel replaces transcript (visibility:hidden, not unmounted) during live mode
- Session reuse via existing module-scope `sessionPromise` in `MultimodalService.ts` (no changes to service)
- Error mapping: `NotAllowedError` → `'blocked'`, `NotFoundError`/`OverconstrainedError` → `'no-camera'`, `NotReadableError` → `'in-use'`
- `chrome://` link rendered as `<code>` with copy-on-click, matching `MissingFlagBanner` pattern
- Perf indicator: `absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded`
- Single `useEffect(() => () => cleanup(), [])` for unmount — matches Phase 10 Plan 02 pattern
- `MultimodalInput.tsx` gains two new props: `isLiveActive: boolean`, `webcamSlot?: React.ReactNode`
- `MultimodalChatPanel.tsx` adds `isLiveActive`, `liveResponse` state; mounts `<MultimodalWebcam>`
- Permission requested ONLY on user click — never on mount

### Claude's Discretion

- Exact emoji vs SVG icons for "Take photo" / "Live mode" buttons (SVG preferred per CLAUDE.md accessibility)
- Exact button copy ("Take photo" — already matched to ROADMAP SC-1)
- Whether "Live mode" toggle is a stateful button or switch component (button, matching v1.0/v1.1 pattern)
- Whether live response panel shows avatar/role indicator (no — minimal per CONTEXT.md)
- Tailwind specifics for dismissable × on error cards
- Whether `chrome://settings/content/camera` shows as `<code>` copy element (yes — consistent with MissingFlagBanner)

### Deferred Ideas (OUT OF SCOPE)

- Configurable capture interval slider (fixed 3000ms)
- "Slow mode" diagnostics view (console only)
- `ImageCapture.takePhoto()` for single-frame (canvas pattern is reliable)
- Video facing mode toggle (front camera only)
- Recording / saving frames
- `/multimodal/docs` markdown (Phase 12 DOC-02)
- 5-cold-run rehearsal log (Phase 12 POLISH-01)
- Audio input (v1.3)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MULTI-04 | Webcam single-frame capture — getUserMedia, live preview, canvas snap, attaches Blob | getUserMedia constraints locked; canvas.toBlob(cb, 'image/jpeg', 0.92) fully typed in TS 5.9.2; blob routes into existing setPendingImage path |
| MULTI-05 | Webcam continuous live — 3s loop, grabFrame, 512×512 downsample, single-in-flight | grabFrame MISSING from lib.dom.d.ts — requires augmentation in dom-chromium-ai.d.ts; createImageBitmap(bitmap, {resizeWidth, resizeHeight}) IS typed; session reuse is free side-effect of module-scope sessionPromise |
| MULTI-08 | Camera permission UX — NotAllowedError card, no-camera card, no auto-prompt | Error names confirmed as DOMException.name values; chrome:// copy pattern confirmed from MissingFlagBanner.tsx |
| POLISH-02 | Webcam-live perf indicator — 3s interval · last: N ms badge | performance.now() delta from prompt-start to first ReadableStream chunk; badge state machine: pending → normal → skipped (500ms flash) |

</phase_requirements>

---

## Summary

Phase 11 adds a `MultimodalWebcam.tsx` component to the existing Phase 10 `/multimodal` chat panel. It provides two input paths: (1) single-frame snap via canvas, and (2) a live loop using `ImageCapture.grabFrame()` every 3 seconds. The Phase 10 codebase is a clean foundation — `MultimodalService.ts` already accepts `ImageBitmap` alongside `Blob`, the module-scope `sessionPromise` provides free session reuse, and the existing `AbortController` pattern extends naturally to the live loop.

The single most important finding is that **`grabFrame()` is absent from TypeScript 5.9.2's `lib.dom.d.ts`**. The `ImageCapture` interface exists in the lib (constructor, `takePhoto`, `track`, `getPhotoCapabilities`, `getPhotoSettings`) but `grabFrame(): Promise<ImageBitmap>` is missing. This must be added to `dom-chromium-ai.d.ts` before any live mode code compiles — this is a Wave 0 task.

The second important finding is that **`canvas.toBlob()` uses a callback pattern** (not a Promise), which requires either a `Promise` wrapper or a direct callback in the capture handler. The TypeScript signature is `toBlob(callback: BlobCallback, type?: string, quality?: number): void`. The planner must account for this async shape in the capture flow.

React `StrictMode` is active (`chat/src/main.tsx` wraps the app). The webcam component must guard against double-invocation: the cleanup-only effect pattern (`useEffect(() => () => cleanup(), [])`) avoids any async work on mount, so StrictMode is safe by design — the CONTEXT.md decision to request camera only on user click (not on mount) eliminates the StrictMode double-getUserMedia race entirely.

**Primary recommendation:** Add `grabFrame(): Promise<ImageBitmap>` to `dom-chromium-ai.d.ts` as Wave 0, then implement `MultimodalWebcam.tsx` as a single-file component with all lifecycle owned by refs (`streamRef`, `imageCaptureRef`, `intervalRef`, `inFlightRef`, `abortControllerRef`), a single cleanup effect, and no async work on mount.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Camera permission + MediaStream lifecycle | Browser / Client (`MultimodalWebcam.tsx`) | — | getUserMedia is a browser API; ownership entirely in the component |
| Frame capture (canvas + ImageCapture) | Browser / Client (`MultimodalWebcam.tsx`) | — | `<canvas>` draw and `grabFrame()` are client-side only |
| Image downsampling | Browser / Client (`MultimodalWebcam.tsx`) | — | `createImageBitmap` is a client-side API |
| Model session creation + reuse | Service layer (`MultimodalService.ts`) | — | Module-scope `sessionPromise` already implements this; unchanged |
| Prompt dispatch + streaming | Service layer (`MultimodalService.ts`) | — | `promptWithImage(text, bitmap, {signal})` handles both Blob and ImageBitmap |
| Live response state | Frontend / `MultimodalChatPanel.tsx` | — | Parent component owns transcript + live response toggle |
| Perf measurement | Browser / Client (`MultimodalWebcam.tsx`) | — | `performance.now()` delta measured at first ReadableStream chunk |
| Error state display | Browser / Client (`MultimodalWebcam.tsx`) | — | Error cards rendered in the video preview slot |

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `ImageCapture` (Web API) | Chrome 148+ | `grabFrame()` for live capture | Native browser API; no package needed |
| `MediaDevices.getUserMedia` | Web API | Camera access | Standard; no package needed |
| `HTMLCanvasElement.toBlob` | Web API | Single-frame JPEG encoding | Reliable cross-platform; preferred over `takePhoto()` |
| `createImageBitmap` | Web API | Downsample to 512×512 | Typed in TS 5.9.2 lib.dom.d.ts with `ImageBitmapOptions.resizeWidth/resizeHeight` |
| React 19 `useRef` / `useEffect` | 19.x (existing) | Ref-based lifecycle management | Matches Phase 10 established pattern |
| `performance.now()` | Web API | Time-to-first-token measurement | Sub-millisecond precision; no import |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `AbortController` | Web API | Cancel in-flight prompt on unmount/toggle-off | Already used in Phase 10; extend the same instance |
| `setInterval` / `clearInterval` | Web API | 3000ms live capture cadence | Simple; no external scheduler needed at this interval |

### No New npm Packages

[VERIFIED: 11-UI-SPEC.md § Registry Safety] Phase 11 introduces zero new npm packages. All capabilities are Web APIs or existing project dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
User Click ("Take photo")
         │
         ▼
  MultimodalWebcam
  getUserMedia({ video: {...}, audio: false })
         │
         ▼
  videoRef.srcObject = stream
  mode → 'preview'
         │
         ├─── User clicks "Capture"
         │         │
         │         ▼
         │    canvas.drawImage(video, 0, 0)
         │    canvas.toBlob(blob → onFrameAttach(blob), 'image/jpeg', 0.92)
         │    stream.getTracks().forEach(t => t.stop())
         │    mode → 'idle'
         │         │
         │         ▼
         │    MultimodalChatPanel.setPendingImage(blob)
         │    ── Phase 10 send flow (unchanged) ──►  LanguageModel (session reuse)
         │
         └─── User clicks "Cancel"
                   │
                   ▼
              stream.getTracks().forEach(t => t.stop())
              mode → 'idle'

User Click ("Live mode")
         │
         ▼
  MultimodalWebcam
  getUserMedia({ video: {...}, audio: false })
  new ImageCapture(stream.getVideoTracks()[0])
  mode → 'live', setIsLiveActive(true)
         │
         ▼
  setInterval(captureCycle, 3000)
         │
         ├─── captureCycle() [every 3s]
         │         │
         │         ├── inFlightRef.current? → skip (setWasSkipped(true), 500ms flash)
         │         │
         │         └── inFlightRef = true
         │             t0 = performance.now()
         │             grabFrame() → fullBitmap
         │             createImageBitmap(fullBitmap, {resizeWidth:512, resizeHeight:512}) → downsampled
         │             fullBitmap.close()
         │                  │
         │                  ▼
         │             promptWithImage(livePrompt, downsampled, {signal})
         │                  │
         │             first chunk arrives → setLastLatencyMs(performance.now() - t0)
         │             stream response → onLiveChunk(text)
         │                  │
         │                  ▼ (finally)
         │             downsampled.close()
         │             inFlightRef = false
         │
         └─── User clicks "Stop live"
                   │
                   ▼
              clearInterval(intervalRef)
              abortControllerRef.abort()
              stream.getTracks().forEach(t => t.stop())
              inFlightRef = false
              mode → 'idle', setIsLiveActive(false)
              liveResponse → null
```

### Recommended Project Structure

No new directories. All new code lives in the existing `Multimodal/` folder:

```
chat/src/app/
├── components/Multimodal/
│   ├── MultimodalWebcam.tsx        ← NEW: owns camera lifecycle + live loop
│   ├── MultimodalChatPanel.tsx     ← EXTEND: add isLiveActive, liveResponse state; mount webcam
│   ├── MultimodalInput.tsx         ← EXTEND: isLiveActive, webcamSlot props
│   ├── MultimodalTranscript.tsx    ← unchanged
│   ├── imageFileValidation.ts      ← unchanged
│   └── MultimodalPage.tsx          ← unchanged
├── services/
│   └── MultimodalService.ts        ← unchanged
└── types/
    └── dom-chromium-ai.d.ts        ← ADD grabFrame() to ImageCapture augmentation
```

### Pattern 1: grabFrame() TypeScript Augmentation (Wave 0, Critical)

**What:** `grabFrame()` is absent from TypeScript 5.9.2's `lib.dom.d.ts`. [VERIFIED: grep against `/node_modules/typescript/lib/lib.dom.d.ts`] The interface exists (`ImageCapture`, constructor at line 18704) but only declares `track`, `getPhotoCapabilities()`, `getPhotoSettings()`, and `takePhoto()`. `grabFrame()` is not present.

**Action:** Augment the global `ImageCapture` interface in `dom-chromium-ai.d.ts`:

```typescript
// Source: verified against TS 5.9.2 lib.dom.d.ts — grabFrame is absent
// MDN: https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/grabFrame
declare global {
  interface ImageCapture {
    grabFrame(): Promise<ImageBitmap>;
  }
}
```

This merges with the existing `ImageCapture` interface from `lib.dom.d.ts` via TypeScript declaration merging. No conflict with the constructor declaration. The `tsconfig.json` already includes `dom-chromium-ai.d.ts` via `"include"` — no tsconfig change needed.

### Pattern 2: canvas.toBlob() Promise Wrapper

**What:** `canvas.toBlob()` is callback-based, not Promise-based. [VERIFIED: TS 5.9.2 lib.dom.d.ts line 13415 — `toBlob(callback: BlobCallback, type?: string, quality?: number): void`]

**When to use:** Single-frame capture only. The blob must be non-null checked before calling `onFrameAttach`.

```typescript
// Source: verified TS 5.9.2 lib.dom.d.ts — toBlob is void/callback, NOT Promise
function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  onFrameAttach: (blob: Blob) => void,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(
    (blob) => {
      if (blob) onFrameAttach(blob);
    },
    'image/jpeg',
    0.92,
  );
}
```

Alternative (Promise wrapper for cleaner async flow):

```typescript
function toBlobAsync(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      0.92,
    );
  });
}
```

### Pattern 3: Single-In-Flight Gate with AbortController

**What:** The live capture loop must not start a new prompt until the previous resolves. AbortController must be refreshed on each loop start (not reused after abort).

```typescript
// Source: CONTEXT.md § Live Mode Loop (locked decision)
async function captureCycle(): Promise<void> {
  if (inFlightRef.current) {
    setWasSkipped(true);
    setTimeout(() => setWasSkipped(false), 500);
    return;
  }
  inFlightRef.current = true;
  const t0 = performance.now();
  // Create a fresh AbortController for each cycle — the live-mode AbortController
  // is only aborted on toggle-off or unmount, not per-cycle.
  try {
    const frameBitmap = await imageCaptureRef.current!.grabFrame();
    const downsampled = await createImageBitmap(frameBitmap, {
      resizeWidth: 512,
      resizeHeight: 512,
    });
    frameBitmap.close(); // free full-res immediately
    const promptText = livePromptRef.current.trim() || 'Describe what you see in this image';
    const stream = await promptWithImage(promptText, downsampled, {
      signal: abortControllerRef.current?.signal,
    });
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
        onLiveChunk(value); // accumulates into liveResponse state in parent
      }
    } finally {
      reader.releaseLock();
    }
  } finally {
    downsampled?.close(); // safe even if createImageBitmap threw
    inFlightRef.current = false;
  }
}
```

### Pattern 4: StrictMode-Safe Cleanup Effect

**What:** React 19 StrictMode double-invokes effects in development. The webcam component avoids StrictMode issues entirely by doing NO async work on mount — camera is requested only on user click.

```typescript
// Source: CONTEXT.md § Component Unmount Cleanup (locked decision)
// StrictMode-safe: no async work on mount → no double-getUserMedia race
useEffect(() => {
  return () => {
    // Cleanup runs on unmount (and on StrictMode's simulated remount in dev)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    abortControllerRef.current?.abort();
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    inFlightRef.current = false;
  };
}, []); // empty deps — runs once on mount, cleanup runs on unmount
```

Note: Because no camera is opened on mount, the StrictMode remount in dev will call the cleanup on a null/undefined `streamRef.current` — the optional chaining `?.` handles this safely.

### Pattern 5: livePrompt via Ref (Stale Closure Prevention)

**What:** `setInterval` captures the closure at creation time. If `livePrompt` (the textarea text) is read from the closure, it will be stale for all cycles after the first. Use a ref to mirror the prop value.

```typescript
// Inside MultimodalWebcam.tsx
const livePromptRef = useRef(livePrompt);
useEffect(() => {
  livePromptRef.current = livePrompt;
}, [livePrompt]);

// In captureCycle — reads from ref, not from closure
const promptText = livePromptRef.current.trim() || 'Describe what you see in this image';
```

### Pattern 6: MediaStream Track Stop (All Exit Paths)

**What:** Tracks must be stopped on every exit path or the camera light stays on indefinitely. [CITED: MDN MediaStreamTrack.stop()]

```typescript
function stopStream(): void {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  imageCaptureRef.current = null;
}
```

Call `stopStream()` from: Cancel click, Capture click (after canvas draw), Live mode toggle-off, component unmount cleanup effect.

### Anti-Patterns to Avoid

- **Reading `livePrompt` directly inside `setInterval` callback:** The closure captures the value at `setInterval` creation time. Always read via `livePromptRef.current`.
- **Creating a new AbortController per frame:** The live mode uses ONE AbortController for the entire session; aborting it on each frame would break the remaining frames. Abort only on toggle-off or unmount.
- **Calling `stream.getTracks().forEach(t => t.stop())` but not nulling the refs:** The `imageCaptureRef` continues pointing to a dead `ImageCapture` — next `grabFrame()` call will throw. Always null both refs together.
- **Using `for await...of` on the ReadableStream reader in the live loop:** Same issue as Phase 10 — use `reader.read()` loop with `reader.releaseLock()` in `finally`. The Phase 10 `MultimodalChatPanel.tsx` already documents this (see comment "Pitfall 1").
- **Not re-setting `canvas.width`/`canvas.height` before draw:** If the video resolution changes between frames (e.g., camera switches), stale canvas dimensions cause cropped output. Set `canvas.width = video.videoWidth; canvas.height = video.videoHeight` before each `drawImage`.
- **Calling `toBitmap.close()` before `createImageBitmap` resolves:** The source bitmap passed to `createImageBitmap` must remain open until the returned Promise resolves. Close it in the `.then()` or after `await`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image downsampling | Custom canvas resize loop | `createImageBitmap(src, { resizeWidth: 512, resizeHeight: 512 })` | Typed, hardware-accelerated, handles non-power-of-two dimensions |
| Frame rate limiting | Token bucket / custom scheduler | `setInterval` + `inFlightRef` gating | The 3s interval is the rate limit; gating prevents backpressure without queue complexity |
| Performance timing | Date.now() subtraction | `performance.now()` | Sub-millisecond precision; monotonic clock (not wall clock) |
| Promise-wrapping toBlob | Re-implementing the spec | `new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(...)))` | One-liner; no library needed |

**Key insight:** Every custom "media pipeline" primitive in this domain has a corresponding Web API. The only non-trivial implementation work is the state machine in `MultimodalWebcam.tsx` itself.

---

## Runtime State Inventory

This is a greenfield component addition (no rename/refactor). All state is transient React state and browser APIs — no persistent storage, no external service state.

**Nothing to migrate** — verified: Phase 11 writes no IndexedDB records, no localStorage keys, no OS registrations.

---

## Common Pitfalls

### Pitfall 1: `grabFrame()` TypeScript Compilation Failure

**What goes wrong:** `imageCaptureRef.current.grabFrame()` causes a TypeScript error `Property 'grabFrame' does not exist on type 'ImageCapture'`.

**Why it happens:** TypeScript 5.9.2's `lib.dom.d.ts` declares the `ImageCapture` interface with only `takePhoto`, `getPhotoCapabilities`, `getPhotoSettings`, and `track`. `grabFrame()` is a real Chrome API that was standardized later and is missing from the bundled declarations. [VERIFIED: grep count = 0 in TS 5.9.2 lib.dom.d.ts]

**How to avoid:** Add the augmentation to `dom-chromium-ai.d.ts` as the FIRST Wave 0 task before any other code. This is a hard blocker.

**Warning signs:** TypeScript error on `imageCaptureRef.current!.grabFrame()`. The fix is one line in `dom-chromium-ai.d.ts`.

---

### Pitfall 2: Camera Light Left On After Navigate Away

**What goes wrong:** User navigates from `/multimodal` to another page; camera indicator light stays on in browser chrome.

**Why it happens:** Component unmounts but `stream.getTracks()` were not stopped. Even if `abortControllerRef.abort()` is called, the MediaStream is not tied to the AbortController — it is a separate resource.

**How to avoid:** The single cleanup `useEffect` must call `stream.getTracks().forEach(t => t.stop())` unconditionally. The `?.` optional chaining handles the null case (no stream opened yet). [CITED: MDN MediaStreamTrack.stop()]

**Warning signs:** Camera indicator light visible after page navigation; `MediaStreamTrack.readyState === 'live'` in devtools after unmount.

---

### Pitfall 3: `canvas.toBlob()` Returns `null` in Certain Conditions

**What goes wrong:** The `BlobCallback` receives `null` instead of a `Blob`. This causes a silent failure if the callback doesn't null-check.

**Why it happens:** `canvas.toBlob()` returns `null` when: (a) the canvas has zero width or height, (b) the canvas is tainted by cross-origin draw, or (c) the JPEG encoder fails. [CITED: MDN HTMLCanvasElement.toBlob()]

**How to avoid:** Always set `canvas.width = video.videoWidth; canvas.height = video.videoHeight` immediately before `ctx.drawImage()`. Guard the callback: `if (blob) onFrameAttach(blob)`. Log a warning on null for diagnostics.

**Warning signs:** `onFrameAttach` never called; no pending image appears after Capture click.

---

### Pitfall 4: ImageBitmap Memory Leak in 3-Second Loop

**What goes wrong:** After 60+ cycles (3 minutes), memory pressure increases; on 8 GB VRAM machines the model starts slowing or errors.

**Why it happens:** `ImageBitmap` objects are GPU-backed. Unlike regular JS objects, they do not GC automatically — `close()` must be called explicitly. At 3s cadence with two bitmaps per cycle (full-res + downsampled), 20 unclosed bitmaps/minute accumulate.

**How to avoid:** The `finally` block must call `downsampled.close()`. `frameBitmap.close()` must be called immediately after `createImageBitmap(frameBitmap, ...)` resolves. The CONTEXT.md locked decision already codifies this — the planner must verify both closes are present.

**Warning signs:** Monotonically increasing `performance.memory.usedJSHeapSize` over 3+ minutes; model latency climbing; eventual crash.

---

### Pitfall 5: Stale `livePrompt` in setInterval Callback

**What goes wrong:** User types a question, starts live mode, the first frame uses the right prompt — but frames 2, 3, 4... all use the empty string (or whatever the prompt was at interval creation).

**Why it happens:** `setInterval` captures its callback at creation time. The `livePrompt` prop inside the closure is frozen at the value it had when `setInterval` was called — subsequent prop updates do not reach it.

**How to avoid:** Mirror `livePrompt` into a `useRef` and always read `livePromptRef.current` inside the capture cycle. [VERIFIED: established React pattern for setInterval with changing values]

**Warning signs:** Model returns only the fallback text `"Describe what you see in this image"` for all frames after the first, even when the textarea had text before live mode started.

---

### Pitfall 6: AbortController Reuse After Abort

**What goes wrong:** Live mode is stopped (AbortController aborted), then restarted. The second live session uses the already-aborted AbortController — every `promptWithImage` call immediately throws `AbortError`.

**Why it happens:** `AbortController.signal.aborted` is permanently `true` once `abort()` is called. The signal cannot be reset.

**How to avoid:** When starting live mode, create a fresh `AbortController`: `abortControllerRef.current = new AbortController()`. Do NOT reuse the existing one if it was previously aborted. [CITED: MDN AbortController]

**Warning signs:** Prompt immediately throws `AbortError` on the first live frame after a stop-restart cycle.

---

### Pitfall 7: Double Canvas Size from `videoWidth`/`videoHeight` Being 0

**What goes wrong:** `canvas.toBlob()` is called before the `<video>` element has finished loading the stream, producing a blank or 0×0 canvas.

**Why it happens:** After `videoRef.current.srcObject = stream` and `.play()`, the video element is not immediately ready. `video.videoWidth` and `video.videoHeight` are 0 until the first frame loads.

**How to avoid:** Either (a) listen for the `'loadedmetadata'` event before enabling the "Capture" button, or (b) guard in the capture handler: `if (!video.videoWidth || !video.videoHeight) return`. Approach (a) is better UX because the Capture button naturally appears only after the video preview is visible and loaded.

**Warning signs:** Captured blob is very small (<100 bytes); thumbnail preview is blank; model returns "I cannot see anything in the image."

---

### Pitfall 8: `pageState` Check Missing in captureCycle

**What goes wrong:** During live mode, the outer page state becomes `'unavailable'` (e.g., model was reset). The live loop continues firing `promptWithImage` which throws `NotSupportedError` on every cycle.

**Why it happens:** The live loop runs independently from the page state machine. `captureCycle` only checks `inFlightRef` but not whether the service is still available.

**How to avoid:** Add a `pageState !== 'ready'` guard at the top of `captureCycle`, or rely on the AbortController being aborted when an error occurs. The simpler path: on any non-AbortError thrown from `promptWithImage` inside the live loop, call `setIsLiveActive(false)` and stop the loop.

---

## Code Examples

### Example 1: ImageCapture Augmentation (dom-chromium-ai.d.ts addition)

```typescript
// Add to chat/src/app/types/dom-chromium-ai.d.ts
// grabFrame() is absent from TS 5.9.2 lib.dom.d.ts — augment here (verified)
declare global {
  interface ImageCapture {
    /**
     * Grabs a snapshot of the live video being held in the MediaStreamTrack
     * passed to the ImageCapture constructor, returning an ImageBitmap.
     * MDN: https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/grabFrame
     */
    grabFrame(): Promise<ImageBitmap>;
  }
}
```

### Example 2: Minimal MultimodalWebcam Mode State Machine

```typescript
// Source: CONTEXT.md § Component Layout (locked prop shape)
type WebcamMode = 'idle' | 'preview' | 'live' | 'error';
type ErrorState = 'blocked' | 'no-camera' | 'in-use' | 'unknown' | null;

// Ref inventory (non-reactive state — no re-render on change):
const streamRef = useRef<MediaStream | null>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
const imageCaptureRef = useRef<ImageCapture | null>(null);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const inFlightRef = useRef<boolean>(false);
const abortControllerRef = useRef<AbortController | null>(null);
const livePromptRef = useRef<string>(livePrompt); // mirrors prop for stale-closure safety
```

### Example 3: getUserMedia Error Mapping

```typescript
// Source: CONTEXT.md § Permission / Error Handling (locked)
catch (err) {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') setErrorState('blocked');
    else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') setErrorState('no-camera');
    else if (err.name === 'NotReadableError') setErrorState('in-use');
    else setErrorState('unknown');
  } else {
    setErrorState('unknown');
  }
  setMode('error');
}
```

### Example 4: MediaStreamTrack.getSettings() for Actual Resolution

```typescript
// Source: VERIFIED — MediaTrackSettings.width + .height in TS 5.9.2 lib.dom.d.ts
// Read ACTUAL negotiated resolution (vs requested ideal)
const settings = stream.getVideoTracks()[0]?.getSettings();
// settings.width — actual pixel width (may differ from ideal: 1280)
// settings.height — actual pixel height (may differ from ideal: 720)
// Useful for: setting canvas dimensions before drawImage if videoWidth is unreliable
// NOT used for live mode (ImageCapture.grabFrame() returns native track resolution)
```

### Example 5: Session Reuse Behavior in Live Mode

The existing `MultimodalService.ts` module-scope `sessionPromise` pattern means:

1. First `promptWithImage` call during live mode: if no session exists → creates one (may trigger model download), stores promise. If session exists → returns cached.
2. Subsequent calls (frame 2, 3, ...): `sessionPromise` is already resolved → immediately returns the cached `LanguageModel` instance.
3. If a prompt throws a non-AbortError: `getOrCreateSession` does NOT clear the `sessionPromise` on prompt errors (only on `LanguageModel.create()` errors). The session remains cached and healthy — the next cycle starts a fresh prompt on the same session.
4. AbortController abort (from live stop): The in-flight `promptWithImage` call throws `AbortError`. The `finally` block resets `inFlightRef = false`. The session itself is NOT invalidated — it remains available for the next live start.

[VERIFIED: MultimodalService.ts lines 19-31 — `sessionPromise` cleared only in the `.catch()` on `LanguageModel.create()` failure, not on prompt-level errors]

**Implication for the planner:** Session reuse is a free side-effect. No changes to `MultimodalService.ts` are needed. The live loop calls the same `promptWithImage` export as the single-frame path.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ImageCapture.takePhoto()` for frame capture | `ImageCapture.grabFrame()` → `createImageBitmap` downsample | Chrome 60+ | `grabFrame()` captures from live stream without interrupting it; `takePhoto()` triggers autofocus/flash; for live demos, `grabFrame()` is correct |
| New session per image | Module-scope session pool + `promptWithImage` | Phase 10 | Free reuse — no re-download, no re-initialization overhead |
| `for await...of` on ReadableStream | `reader.read()` loop with `releaseLock()` in finally | Phase 10 (Pattern 1) | Prevents unhandled rejection on abort; already established in Phase 10 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `grabFrame()` returns a usable `ImageBitmap` that is immediately passable to `createImageBitmap()` | Pattern 1, Standard Stack | If Chrome's implementation returns a VideoFrame or other type, the downsampling step needs adjustment. [ASSUMED — not testable without Chrome hardware] |
| A2 | `createImageBitmap(imageBitmap, { resizeWidth: 512, resizeHeight: 512 })` correctly resamples in Chrome 148 | Live mode pipeline | If Chrome ignores resize options for `ImageBitmap` source, output may be full-resolution. [ASSUMED — TS typing confirms the overload exists, but runtime behavior untested] |
| A3 | The module-scope `sessionPromise` in `MultimodalService.ts` survives a stop-restart live mode cycle without manual reset | Session Reuse section | If the session becomes stale after an AbortError, the second live session may need `destroyAllSessions()` + recreate. [ASSUMED — CONTEXT.md states it "just works" but not empirically verified for abort-restart] |

**If any A1/A2 claim is wrong:** Detected during development execution (first live mode run). The fallback for A1 is to pass `grabFrame()` result directly to `promptWithImage` as `ImageBitmap` (the service already accepts it). The fallback for A2 is to draw to an `OffscreenCanvas` at 512×512 before passing to the model.

---

## Open Questions

1. **`canvas.toBlob()` timing relative to `video.loadedmetadata`**
   - What we know: `video.videoWidth` is 0 until first frame loads; loading is async after `srcObject` assignment
   - What's unclear: Should the Capture button be enabled only after `loadedmetadata` fires, or is a videoWidth guard in the capture handler sufficient?
   - Recommendation: Enable Capture button on `loadedmetadata` event (`videoRef.current.addEventListener('loadedmetadata', () => setCaptureReady(true))`). Belt-and-suspenders guard in the handler too.

2. **Live mode + `pageState = 'prompting'` conflict**
   - What we know: Phase 10 uses `pageState = 'prompting'` to disable the send button during single-frame sends. The live loop does NOT set `pageState` — it manages its own `inFlightRef`.
   - What's unclear: Should live mode temporarily set `pageState = 'prompting'` during each cycle to prevent concurrent single-frame sends? (The CONTEXT.md disables the "Take photo" button when `isLiveActive`, so this is prevented by UI, not state.)
   - Recommendation: Live mode does NOT set `pageState`. The `isLiveActive` flag + disabled "Take photo" button is sufficient. The two paths are mutually exclusive by UI gating.

---

## Environment Availability

> All required APIs are native browser APIs in Chrome 148+. No external services or CLI tools needed.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Chrome 148+ (`LanguageModel` with `expectedInputs: [{type:'image'}]`) | Live mode + single-frame send | ✓ | Shipped stable Chrome 148 per v1.2-multimodal-proofreader-api.md |
| `MediaDevices.getUserMedia` | Both paths | ✓ | Available in all modern browsers; Chrome 148+ confirmed |
| `ImageCapture` constructor + `grabFrame()` | Live mode | ✓ Chrome | Implemented in Chrome; Firefox/Safari lag but project is Chrome-only |
| `createImageBitmap` with resize options | Live mode | ✓ | Typed in TS 5.9.2 lib.dom.d.ts (lines 39139-39140) |
| `canvas.toBlob()` | Single-frame path | ✓ | Standard; typed in TS 5.9.2 lib.dom.d.ts |
| `performance.now()` | POLISH-02 perf badge | ✓ | Web API; no import needed |

---

## Project Constraints (from CLAUDE.md)

- **TypeScript strict mode**: no `: any`, no `as any` at API boundaries. The `ImageCapture` augmentation and all webcam types must be properly typed. [ENFORCED]
- **Brownfield discipline**: Do not touch `mcp/`, `mcp-client/`, `devops/awsweb/`. Phase 11 is entirely in `chat/`. [CONFIRMED]
- **No new npm packages**: Phase 11 uses only Web APIs and existing project code. [CONFIRMED by UI-SPEC.md § Registry Safety]
- **Streaming via `ReadableStream<string>`**: Use `reader.read()` loop with `releaseLock()` in finally (Phase 10 established pattern). [ENFORCED]
- **React 19 / Tailwind dark-mode support**: All new components must include `dark:` variants. UI-SPEC.md provides complete token set.
- **Imports: workspace boundaries**: Nx boundaries are permissive for the chat workspace. `MultimodalWebcam.tsx` imports from the same `Multimodal/` directory and `services/` only.

---

## Validation Architecture

> `workflow.nyquist_validation: false` in `.planning/config.json` — this section is omitted per config.

---

## Security Domain

> No authentication, no data persistence, no network calls. Phase 11 processes camera frames entirely on-device. The only security-relevant surface:

| Concern | Mitigation |
|---------|-----------|
| getUserMedia permission prompt | Deferred to user click — never auto-prompted on mount (CONTEXT.md locked). Chrome's permission model handles the prompt UI. |
| `chrome://` URL in error card | Rendered as `<code>` copy-on-click, NOT as `<a href="chrome://...">`. Browser blocks JS navigation to chrome:// — the static code element pattern (from `MissingFlagBanner.tsx`) is the correct approach. |
| Canvas cross-origin taint | Not applicable — canvas draws only from the local `<video>` element whose `srcObject` is a local MediaStream (no cross-origin content). |

---

## Sources

### Primary (HIGH confidence)
- TypeScript 5.9.2 `lib.dom.d.ts` (local at `/node_modules/typescript/lib/lib.dom.d.ts`) — verified `ImageCapture` interface, `grabFrame` absence, `createImageBitmap` options, `canvas.toBlob` signature, `MediaTrackSettings.width/height`
- `chat/src/app/types/dom-chromium-ai.d.ts` (local codebase) — confirmed augmentation pattern; Proofreader/LanguageModel types as precedent
- `chat/src/app/services/MultimodalService.ts` (local codebase) — confirmed `ImageBitmap` accepted, session pool behavior, AbortController handling
- `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` (local codebase) — confirmed AbortController pattern, `reader.read()` loop, `reader.releaseLock()` in finally
- `chat/src/app/components/Multimodal/MultimodalInput.tsx` (local codebase) — confirmed existing prop shape, paste/drag handling, `pageState` disable conditions
- `chat/src/main.tsx` (local codebase) — confirmed `<StrictMode>` is active
- `chat/src/app/components/MissingFlagBanner.tsx` (local codebase) — confirmed chrome:// link rendered as `<code>` (static text, no copy-on-click in existing component — UI-SPEC.md adds click-to-copy)

### Secondary (MEDIUM confidence)
- `.planning/research/v1.2-multimodal-proofreader-api.md` (project research) — `ImageCapture.grabFrame()` performance recommendations; `createImageBitmap` downsample pattern; session reuse recommendation
- `.planning/phases/11-webcam-capture/11-CONTEXT.md` — locked decisions
- `.planning/phases/11-webcam-capture/11-UI-SPEC.md` — visual contract

### Tertiary (LOW confidence / [ASSUMED])
- A3: session survives abort-restart cycle — based on code reading of `MultimodalService.ts`, not empirical test

---

## Metadata

**Confidence breakdown:**
- TypeScript type situation: HIGH — verified directly against installed TS 5.9.2 lib
- grabFrame absence: HIGH — grep confirmed 0 occurrences in lib.dom.d.ts
- Browser API behavior: MEDIUM — Chrome is target; Firefox/Safari irrelevant for this project
- Session reuse under abort-restart: LOW-MEDIUM — code analysis only, no runtime test

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (Chrome API changes could affect grabFrame typing in future TS releases)
