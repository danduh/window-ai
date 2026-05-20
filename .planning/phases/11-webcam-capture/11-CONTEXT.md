# Phase 11: Webcam Capture — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 adds webcam input to the existing `/multimodal` chat panel from Phase 10:

1. **Single-frame snap path**: "📷 Take photo" button → click prompts camera permission → live video preview with Capture/Cancel overlay → snap one frame via `<canvas>` → routes the JPEG Blob to the same `setPendingImage` flow as drag/paste → user types question, clicks Send (reuses 100% of Phase 10 send flow)
2. **Live mode path**: User types a question in the textarea (or empty = fixed fallback) → toggles "🔴 Live mode" → `ImageCapture.grabFrame()` loop every 3000ms → downsamples each frame to 512×512 via `createImageBitmap` → `MultimodalService.promptWithImage(text, bitmap)` with single-in-flight gating → response replaces previous in the Live response panel below the video → toggle off stops loop cleanly
3. **Permission/error cards**: Inline cards (replacing video preview slot) for `NotAllowedError` ("Camera blocked"), `OverconstrainedError`/`NotFoundError` ("No camera detected"), `NotReadableError` ("Camera in use by another app")
4. **Perf indicator (POLISH-02)**: Bottom-right badge on live video showing `"3s interval · last: 840 ms"` with `performance.now()` time-to-first-token measurement; shows `"skipped (in flight)"` briefly when a cycle is dropped

Out of scope:
- Docs markdown content (`/multimodal/docs`) → Phase 12 (DOC-02)
- SEO byte-identical `grep -F` audit → Phase 12 (DOC-03)
- 5-cold-run rehearsal log → Phase 12 (POLISH-01)
- Configurable capture interval slider (fixed at 3000ms)
- Audio input (deferred to v1.3)
- Multi-image attachments per message

</domain>

<decisions>
## Implementation Decisions

### Webcam UI Placement + Component Shape
- **New component**: `chat/src/app/components/Multimodal/MultimodalWebcam.tsx` — owns the camera lifecycle (MediaStream, ImageCapture, error state, live loop). Separates concerns from `MultimodalInput.tsx` (drag/paste/text) and `MultimodalChatPanel.tsx` (transcript, orchestration).
- **Tools row ABOVE the textarea** inside the input frame, left-aligned, before the textarea: two pill buttons "📷 Take photo" and "🔴 Live mode". Same vertical strip used by similar chat UIs.
- **Live video preview placement**: replaces the thumbnail-preview slot above the textarea (mutually exclusive with `pendingImage` state). Approximately 240×180 with overlaid "Capture" (primary-500) + "Cancel" (ghost) buttons centered. Same Tailwind frame as the thumbnail preview.
- **Permission/error cards**: inline cards that occupy the same vertical space as the video preview slot. Each has a dismissable × button. Specific copy per error:
  - `NotAllowedError`: `"📷 Camera blocked — enable in browser settings"` + link to `chrome://settings/content/camera` (target="_blank")
  - `OverconstrainedError` / `NotFoundError`: `"No camera detected"`
  - `NotReadableError`: `"Camera in use by another app"`

### Component Layout
- `MultimodalWebcam.tsx` exports `<MultimodalWebcam ...>` with props:
  ```ts
  interface MultimodalWebcamProps {
    pageState: PageState;
    livePrompt: string;            // textarea text (or '' for empty)
    onFrameAttach: (blob: Blob) => void;  // single-frame path — calls setPendingImage
    setIsLiveActive: (b: boolean) => void; // notifies parent so textarea + send button can be disabled
  }
  ```
- The component owns: MediaStream, `videoRef`, `canvasRef`, `imageCaptureRef`, `intervalRef`, `inFlightRef`, `errorState`, `mode` (`'idle' | 'preview' | 'live'`), perf state (`lastLatencyMs`, `wasSkipped`).
- The component does NOT own the transcript or pageState; it calls upward via `onFrameAttach` for single-frame and writes directly into a `liveResponseRef`-backed `Live response panel` (rendered inline below the video preview during live mode).

