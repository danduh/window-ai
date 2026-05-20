# Phase 10: Multimodal Foundation — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 lands the Multimodal demo skeleton on Chrome 148+ stable (and Canary 146/147 with flags):

1. `/multimodal` + `/multimodal/docs` routes registered in `AppRouter.tsx` + nav link after "Proofreader"
2. `MultimodalPage` shell with Tabs (Docs first, Chat second — v1.1/v1.2 lesson), `max-w-6xl mx-auto p-4`
3. `MultimodalService.ts` typed wrapper around `LanguageModel.create({ expectedInputs: [{type:'image'},{type:'text'}], outputLanguage:'en' })` — pooled module-scope session
4. Chat panel with image-aware Message type, transcript, textarea + send, drop zone, paste handler, inline thumbnail preview
5. After send: user bubble shows attached image thumbnail above text (MULTI-07); assistant bubble streams text response below
6. `MissingFlagBanner` (re-used from Phase 8 move) with multimodal-specific copy when `LanguageModel.availability({expectedInputs:[{type:'image'}]})` returns `'unavailable'`
7. SEO entries `seoConfigs.multimodal` + `seoConfigs.multimodalDocs` in BOTH `useSEOData.ts` and `prerender-react.js` (byte-identical) — Phase 12 audits

Out of scope:
- Webcam single-frame capture (MULTI-04) → Phase 11
- Webcam live mode + downsample + single-in-flight gating (MULTI-05) → Phase 11
- Camera permission UX (MULTI-08) → Phase 11
- Webcam performance indicator (POLISH-02) → Phase 11
- `/multimodal/docs` markdown content (DOC-02) → Phase 12
- SEO byte-identical `grep -F` audit (DOC-03) → Phase 12
- 5-cold-run rehearsal log (POLISH-01) → Phase 12

</domain>

<decisions>
## Implementation Decisions

### Chat Panel Architecture
- **New chat panel built from scratch under `chat/src/app/components/Multimodal/`** — does NOT extend existing `/chat` ChatPage. Brownfield discipline; `/chat` stays untouched. Multimodal needs image-aware Message type and a different input UX (drop zone + paste).
- **Component subdir layout** (mirrors Phase 8 Proofreader/):
  - `MultimodalPage.tsx` — top-level page; route handler; manages PageState + messages
  - `MultimodalHeader.tsx` — title + tagline (mirrors `ProofreaderHeader` / `GenerativeUIHeader`)
  - `MultimodalChatPanel.tsx` — transcript + input area; orchestrates drop/paste/send
  - `MultimodalTranscript.tsx` — renders Message[] (user bubble shows thumbnail + text; assistant bubble shows streaming text)
  - `MultimodalInput.tsx` — textarea + thumbnail preview slot + send button; owns drop zone + paste handlers
- **Message type** (exported from `MultimodalPage.tsx` or a co-located `types.ts`):
  ```ts
  type Message = {
    id: string;                  // crypto.randomUUID() — Chrome stable
    role: 'user' | 'assistant';
    text: string;                // assistant text streams in; user text is final
    attachedImageUrl?: string;   // user-only — object URL created via URL.createObjectURL(blob)
  };
  ```
  - Object URLs created when image attached; revoked on `MultimodalPage` unmount (track in a ref-held Set, revoke all in cleanup) AND when a transcript is cleared / user removes the attachment before send.
- **Transient transcripts** — no IndexedDB persistence. Refresh wipes the conversation. REQUIREMENTS.md line 60 explicitly allows this.

### MultimodalService API Surface
- **File path**: `chat/src/app/services/MultimodalService.ts`
- **Module-scope pooled session** — a single `Promise<LanguageModel>` cached at module scope, lazy-initialized on first call. Mirrors `ChatAIService` and `ProofreaderService` caching. Phase 11 webcam-live builds on the same pool. Exports `destroyAllSessions()` cleanup helper invoked from `MultimodalPage` unmount.
- **Public API surface** (Phase 10):
  ```ts
  // Top-level entry. Returns a stream of incremental text chunks.
  export function promptWithImage(
    text: string,
    image: Blob | ImageBitmap,
    opts?: { signal?: AbortSignal }
  ): Promise<ReadableStream<string>>;

  // Capability probe — returns 'unavailable' if image input not supported.
  export function getAvailability(): Promise<AvailabilityState>;

  // First-call download UX hook (lazy session creation with monitor callback).
  export function createWithProgress(
    onProgress: (pct: number) => void
  ): Promise<LanguageModel>;

  export function destroyAllSessions(): void;
  ```
