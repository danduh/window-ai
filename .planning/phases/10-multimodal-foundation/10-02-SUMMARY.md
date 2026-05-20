---
phase: 10-multimodal-foundation
plan: "02"
subsystem: multimodal-demo
tags: [chat-panel, drag-drop, paste, streaming, transcript, image-input, object-url-lifecycle]
dependency_graph:
  requires: [10-01]
  provides: [MultimodalChatPanel, MultimodalTranscript, MultimodalInput, imageFileValidation, /multimodal chat tab]
  affects: [MultimodalPage]
tech_stack:
  added: []
  patterns: [dragCounterRef-flicker-prevention, reader-read-loop, commit-time-object-url, pendingResendBlobsRef-retry, lifted-mime-error-state]
key_files:
  created:
    - chat/src/app/components/Multimodal/imageFileValidation.ts
    - chat/src/app/components/Multimodal/MultimodalInput.tsx
    - chat/src/app/components/Multimodal/MultimodalTranscript.tsx
    - chat/src/app/components/Multimodal/MultimodalChatPanel.tsx
  modified:
    - chat/src/app/components/Multimodal/MultimodalPage.tsx
decisions:
  - mimeError state lifted to MultimodalChatPanel so both drop (panel) and paste (input) share the same auto-clearing error banner
  - Retry uses Option B (pendingResendBlobsRef Map keyed by userMsg.id) — no Message type extension needed; blob stored at send time, retrieved on retry
  - runPrompt helper extracted as shared streaming loop invoked by both handleSend and handleRetry
  - pointer-events-none on drag overlay prevents overlay from swallowing the drop event before it reaches the container handler
metrics:
  duration_minutes: 20
  completed_date: "2026-05-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 10 Plan 02: Multimodal Chat Panel Summary

**One-liner:** Drag-drop + clipboard-paste image input with MIME validation, streaming transcript with image-above-text user bubbles, full error/retry path, and object URL lifecycle management.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Leaf components — imageFileValidation, MultimodalInput, MultimodalTranscript | bc3371e | chat/src/app/components/Multimodal/imageFileValidation.ts, MultimodalInput.tsx, MultimodalTranscript.tsx |
| 2 | MultimodalChatPanel orchestrator + MultimodalPage Chat tab wiring | 4bf22f7 | chat/src/app/components/Multimodal/MultimodalChatPanel.tsx, MultimodalPage.tsx |

---

## File Details

### New Files (4 created)

