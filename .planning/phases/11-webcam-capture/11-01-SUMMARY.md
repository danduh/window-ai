---
phase: 11-webcam-capture
plan: "01"
subsystem: ui
tags: [webcam, getUserMedia, ImageCapture, MediaStream, ImageBitmap, canvas, live-mode, setInterval, AbortController, react, typescript, dom-augmentation]

# Dependency graph
requires:
  - phase: 10-multimodal
    provides: "promptWithImage(text, Blob | ImageBitmap, { signal }) service, PageState type, AbortController pattern, reader.read() streaming loop, Phase 10 chat panel"
provides:
  - "MultimodalWebcam.tsx — self-contained webcam component: getUserMedia lifecycle, single-frame canvas capture, live mode with grabFrame() + 512x512 downsample + single-in-flight gating, 4-variant error cards, perf badge"
  - "dom-chromium-ai.d.ts augmented with top-level interface ImageCapture { grabFrame(): Promise<ImageBitmap> } — fixes TS 5.9.2 lib.dom.d.ts omission"
affects: [11-webcam-capture, 12-polish-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ImageCapture top-level interface augmentation: lib.dom.d.ts declares ImageCapture at global script scope; augmentation must be at top-level (not inside declare global) in dom-chromium-ai.d.ts"
    - "getUserMedia-on-click-only: camera permission never requested on mount — StrictMode safe, no double-getUserMedia race"
    - "inFlightRef gating: useRef<boolean>(false) guards setInterval loop, prevents concurrent promptWithImage calls"
    - "livePromptRef mirror: useEffect(() => { livePromptRef.current = livePrompt; }, [livePrompt]) prevents stale setInterval closure"
    - "Fresh AbortController per live-session: abortControllerRef.current = new AbortController() on each handleLiveModeStart"
    - "canvas.toBlob callback pattern: sets canvas.width/height before drawImage, null-checks blob in callback"
    - "ImageBitmap close() discipline: frameBitmap.close() immediately post-downsample, downsampled?.close() in finally"

key-files:
  created:
    - chat/src/app/components/Multimodal/MultimodalWebcam.tsx
  modified:
    - chat/src/app/types/dom-chromium-ai.d.ts

key-decisions:
  - "Used top-level interface augmentation for ImageCapture instead of declare global wrapper — lib.dom.d.ts declares ImageCapture at global script scope, not inside declare global; dom-chromium-ai.d.ts is a global script file where declare global is redundant/non-functional"
  - "Kept stopStream() as a useCallback helper that nulls both streamRef and imageCaptureRef together — prevents stale grabFrame() on dead track"
  - "captureCycle reads livePromptRef.current (not prop directly) to prevent stale setInterval closure"

patterns-established:
  - "Pattern: ImageCapture augmentation at top-level of global script .d.ts file"
  - "Pattern: inFlightRef + wasSkipped for live-mode single-in-flight with skip flash"
  - "Pattern: livePromptRef mirror effect for setInterval stale-closure prevention"

requirements-completed: [MULTI-04, MULTI-05, MULTI-08, POLISH-02]

# Metrics
duration: 7min
completed: 2026-05-20
---

# Phase 11 Plan 01: Webcam Capture Component Summary

**Self-contained MultimodalWebcam.tsx with getUserMedia lifecycle, canvas single-frame capture, grabFrame() live loop with 512x512 downsample + single-in-flight gating, 4 error card variants, and perf badge — all 8 RESEARCH pitfalls mitigated**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-20T10:35:57Z
- **Completed:** 2026-05-20T10:42:29Z
- **Tasks:** 2
- **Files modified:** 2 (1 new, 1 extended)

## Accomplishments

- Task 1: Augmented `dom-chromium-ai.d.ts` with `interface ImageCapture { grabFrame(): Promise<ImageBitmap> }` at top-level scope — eliminates the Phase 11 hard-blocker TS2339 error for all callers of `imageCaptureRef.current!.grabFrame()`
- Task 2: Created `MultimodalWebcam.tsx` (580 lines) implementing all of MULTI-04 (single-frame snap), MULTI-05 (live loop + gating + downsample), MULTI-08 (error cards + chrome:// copy), and POLISH-02 (perf badge)
- All 8 RESEARCH pitfalls mitigated in code with grep-verifiable evidence

## Task Commits

Each task was committed atomically:

1. **Task 1: ImageCapture augmentation (initial)** — `b0f0016` (feat)
2. **Task 1 fix: top-level scope correction** — `4eb54dd` (fix) — deviation documented below
3. **Task 2: MultimodalWebcam.tsx** — `683a8dd` (feat)

## Files Created/Modified

- `chat/src/app/types/dom-chromium-ai.d.ts` — Augmented with top-level `interface ImageCapture { grabFrame(): Promise<ImageBitmap> }` (additive, non-destructive; existing declarations unchanged)
- `chat/src/app/components/Multimodal/MultimodalWebcam.tsx` (NEW, 580 lines) — Full webcam lifecycle component

## All 8 RESEARCH Pitfalls: Mitigation Evidence

| Pitfall | Description | Evidence (grep) |
|---------|-------------|-----------------|
| P1 | grabFrame TS gap | `grep -c "grabFrame" dom-chromium-ai.d.ts` = 4; typecheck passes |
| P2 | Track-stop on all paths | `stopStream()` helper; cleanup useEffect; Cancel/Capture/Stop/unmount all call it |
| P3 | canvas.toBlob null | `if (blob) { onFrameAttach(blob); }` in callback |
| P4 | ImageBitmap memory leak | `frameBitmap.close()` post-downsample; `downsampled?.close()` in finally |
| P5 | Stale livePrompt closure | `livePromptRef.current` used inside captureCycle; `useEffect(() => { livePromptRef.current = livePrompt }, [livePrompt])` |
| P6 | AbortController reuse-after-abort | `abortControllerRef.current = new AbortController()` in handleLiveModeStart |
| P7 | videoWidth=0 race | `captureReady` state set on `<video onLoadedMetadata>`; `if (!video.videoWidth \|\| !video.videoHeight) return` guard |
| P8 | pageState mutex | `if (pageState !== 'ready') return` at top of captureCycle |

## Verification Outputs

```
npx nx run chat:typecheck → SUCCESS (0 errors)
npx nx build chat → webpack compiled successfully
git diff --name-only HEAD~3 HEAD → EXACTLY 2 files
grep -v '^ *//' MultimodalWebcam.tsx | grep -cE '(: any| as any)' → 0
git diff package.json package-lock.json → 0 lines (no new deps)
wc -l MultimodalWebcam.tsx → 580 (> required 250)
```

## Plan 11-02 Hand-off

**Import line:**
```tsx
import { MultimodalWebcam } from './MultimodalWebcam';
import type { MultimodalWebcamProps } from './MultimodalWebcam';
```

**Mount JSX template (Plan 11-02 fills in parent state):**
```tsx
<MultimodalWebcam
  pageState={pageState}
  livePrompt={text}
  onFrameAttach={(blob) => setPendingImage(blob)}
  setIsLiveActive={setIsLiveActive}
  onLiveChunk={handleLiveChunk}
/>
```

**Contract surface delivered:**
- `export const MultimodalWebcam: React.FC<MultimodalWebcamProps>` — named export
- `export interface MultimodalWebcamProps` — named export with all 5 props locked by CONTEXT.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] declare global wrapper ineffective for global-script .d.ts augmentation**
- **Found during:** Task 1 (dom-chromium-ai.d.ts augmentation)
- **Issue:** Initial implementation used `declare global { interface ImageCapture { ... } }` (a second separate block after the existing one), which failed to merge — TS2339 persisted. Moving the augmentation inside the existing `declare global` block also failed. Root cause: `dom-chromium-ai.d.ts` is a global **script** file (no top-level import/export), and `lib.dom.d.ts` declares `ImageCapture` at global script scope — not inside `declare global`. To merge, the augmentation must be at the same top-level scope.
- **Fix:** Declared `interface ImageCapture { grabFrame(): Promise<ImageBitmap>; }` at top-level of `dom-chromium-ai.d.ts` (outside all `declare global` blocks)
- **Files modified:** `chat/src/app/types/dom-chromium-ai.d.ts`
- **Verification:** `npx nx run chat:typecheck` → 0 errors; `imageCaptureRef.current!.grabFrame()` resolves without TS2339
- **Committed in:** `4eb54dd` (fix commit immediately after initial feat)

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript declaration scoping bug)
**Impact on plan:** Fix required for typecheck to pass. Additive change only. No scope creep.