- **Session creation options** (locked):
  ```ts
  {
    expectedInputs: [{ type: 'image' }, { type: 'text' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
    monitor: ... // wired only by createWithProgress
  }
  ```
- **Streaming response** — `promptWithImage` returns `ReadableStream<string>` (via `session.promptStreaming([{ role:'user', content:[{ type:'text', value:text },{ type:'image', value:image }] }])`). Mirrors `/chat` and `/writer` streaming pattern; incremental render improves perceived latency.

### Image Input UX
- **Drop zone scope: entire chat panel.** During drag-over: panel border switches to dashed `border-primary-500`, a translucent overlay with centered "Drop image here" appears. `dragenter`/`dragleave` ref counter prevents flicker. Drop handler validates MIME (JPEG / PNG / WebP) then sets the pending attachment.
- **Paste handler** — `onPaste` listener on the textarea reads `clipboardData.items`; first image item becomes the pending attachment (same path as drop). No separate paste button.
- **Thumbnail preview**: above the textarea inside the input frame, compact `w-20 h-20 object-cover rounded`, with an "×" remove button overlapping the top-right corner. After send: same image renders inline in user-bubble at slightly larger size (`max-w-xs`).
- **Invalid image handling**: inline error message below the input area (`text-sm text-red-600 dark:text-red-400`), text `"Only JPEG, PNG, or WebP images supported"`. Auto-clears after 4s OR on next successful attach. No toast library.
- **Demo affordance — default content**: empty chat, textarea placeholder `"Drop an image or paste (⌘V) — then ask me about it"`. Send button disabled until BOTH text and image are present.

### Availability Detection + MissingFlagBanner
- **Detection**: `await LanguageModel.availability({ expectedInputs: [{ type: 'image' }] })` — handles both Chrome 148 stable (no flag) and Canary 146/147 (flag-gated). Returns `'unavailable' | 'downloadable' | 'downloading' | 'available'`. If thrown (older Canary without availability()), treat as `'unavailable'` and show the banner.
- **PageState machine**: `'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error'`. Mirrors Proofreader's state pattern. `'prompting'` covers the duration of a single streaming response.
- **MissingFlagBanner props**:
  - title: `"Multimodal image input isn't available."`
  - body: `"Update to Chrome 148+ stable, or enable the flags below in Chrome 146+ Canary, then reload."`
  - flags:
    1. `{ name: 'Optimization Guide On Device', url: 'chrome://flags/#optimization-guide-on-device-model', note: 'set to "Enabled BypassPerfRequirement"' }`
    2. `{ name: 'Prompt API multimodal input', url: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input', note: 'set to "Enabled"' }`
  - browserRequirement: `"Chrome 148+ stable (no flags) or Chrome 146+ Canary"`
- **Page behavior when unavailable**: banner renders above the header; chat input disabled with tooltip `"Enable multimodal image input to use this demo"`. Drop zone inert. **Docs tab remains usable** (matches Proofreader pattern).
- **Page behavior when downloading**: shows progress bar with byte-counter from `monitor` callback under the input area (mirrors Phase 8 Proofreader pattern).

### Routing + Nav Link
- **Routes registered** in `AppRouter.tsx`: `<Route path="/multimodal" element={<MultimodalPage />} />` and `<Route path="/multimodal/docs" element={<MultimodalPage />} />`. `MultimodalPage` switches via `location.pathname.startsWith('/multimodal/docs')` (uses startsWith per RESEARCH Pitfall 6 — same as Proofreader).
- **Nav link**: label `"Multimodal"`, placed AFTER `"Proofreader"` in both desktop (~line 75) and mobile (~line 170) nav. `font-medium` per v1.0/v1.1/v1.2 convention. GA event: `trackUserInteraction('navigation_click', 'multimodal_link')`.