**chat/src/app/components/Multimodal/imageFileValidation.ts** (17 lines)
- Exports: `ALLOWED_MIME_TYPES` (Set), `validateImageFile` (function)
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`
- Error message: `"Only JPEG, PNG, or WebP images supported"` (locked per CONTEXT.md)
- Shared by both MultimodalInput (paste path) and MultimodalChatPanel (drop path)

**chat/src/app/components/Multimodal/MultimodalInput.tsx** (163 lines)
- Props: `text`, `setText`, `pendingImage`, `setPendingImage`, `onSend`, `pageState`, `mimeError`, `setMimeError`
- `mimeError` and `setMimeError` are lifted props (state lives in ChatPanel) — auto-clear `useEffect` still here
- `previewUrl` derived from `pendingImage` via `useMemo` + revoked in cleanup `useEffect` (Pitfall 2)
- `handlePaste`: reads `clipboardData.items`, finds first image item, calls `validateImageFile`
- Send gating: `text.trim() && pendingImage !== null && pageState === 'ready'`
- Disabled tooltips: unavailable → downloading → no image → no text
- Paper-plane SVG icon (ready state) / spinner SVG (prompting state) + text label mirrors v1.0/v1.1 pattern

**chat/src/app/components/Multimodal/MultimodalTranscript.tsx** (107 lines)
- Props: `messages: Message[]`, `onRetry: (id) => void`
- Empty state: camera SVG (w-12 h-12 opacity-50) + "Drop an image or paste (⌘V) to get started"
- User bubble: `bg-primary-500 text-white` with `<img>` ABOVE `<Markdown>` in SAME bubble (MULTI-07)
- Assistant bubble: "Thinking…" placeholder (animate-pulse) → streaming Markdown → error + Retry button
- `scrollIntoView({ behavior: 'smooth' })` on messages change via `messagesEndRef`
- No ChatBox.tsx imports (Pitfall 6 — incompatible Message type)

**chat/src/app/components/Multimodal/MultimodalChatPanel.tsx** (213 lines)
- Props: `messages`, `setMessages`, `pageState`, `setPageState`, `downloadPct`, `objectUrlSetRef`
- `dragCounterRef = useRef(0)` — increments on dragenter, decrements on dragleave; overlay only shows when count > 0 (Pitfall 4 flicker prevention)
- `handleDrop`: calls `e.preventDefault()` on all four drag handlers (prevents browser navigation)
- `URL.createObjectURL` called ONCE at commit time in `handleSend` (not for preview — Pitfall 2); URL tracked in `objectUrlSetRef.current`
- `runPrompt`: shared streaming loop — `reader.read()` loop (NOT `for await` — Pitfall 1), `reader.releaseLock()` in `finally`
- Error path: assistant bubble gets `error: "Couldn't process image — {message}"` (locked copy per CONTEXT.md)
- `pendingResendBlobsRef: Map<string, Blob>` — keyed by user message id; enables Retry to re-prompt with original Blob
- `handleRetry`: replaces failed assistant message with fresh streaming placeholder, re-runs `runPrompt`
- Drag overlay: `pointer-events-none` so drop event reaches container `onDrop` handler
- Download progress bar: `pageState === 'downloading'` shows `{downloadPct.toFixed(0)}%`

### Modified Files (1 revised)

**chat/src/app/components/Multimodal/MultimodalPage.tsx**
- Added: `import { MultimodalChatPanel } from './MultimodalChatPanel'`
- Chat tab content: replaced placeholder `"Chat panel coming in plan 10-02."` with `<MultimodalChatPanel messages={messages} setMessages={setMessages} pageState={pageState} setPageState={setPageState} downloadPct={downloadPct} objectUrlSetRef={objectUrlSetRef} />`
- Removed: `void messages; void setMessages; void downloadPct;` suppressors (these are now consumed)
- Kept: `void error;` (error state not yet rendered in UI — deferred to Phase 12)
- `tabs` useMemo deps updated to `[messages, pageState, downloadPct, setMessages, setPageState, objectUrlSetRef]`

---

## Automated Cross-Check Results

| Check | Command | Result |
|-------|---------|--------|
| Shared helper — both consumers | `grep -l "from './imageFileValidation'"` | MultimodalInput.tsx + MultimodalChatPanel.tsx |
| Preview URL count (Input) | `grep -c URL.createObjectURL MultimodalInput.tsx` | 1 |
| Commit URL count (Panel) | `grep -c URL.createObjectURL MultimodalChatPanel.tsx` | 1 |
| objectUrlSetRef.current.add | `grep -c objectUrlSetRef.current.add` | 1 |
| No for-await | `grep -c "for await" MultimodalChatPanel.tsx` | 0 |
| reader.read() | `grep -c "reader.read()"` | 2 (comment + call) |
| dragCounterRef.current | `grep -c dragCounterRef.current` | 4 |
| No ChatBox imports | `grep -rl "from.*ChatBox" Multimodal/` | 0 files |
| img before Markdown in user bubble | `grep -A8 "role === 'user'"` | img on line 6, Markdown below |
| No :any | `grep -c ": any"` | 0 in all 4 files |
| Typecheck | `npx nx run chat:typecheck` | 0 errors |
| Build | `npx nx build chat` | webpack compiled successfully |

---

## Smoke Test Results

Build-level verification only (browser smoke test requires Chrome 148+ with multimodal flags):

**Typecheck:** 0 errors across all 5 files (4 new + 1 modified)
**Build:** webpack compiled successfully — no bundle errors
**Pitfall 1 (reader lock):** Confirmed `reader.read()` loop with `reader.releaseLock()` in `finally`; `for await` count = 0
**Pitfall 2 (object URL premature revoke):** Confirmed — preview URL lives in `useMemo` + revokes on change in `MultimodalInput`; commit URL created in `handleSend` and tracked in `objectUrlSetRef` for page-unmount revocation
**Pitfall 4 (drag flicker):** Confirmed `dragCounterRef.current` used in all 4 drag handlers (enter/leave/drop/declaration) — overlay only shows when count > 0
**Pitfall 6 (ChatBox collision):** Confirmed 0 files in `Multimodal/` import from ChatBox
**MULTI-07 (image above text):** Confirmed `<img>` renders on line 6 before `<Markdown>` in user bubble

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Plan-Directed Deviations (not auto-fix — part of plan spec)

**1. mimeError state lifted to MultimodalChatPanel**
- **Directed by:** Task 2 action text — "Decision: LIFT mimeError state to MultimodalChatPanel"
- **Reason:** Drop path (ChatPanel) and paste path (Input) must share the same error state for consistent UX
- **Implementation:** `MultimodalInput` accepts `mimeError: string | null` + `setMimeError: (e: string | null) => void` as props; auto-clear `useEffect` remains in `MultimodalInput` (operating on prop via `setMimeError`)
- **Files modified:** MultimodalInput.tsx (4 lines added to props interface), MultimodalChatPanel.tsx (state declared + passed down)

**2. Retry implementation — Option B (pendingResendBlobsRef)**
- **Directed by:** Task 2 action — "Pick Option B: pendingResendBlobsRef Map"
- **Reason:** Avoids extending the Plan 01 `Message` type; blob stored in a ref Map at send time; looked up on retry
- **Files modified:** MultimodalChatPanel.tsx only

**3. runPrompt helper extracted**
- **Directed by:** Task 2 — "Extract the streaming-loop body into a helper runPrompt"
- **Files modified:** MultimodalChatPanel.tsx

---

## Phase 10 Demo Confirmation

The 2-minute demo flow is wired and verified at build level:

1. `/multimodal` route → Chat tab → empty state with camera icon
2. Drop/paste a JPEG/PNG/WebP → thumbnail preview (w-20 h-20) + × remove button appears
3. Invalid MIME → inline error "Only JPEG, PNG, or WebP images supported" auto-clears after 4s
4. Drag over panel → dashed `border-primary-500` border + "Drop image here" overlay (no flicker)
5. Type question → send button enabled (`bg-primary-600`)
6. Send → user bubble (image above text, `bg-primary-500`) + empty assistant bubble ("Thinking…")
7. Chunks stream in → assistant bubble text accumulates chunk-by-chunk
8. Error path → `"Couldn't process image — {message}"` + Retry button in assistant bubble; user bubble intact
9. Retry → re-prompts with stored Blob; fresh streaming assistant bubble replaces error bubble
10. Page unmount → `objectUrlSetRef.current.forEach(URL.revokeObjectURL)` in Plan 01 cleanup

---

## Object URL Cleanup Confirmation

Object URL lifecycle is correctly partitioned across two distinct pathways:

| URL Type | Where Created | Where Revoked |
|----------|---------------|---------------|
| Preview URL (pre-send thumbnail) | `useMemo` in MultimodalInput | `useEffect` cleanup in MultimodalInput (on blob change or unmount) |
| Committed URL (sent message thumbnail) | `handleSend` in MultimodalChatPanel | `objectUrlSetRef` cleanup in MultimodalPage.tsx unmount effect (Plan 01 wired this) |

No URL is created more than once per lifecycle event. The `objectUrlSetRef.current.add()` call in `handleSend` ensures the page-level cleanup in `MultimodalPage.tsx` can revoke all committed URLs even after navigation.

---

## Phase 11 Hand-off Note

`MultimodalService.promptWithImage` already accepts `Blob | ImageBitmap` as its second argument:

```typescript
export async function promptWithImage(
  text: string,
  image: Blob | ImageBitmap,   // <-- Phase 11 passes ImageBitmaps here
  opts?: { signal?: AbortSignal }
): Promise<ReadableStream<string>>
```

Phase 11 webcam-live will pass `ImageBitmap` objects created via:
```javascript
createImageBitmap(videoFrame, { resizeWidth: 512, resizeHeight: 512 })
```

No changes needed to `MultimodalService.ts` or `MultimodalChatPanel.tsx` for Phase 11 webcam integration — the service and streaming loop are Blob/ImageBitmap agnostic. Phase 11 adds a new input path (webcam capture button) that calls the same `handleSend`-equivalent path in an extended ChatPanel.

Note: For webcam-live, the `pendingResendBlobsRef` pattern will need extension since `ImageBitmap` objects cannot be stored as-is after `close()` is called on them (Phase 11 concern).

---

## Known Stubs

None introduced in this plan. The "Documentation coming in Phase 12." placeholder in the Docs tab is a carry-over from Plan 01 (intentional — documented in 10-01-SUMMARY.md known stubs).

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Image input comes from `DataTransfer`/`Clipboard` APIs (same-origin blobs only). Object URLs are created and revoked within the component lifecycle. No threat surface additions.

---

## Self-Check: PASSED

All created files exist on disk. Both task commits exist in git log. Typecheck produces 0 errors. Build succeeds.