## Issues Encountered

The only issue was the TypeScript declaration scoping subtlety: `declare global {}` is only meaningful in module files (files with `import`/`export`). Since `dom-chromium-ai.d.ts` is a global script file, the correct augmentation is a bare top-level `interface ImageCapture { ... }` declaration. The fix was a one-step correction committing clean.

## Known Stubs

None — the component is not yet mounted. Plan 11-02 mounts `MultimodalWebcam` inside `MultimodalChatPanel.tsx` and `MultimodalInput.tsx`. The component itself has no stub data — all state is real (camera stream, canvas draw, live loop).

## Threat Flags

None — `MultimodalWebcam.tsx` introduces no new network endpoints, no auth paths, no file system access. Camera permission is deferred to user-click (not auto-prompted). The only security surface (`chrome://` URL in error card) is addressed: rendered as `<code onClick>` copy element, not `<a href="chrome://...">`.

## Next Phase Readiness

- Plan 11-02 can immediately `import { MultimodalWebcam } from './MultimodalWebcam'` — the component builds and typechecks cleanly
- Plan 11-02 needs to: add `isLiveActive` + `liveResponse` state to `MultimodalChatPanel.tsx`; add `webcamSlot` + `isLiveActive` props to `MultimodalInput.tsx`; mount `<MultimodalWebcam>` in the tools row
- No blockers — all 5 props contract surface is implemented and exported

---
*Phase: 11-webcam-capture*
*Completed: 2026-05-20*