### SEO + Page Metadata
- `seoConfigs.multimodal` + `seoConfigs.multimodalDocs` added to `chat/src/app/hooks/useSEOData.ts` AND byte-identical mirrors in `chat/scripts/prerender-react.js` (Phase 12 runs the `grep -F` audit).
- **Title (locked)**: `"Multimodal — Ask Gemini Nano about images on-device | Chrome AI APIs"`
- **Description (locked)**: `"Drag, paste, or capture an image — Gemini Nano answers your questions about it on-device with zero network. Chrome 148+ stable or flag-gated Canary."`
- **Docs title (locked)**: `"Multimodal API Docs — expectedInputs, image types, webcam-live pattern | Chrome AI APIs"`

### Tabs
- `Tabs` component with **Docs FIRST** (path `/docs`, placeholder content "Documentation coming in Phase 12"), **Chat SECOND** (path empty). Carries v1.1 + Phase 8 lesson — Tabs.tsx matches via `.includes(tab.path)`, the empty-path tab matches everything, so Docs must come first.

### Error Handling
- **Multimodal unavailable** → MissingFlagBanner + disabled input (above).
- **Model downloading** → progress bar under input; send button shows `"Download model first"` until ready.
- **promptWithImage throws** → inline error inside the assistant bubble (`"Couldn't process image — [error message]"`) with a Retry button on the message. The user's bubble (image + text) remains. No alert(), no console-only failure.
- **Image MIME rejected** → inline error in the input area (covered under Image Input UX).