### getUserMedia + MediaStream Lifecycle
- **Permission requested only on user click** ("Take photo" or "Live mode") — never on mount. Matches ROADMAP SC-1.
- **Stop all tracks** (`stream.getTracks().forEach(t => t.stop())`) on:
  - Cancel button click
  - Single-frame capture (auto-stop after snap)
  - Live mode toggle off
  - Component unmount
  - Error reception (NotAllowed/etc. before stream is opened won't have tracks)
- **One stream per mode** — single-frame opens → captures → stops. Live mode opens → loops until toggle off. No shared state.
- **Video constraints (locked)**:
  ```ts
  navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  })
  ```
- After `getUserMedia` resolves: assign stream to `videoRef.current.srcObject` and `videoRef.current.play()`.
- For live mode: also create `new ImageCapture(stream.getVideoTracks()[0])` and store in `imageCaptureRef`.

### Single-Frame Capture Flow
- **Capture method**: `<canvas>` draw of the `<video>` element. Native video resolution → `ctx.drawImage(video, 0, 0)` → `canvas.toBlob(blob => onFrameAttach(blob), 'image/jpeg', 0.92)`. NOT `ImageCapture.takePhoto()` (less reliable cross-platform).
- **After capture**: route the JPEG Blob to the existing `setPendingImage` path via `onFrameAttach(blob)`. The thumbnail preview state appears above the textarea (replacing the video preview). User types text + clicks Send. **Reuses 100% of Phase 10 send flow.**
- **MediaStream stopped immediately after capture**.
- **UI affordances during preview**: two-button overlay on video — `"Capture"` (primary, primary-500) + `"Cancel"` (ghost, gray). Mode goes to `'preview'` between getUserMedia resolve and Capture/Cancel click.
- **No "Retake" button** — user can × the thumbnail and click Take photo again.

### Live Mode Loop + Single-In-Flight Gating
- **Cadence**: fixed 3000ms (`setInterval(captureCycle, 3000)`). No user-facing slider. Configurability deferred to a future polish if requested.
- **Frame pipeline**:
  ```ts
  async function captureCycle() {
    if (inFlightRef.current) {
      setWasSkipped(true);
      setTimeout(() => setWasSkipped(false), 500);  // brief visual flash
      return;
    }
    inFlightRef.current = true;
    const t0 = performance.now();
    try {
      const frameBitmap = await imageCaptureRef.current!.grabFrame();
      const downsampled = await createImageBitmap(frameBitmap, {
        resizeWidth: 512,
        resizeHeight: 512,
      });
      frameBitmap.close();  // free the full-res bitmap
      const promptText = livePrompt.trim() || 'Describe what you see in this image';
      const stream = await promptWithImage(promptText, downsampled, { signal });
      // ... stream response into liveResponse state, measure t-to-first-token
    } finally {
      downsampled.close();  // free the downsampled bitmap
      inFlightRef.current = false;
    }
  }
  ```
- **Single-in-flight gating**: `inFlightRef = useRef<boolean>(false)`. Set true before `promptWithImage` call, false in `finally`. Capture cycle checks at start and returns early if true (skipped frame).
- **Skipped frame counter**: `skippedFramesRef` increments on each skipped cycle (diagnostic; not surfaced in v1.2 UI but available via console.log for the rehearsal).
- **ImageBitmap cleanup**: explicitly `.close()` both the original and the downsampled bitmap to free memory; mandatory for the long-running loop.
- **Loop teardown**: on Live mode toggle off (or unmount), `clearInterval(intervalRef.current)`, abort in-flight request via the shared AbortController, stop MediaStream tracks, reset `inFlightRef` and `liveResponse`.

### Response Display in Live Mode
- **Replaces transcript** with a "Live response panel" below the video preview while live mode is active.
- Live response panel shows ONLY the latest assistant response, streaming text. New frame → previous response is replaced (not appended).
- Transcript is **hidden but preserved** during live mode (visibility:hidden — not unmounted). When live mode toggles off, the response panel disappears, transcript reappears.
- Chat history during live mode is **NOT persisted** to the transcript (would flood it). The last live response also disappears on toggle off — only the transcript persists.

### Live Mode Prompt Source
- **User-typed prompt** in the textarea. Visitor types once before toggling Live mode. The same text is reused for every frame.
- **Fallback when textarea is empty**: fixed prompt `"Describe what you see in this image"`.
- **Textarea is disabled during live mode** (`disabled` attribute + `opacity-60 cursor-not-allowed`) so the prompt can't change mid-stream. Send button is also disabled. Drag/paste targets are inert.
- Visual cue near the textarea: small "Live mode active — prompt locked" badge (gray pill).

### Perf Indicator (POLISH-02)
- **Position**: small badge bottom-right of the live video preview. Tailwind: `absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded`.
- **Content** (single line, `·` separator): `"3s interval · last: 840 ms"`. Updates each cycle after promptStreaming yields its first chunk.
- **Skipped state**: when `wasSkipped` is true (briefly), badge text changes to `"3s interval · skipped (in flight)"`. Auto-clears after 500ms.
- **Latency measurement**: `performance.now()` delta from prompt-start to first-chunk arrival (time-to-first-token). Captures "perceived responsiveness" — the demo-day metric.
- **No latency on first-ever frame** until the first cycle completes — show `"3s interval · …"` placeholder.

### Permission / Error Handling
- **Error mapping** (in `MultimodalWebcam.tsx`, on `getUserMedia` catch):
  ```ts
  catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') setErrorState('blocked');
      else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') setErrorState('no-camera');
      else if (err.name === 'NotReadableError') setErrorState('in-use');
      else setErrorState('unknown');
    } else {
      setErrorState('unknown');
    }
  }
  ```
- **Cards rendered in the video preview slot** (mutually exclusive with the live preview):
  - `'blocked'`: icon 📷 + heading "Camera blocked" + body "Enable in browser settings" + `<a href="chrome://settings/content/camera" target="_blank">Open camera settings</a>`. Note: chrome:// links can't be opened from JS for security — surface as a copy-pasteable `<code>` element with a copy button.
  - `'no-camera'`: icon 🚫 + "No camera detected"
  - `'in-use'`: icon 🔒 + "Camera in use by another app"
  - `'unknown'`: icon ⚠ + "Camera error — {err.message}"
- Each card has a dismissable × in the top-right.
- After dismiss: card hidden, "Take photo" / "Live mode" buttons re-enabled.

### Component Unmount Cleanup
- Single `useEffect(() => () => cleanup(), [])` with:
  ```ts
  // Stop MediaStream
  streamRef.current?.getTracks().forEach(t => t.stop());
  // Cancel in-flight prompt
  abortControllerRef.current?.abort();
  // Clear interval
  if (intervalRef.current) clearInterval(intervalRef.current);
  // Reset refs
  inFlightRef.current = false;
  ```

### Integration With Phase 10 Code
- `MultimodalChatPanel.tsx` receives `<MultimodalWebcam>` as a child of the tools row above the textarea (or rendered inline conditionally based on mode).
- `MultimodalInput.tsx` gets two new top-level props:
  - `isLiveActive: boolean` — disables textarea + send button when true
  - `webcamSlot?: React.ReactNode` — the `<MultimodalWebcam>` element rendered in the new tools row
- `MultimodalChatPanel.tsx` passes the `text` state down as `livePrompt` to `MultimodalWebcam` and an `onFrameAttach` callback that calls `setPendingImage(blob)`.
- Live response state lives in `MultimodalChatPanel.tsx` (so the response panel can render below the panel transcript): `liveResponse: { text: string; firstChunkAt: number | null } | null`. `MultimodalWebcam` updates via a callback prop `onLiveChunk(text)`.

### Claude's Discretion
- Exact emoji choice for the "Take photo" / "Live mode" buttons (📷/🔴 or icon SVGs) — planner picks; SVG icons preferred for accessibility but emoji is fine if simpler
- Exact button copy ("Take photo" vs "Snap photo" vs "Camera") — planner picks; matches "Take photo" from ROADMAP SC-1
- Whether the "Live mode" toggle is a button with state or a switch component — planner picks; v1.0/v1.1 use buttons, mirror
- Whether the live response panel shows an avatar / role indicator — planner picks; minimal is fine
- Tailwind specifics for the dismissable × on error cards — planner picks; matches pattern from elsewhere in the codebase
- Whether `chrome://settings/content/camera` is shown as a `<code>` copy element or just inline text — planner picks; `<code>` with copy-on-click is consistent with `MissingFlagBanner` flag URL treatment

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 10 outputs)
- `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` — orchestrator; will be extended to mount `<MultimodalWebcam>` + manage live response state
- `chat/src/app/components/Multimodal/MultimodalInput.tsx` — gains `isLiveActive` and `webcamSlot` props
- `chat/src/app/services/MultimodalService.ts` — `promptWithImage(text, blob | ImageBitmap, { signal })` already accepts ImageBitmap (per Phase 10 type signature). Live mode uses the SAME pooled session — session reuse is a free side-effect of the module-scope cache
- `chat/src/app/components/Multimodal/MultimodalTranscript.tsx` — unchanged; rendered alongside the live response panel (visible state toggled by parent)
- `chat/src/app/components/Multimodal/imageFileValidation.ts` — unchanged; webcam-captured blobs bypass MIME validation (we know it's JPEG from canvas.toBlob)
- `chat/src/app/components/Multimodal/MultimodalPage.tsx` — unchanged; webcam is purely a chat-panel concern

### Established Patterns
- `useRef<T>(initial)` for non-reactive state (streamRef, intervalRef, inFlightRef, abortControllerRef)
- `useEffect(() => () => cleanup, [])` for unmount-time cleanup; consolidated single effect (per Phase 10 Plan 02 pattern)
- AbortController shared with the existing Phase 10 prompt path (already on `MultimodalChatPanel`)
- StrictMode-safe: webcam mount effect uses `cancelled` flag if doing async work on mount
- Tailwind dark mode variants on every color token
- Per CLAUDE.md: no `: any`, no `as any` at API boundaries
- `ImageCapture` is a Web API; declare via `interface ImageCapture` locally if TypeScript dom lib doesn't include it (check `chat/src/app/types/` first)

### Integration Points
- `MultimodalChatPanel.tsx`: new state `isLiveActive: boolean`, `liveResponse: {...} | null`; new `<MultimodalWebcam>` mounted; conditional render of transcript vs. live response panel
- `MultimodalInput.tsx`: 2 new props; textarea + send disabled gating extended to `isLiveActive` case; render `webcamSlot` in a new flex row above the textarea
- `MultimodalService.ts`: NO changes — the existing `promptWithImage` signature works for both Blob (single-frame) and ImageBitmap (live mode)
- Type declarations: `ImageCapture` interface may need a local declaration in `chat/src/app/types/` if not in lib.dom.d.ts. Check first.

</code_context>

<specifics>
## Specific Ideas

- **`chrome://` link UX**: Browsers block JS from opening `chrome://` URLs. The "Open camera settings" link must be a `<code class="cursor-copy" onclick={copy}>chrome://settings/content/camera</code>` — same pattern as `MissingFlagBanner` flag URLs. Don't use `<a href="chrome://...">` (no-op + console warning).
- **MediaStream tracks are NOT GC'd automatically**: forgetting `stream.getTracks().forEach(t => t.stop())` leaves the camera light on. Aggressively stop on every exit path.
- **`ImageCapture.grabFrame()` returns an ImageBitmap (NOT a Blob)** — directly feedable into `promptWithImage(text, bitmap)` per Phase 10 type signature. No canvas detour needed in live mode.
- **`createImageBitmap(source, { resizeWidth, resizeHeight })` resamples** — quality is fine for 512×512 demo. No filter setting needed.
- **`bitmap.close()` is critical** in a 3-second loop — without it, ImageBitmaps accumulate and cause memory pressure on long demos. Both the full-res grabFrame result and the downsampled bitmap need close().
- **Token cost note** (from research line 296): Gemini Nano's image token cost is lower than server VLMs, but at 512×512 each frame still costs ~hundreds of tokens. Single-in-flight gating is what keeps this sustainable on 8GB VRAM machines.
- **Live response panel UX**: Style as a single bubble (not a transcript). Same `bg-gray-100 dark:bg-gray-700 rounded-lg p-3` styling as the assistant bubble in the transcript. No avatar/role indicator (it's clearly the live response).
- **Demo flow scripted**: speaker says "let me try live mode" → types "what color is this object?" → toggles Live mode → holds up a red apple, watches the model say "red apple" → swaps for a blue cup, watches the response update.

</specifics>

<deferred>
## Deferred Ideas

- Configurable capture interval (1s / 3s / 5s slider) — fixed at 3000ms for v1.2
- "Slow mode" diagnostics view showing skipped frame count + average latency over last N frames — keep diagnostic info in console only for v1.2
- ImageCapture.takePhoto() for higher-quality single-frame snaps — canvas pattern is reliable and works everywhere
- Video facing mode toggle (front/back/external) — front camera only for v1.2
- Recording / saving captured frames — out of scope
- Side-by-side dual-camera mode — out of scope
- `/multimodal/docs` markdown coverage of webcam pattern → Phase 12 (DOC-02)
- 5-cold-run rehearsal log for Multimodal demo → Phase 12 (POLISH-01)
- Audio input / lip-reading / video transcription — v1.3 (audio requires discrete GPU)

</deferred>
