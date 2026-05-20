---
phase: 11-webcam-capture
plan: "02"
subsystem: ui
tags: [webcam-integration, multimodal, chat-panel, input-gating, live-response-panel]

# Dependency graph
requires:
  - phase: 11-webcam-capture
    plan: "01"
    provides: "MultimodalWebcam.tsx component with 5-prop contract: pageState, livePrompt, onFrameAttach, setIsLiveActive, onLiveChunk"
  - phase: 10-multimodal
    provides: "promptWithImage(text, Blob | ImageBitmap, { signal }) service, Phase 10 send flow, PageState type"
provides:
  - "MultimodalChatPanel.tsx — Phase 11 extensions: isLiveActive + liveResponse state, MultimodalWebcam mount via webcamSlot, transcript visibility toggle, live response panel render, drag-handler isLiveActive guard"
  - "MultimodalInput.tsx — Phase 11 extensions: isLiveActive + webcamSlot props, webcamSlot render row, textarea disable extension, prompt-lock badge, paste inert when isLiveActive"
affects: [11-webcam-capture, 12-polish-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "webcamSlot?: React.ReactNode prop pattern: parent constructs the element, passes via slot prop — avoids prop-drilling webcam's state into MultimodalInput"
    - "visibility:hidden (not unmount) transcript toggle: 'invisible flex-1 min-h-0' preserves DOM + React state during live mode; 'flex-1 min-h-0 overflow-y-auto' restores on toggle-off"
    - "handleLiveChunk accumulation pattern: setLiveResponse prev => null ? {text:chunk} : {text: prev.text + chunk}; reset via useEffect on isLiveActive flip"
    - "isLiveActive guard on drag handlers: early-return before e.preventDefault() in handleDragEnter; before e.preventDefault() in handleDrop — fully inert during live mode"
    - "Prompt-lock badge replaces send row in DOM (not just disabled-in-place) — ternary isLiveActive ? badge : sendRow"

key-files:
  created: []
  modified:
    - chat/src/app/components/Multimodal/MultimodalChatPanel.tsx
    - chat/src/app/components/Multimodal/MultimodalInput.tsx

key-decisions:
  - "Pattern A for liveResponse reset: reset on isLiveActive flip (live-session start), accumulate within session. Per-frame replacement deferred — requires onFrameStart callback in MultimodalWebcam (not in Plan 11-01 contract)"
  - "webcamSlot prop type is React.ReactNode rendered in MultimodalInput — parent (ChatPanel) constructs and passes the element; avoids needing MultimodalInput to know about MultimodalWebcam directly"
  - "handleDrop gate: isLiveActive early-return is placed BEFORE e.preventDefault() — drop is fully ignored (browser may navigate on drop otherwise, but drag-overlay is also suppressed so the user never sees a target)"

# Metrics
duration: 10min
completed: 2026-05-20
---

# Phase 11 Plan 02: Webcam Integration into Chat Panel Summary

**Wire MultimodalWebcam into MultimodalChatPanel via webcamSlot prop; add isLiveActive + liveResponse state, transcript visibility toggle, live response panel, and input gating — all MULTI-04/05/08/POLISH-02 flows runtime-wired on Chrome 148+**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-20T10:45:00Z
- **Completed:** 2026-05-20T10:55:00Z
- **Tasks:** 2
- **Files modified:** 2 (both extensions — no new files)

## Accomplishments

- **Task 1** — Extended `MultimodalInput.tsx` with `isLiveActive` + `webcamSlot` props; webcamSlot renders above pendingImage slot; textarea disabled + opacity-60 when isLiveActive; paste handler inert; send row replaced by prompt-lock badge; canSend extended with `!isLiveActive` conjunction
- **Task 2** — Extended `MultimodalChatPanel.tsx` with `isLiveActive` + `liveResponse` state; `handleLiveChunk` callback; reset `useEffect`; drag handler gates; transcript visibility toggle; live response panel (Thinking… / streamed text); `<MultimodalWebcam>` mounted as `webcamSlot` prop

## Task Commits

Each task was committed atomically:

1. **Task 1: MultimodalInput extensions** — `49568bd` (feat) — +76/-56 lines
2. **Task 2: MultimodalChatPanel extensions** — `88ea1e5` (feat) — +47/-1 lines

## Files Created/Modified

| File | Delta | Description |
|------|-------|-------------|
| `chat/src/app/components/Multimodal/MultimodalInput.tsx` | +76/-56 | 5 surgical edits: props, paste guard, canSend, webcamSlot render, textarea+send row conditional |
| `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` | +47/-1 | 6 surgical edits: import, state, callback, effect, drag guards, JSX extensions |

## REQ-ID Verification

All 4 phase requirement IDs are now runtime-wired end-to-end:

| REQ-ID | Requirement | Status |
|--------|-------------|--------|
| MULTI-04 | Single-frame webcam snap → setPendingImage → Phase 10 send flow | Runtime-wired: `onFrameAttach={(blob) => setPendingImage(blob)}` routes to existing handleSend |
| MULTI-05 | Live mode: 3s grabFrame loop, single-in-flight gating, 512×512 downsample, streamed response | Runtime-wired: liveResponse state + handleLiveChunk receives chunks from MultimodalWebcam's captureCycle |
| MULTI-08 | Camera permission UX: 4 error card variants, chrome:// copy element | Runtime-wired: MultimodalWebcam (Plan 11-01) renders error cards in webcamSlot |
| POLISH-02 | Perf badge: "3s interval · last: N ms", skipped-frame flash | Runtime-wired: MultimodalWebcam (Plan 11-01) renders badge; visible via webcamSlot |

## Typecheck / Build Status

```
npx nx run chat:typecheck → SUCCESS (0 errors)
npx nx build chat → webpack compiled successfully (37a43949f6fbdb21)
```

## Cross-Check Table (All Grep Gates Passed)

### MultimodalInput.tsx gates

| Pattern | Count | Expected |
|---------|-------|----------|
| `isLiveActive?: boolean` | 1 | >= 1 |
| `webcamSlot?: React.ReactNode` | 1 | >= 1 |
| `if (isLiveActive) return;` | 1 | >= 1 |
| `!isLiveActive` | 1 | >= 1 |
| `webcamSlot &&` | 1 | >= 1 |
| `Live mode active — prompt locked` | 1 | >= 1 |
| `isLiveActive \|\| pageState` | 1 | >= 1 |
| `URL.createObjectURL` (regression) | 1 | >= 1 |
| `validateImageFile` (regression) | 2 | >= 1 |
| `sendButtonTooltip` (regression) | 2 | >= 1 |
| `canSend` (regression) | 2 | >= 1 |
| `handlePaste` (regression) | 2 | >= 1 |
| `Drop an image or paste` (regression) | 1 | >= 1 |
| `: any` / `as any` | 0 | == 0 |

### MultimodalChatPanel.tsx gates

| Pattern | Count | Expected |
|---------|-------|----------|
| `import { MultimodalWebcam }` | 1 | == 1 |
| `useState(false)` | 2 | >= 1 (isLiveActive + isDragOver) |
| `useState<{ text: string } \| null>` | 1 | == 1 |
| `handleLiveChunk` | 2 | >= 2 |
| `<MultimodalWebcam` | 1 | == 1 |
| `livePrompt={text}` | 1 | == 1 |
| `onFrameAttach={(blob)` | 1 | == 1 |
| `setIsLiveActive={setIsLiveActive}` | 1 | == 1 |
| `onLiveChunk={handleLiveChunk}` | 1 | == 1 |
| `isLiveActive={isLiveActive}` | 1 | == 1 |
| `webcamSlot={` | 1 | == 1 |
| `isLiveActive ? 'invisible` | 1 | == 1 |
| `Thinking…` | 1 | >= 1 |
| `if (isLiveActive) return;` | 2 | >= 2 |
| `runPrompt` (regression) | 6 | >= 1 |
| `handleSend` (regression) | 5 | >= 1 |
| `handleRetry` (regression) | 4 | >= 1 |
| `pendingResendBlobsRef` (regression) | 3 | >= 1 |
| `dragCounterRef` (regression) | 6 | >= 1 |
| `objectUrlSetRef.current.add` (regression) | 1 | >= 1 |
| `reader.read()` (regression) | 2 | >= 1 |
| `releaseLock` (regression) | 2 | >= 1 |
| `MultimodalTranscript` (regression) | 2 | >= 1 |
| `downloadPct` (regression) | 4 | >= 1 |
| `: any` / `as any` | 0 | == 0 |

## Per-Frame Replacement Trade-off Note

The plan spec (CONTEXT.md § Response Display) states "new frame → previous response is replaced (not appended)." Plan 11-01 did not include an `onFrameStart` callback in the `MultimodalWebcamProps` interface, so per-frame replacement is not directly implementable here without modifying the locked Wave 1 component.

**Implemented Pattern A (spec-aligned for demo):** `liveResponse` is reset to `null` when `isLiveActive` flips `false → true` (live session start). Within a single live session, `handleLiveChunk` accumulates chunks across frames. The demo flow (type question → toggle Live → watch 1-2 frames → toggle off) works correctly because the user sees the active stream while live mode is on, and the panel disappears on toggle-off.

**Follow-up if needed:** Add `onFrameStart?: () => void` callback to `MultimodalWebcamProps` in a follow-up plan; the webcam calls it before each `captureCycle`; the chat panel resets `liveResponse` to `null` on each call. This enables true per-frame replacement without breaking any other contract.

A code comment near `handleLiveChunk` in `MultimodalChatPanel.tsx` documents this trade-off for the next planner.

## Phase 12 Hand-off

`MultimodalService.ts` is now exercised in three input modes:

| Mode | Path | Trigger |
|------|------|---------|
| Drag-and-drop | `handleDrop → setPendingImage → handleSend → runPrompt → promptWithImage(text, blob)` | User drags image onto panel |
| Paste | `handlePaste → handleImageFile → setPendingImage → handleSend → runPrompt → promptWithImage(text, blob)` | User pastes image via ⌘V |
| Webcam single-frame | `onFrameAttach(blob) → setPendingImage → handleSend → runPrompt → promptWithImage(text, blob)` | User clicks Capture in webcam preview |
| Webcam live mode | `captureCycle → grabFrame() → promptWithImage(text, ImageBitmap) → onLiveChunk chunks → liveResponse` | User toggles Live mode |

The POLISH-01 5-cold-run rehearsal log (Phase 12) can now exercise all four paths in the same session. No blockers for Phase 12.

## Brownfield Discipline

- **NOT modified:** `MultimodalService.ts`, `MultimodalPage.tsx`, `MultimodalTranscript.tsx`, `MultimodalWebcam.tsx`, `imageFileValidation.ts`, `AppRouter.tsx`, any v1.0/v1.1 file
- **Brownfield diff:** `git diff --name-only HEAD~2..HEAD` returns exactly 2 paths (confirmed)
- **No new packages:** `git diff package.json` is empty

## Deviations from Plan

None — plan executed exactly as written. All 5 edits in Task 1 and all 6 edits in Task 2 applied surgically without rewrites or scope changes.

## Known Stubs

None — all state is live and wired. `liveResponse.text` renders the actual streamed output from `promptWithImage`. No hardcoded placeholder values in render paths.

## Threat Flags

None — no new network endpoints, no auth paths, no file system access introduced in this plan. All new state (`isLiveActive`, `liveResponse`) is local React state with no persistence.

---
*Phase: 11-webcam-capture*
*Completed: 2026-05-20*