### Claude's Discretion
- Exact textarea placeholder copy variations (above is the starting point) — planner can refine
- Exact tooltip copy for disabled send / disabled input — planner picks
- Whether the assistant bubble's "Thinking…" placeholder is a static `…` or a small animated spinner — planner picks
- Whether image attachments in the input frame show a small filename label below the thumbnail — planner can include if trivial
- Tailwind class specifics for drag-over highlight (border style, overlay opacity) — planner picks; should be visible against both light + dark backgrounds
- Whether send button is icon-only (paper-plane) or "Send" text or both — planner picks; v1.0/v1.1 use both, mirror that

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/types/dom-chromium-ai.d.ts` — already declares `expectedInputs` array with `type: 'text' | 'image' | 'audio' | ...` (line 23). No new ambient types needed for Phase 10; Phase 10 may add a `MultimodalContentPart` helper type INSIDE `MultimodalService.ts` rather than the ambient file.
- `chat/src/app/services/ChatAIService.ts` — module-scope session caching pattern (`let session: any = null`). Mirror with proper typing for `MultimodalService`.
- `chat/src/app/services/ProofreaderService.ts` (Phase 8) — closest analog for: pooled `Map`-keyed sessions, `createWithProgress` shape, `destroyAllSessions` cleanup, `getAvailability` wrapper.
- `chat/src/app/services/WriterService.ts` — streaming `ReadableStream<string>` return pattern.
- `chat/src/app/components/MissingFlagBanner.tsx` (moved in Phase 8) — Phase 10 just imports and passes new props; NO component changes.
- `chat/src/app/components/Tabs.tsx` — reusable Tabs; Docs first, content second per v1.1 lesson.
- `chat/src/app/components/Proofreader/ProofreaderPage.tsx` (Phase 8) — closest layout analog: PageState machine, `useSEOData` path switching, Tabs ordering, banner conditional, lifecycle cleanup.
- `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` (v1.1) — chat-with-bubbles UI pattern; transcript scroll behavior, streaming render. Mirror the transcript shape.
- `chat/src/app/components/ChatBox.tsx` — generic bubble component (may or may not be reusable for image-bearing messages — planner decides).
- `chat/src/app/hooks/useSEOData.ts` — `seoConfigs` map structure.
- `chat/src/app/AppRouter.tsx` — desktop nav (~line 75), mobile nav (~line 170), Route registration (~line 245 — Proofreader entries already there).

### Established Patterns
- Page = component subdir + service wrapper + AppRouter route + nav link + SEO entry (mirrored in prerender-react.js).
- StrictMode-safe `useEffect` with `cancelled` flag for async page-mount work.
- Module-scope session pool keyed by config (Proofreader by language; Multimodal: single session — no key).
- Native APIs only — no polyfill. Carries from v1.0/v1.1/v1.2.
- TS strict; no `any`, no `as any` at API boundaries.
- Tailwind v4 with `dark:` variants. `max-w-6xl mx-auto p-4` for page outer wrapper.
- Streaming AI responses use `ReadableStream<string>` and render incrementally.
- localStorage usage: `try/catch` wrapped (private mode / SSR no-op).
- `useSEOData(...)` called with the path string AND the config object; path switched via `location.pathname.startsWith('/x/docs')`.

### Integration Points
- `AppRouter.tsx`: add Multimodal Route entries after Proofreader Routes. Add desktop + mobile nav links after Proofreader links. Track via `trackUserInteraction('navigation_click', 'multimodal_link')`.
- `useSEOData.ts`: add `seoConfigs.multimodal` and `seoConfigs.multimodalDocs`.
- `prerender-react.js`: add both routes + matching `seoConfigs` strings (byte-identical — Phase 12 `grep -F` validates).
- `dom-chromium-ai.d.ts`: no changes (already declares `expectedInputs` shape).

</code_context>

<specifics>
## Specific Ideas

- **Object URL leak prevention**: User-bubble thumbnails use `URL.createObjectURL(blob)`. Track URLs in a `useRef<Set<string>>()` populated on attach; revoke ALL on `MultimodalPage` unmount via `URL.revokeObjectURL(url)`. Without cleanup, image blobs leak memory across page navigations.
- **Pending attachment vs sent attachment**: keep `pendingImage: Blob | null` in `MultimodalChatPanel` local state for the preview; on send, the blob is converted to an object URL stored on the Message AND passed as a Blob to `promptWithImage`. The pending state resets only after send completes (so the user can't fire two sends with the same image).
- **Send button gating**: disabled unless (`text.trim().length > 0` AND `pendingImage !== null` AND `pageState === 'ready'`). When disabled, tooltip explains which condition is missing.
- **Streaming render**: the assistant message is created with empty `text` BEFORE the first chunk arrives; chunks accumulate via `setMessages(prev => prev.map(m => m.id === streamingId ? {...m, text: m.text + chunk} : m))`. Use `requestAnimationFrame`-friendly batching if perf is an issue (likely not at v1.2 scale).
- **Drag/drop on the whole panel** is more demo-friendly than just-input because of the demo-day scenario where the speaker grabs an image from a tab and drags it to the projected screen. Panel-wide drop target = much larger target.
- **MULTI-07's "thumbnails inline above message text"** — the inline image is in the SAME bubble as the user text (not a sibling bubble). One bubble, image on top, text below.

</specifics>

<deferred>
## Deferred Ideas

- Webcam single-frame capture button → Phase 11 (MULTI-04)
- Webcam live mode + 512×512 downsample + single-in-flight + session reuse → Phase 11 (MULTI-05)
- `ImageCapture.grabFrame()` usage → Phase 11
- Camera permission UX (`NotAllowedError`, `OverconstrainedError` cards) → Phase 11 (MULTI-08)
- Webcam performance indicator (frame interval + last latency) → Phase 11 (POLISH-02)
- `/multimodal/docs` markdown content → Phase 12 (DOC-02)
- SEO `grep -F` byte-identical audit → Phase 12 (DOC-03)
- 5-cold-run rehearsal log entry for Multimodal → Phase 12 (POLISH-01)
- Multi-image attachments in a single message — out of v1.2 scope (single-image MVP per REQUIREMENTS.md "v2 / Deferred")
- Persisting transcript history to IndexedDB — out of scope (transient by design)
- `session.append()` pre-processing pattern for latency-sensitive flows — Phase 11 webcam-live may adopt; Phase 10 uses straightforward `prompt()` with a single content array
- Audio input modality — v1.3 (Chrome 148 audio requires discrete GPU)

</deferred>
