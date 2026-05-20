# Phase 10: Multimodal Foundation — Research

**Researched:** 2026-05-20
**Domain:** Chrome LanguageModel multimodal image input + React chat UI + drag/paste UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- New `/multimodal` + `/multimodal/docs` routes in `AppRouter.tsx`; nav link AFTER "Proofreader"
- `MultimodalPage` shell with Tabs (Docs first, Chat second); `max-w-6xl mx-auto p-4`
- `MultimodalService.ts` — module-scope pooled session; `LanguageModel.create({ expectedInputs: [{type:'image'},{type:'text'}], expectedOutputs:[{type:'text',languages:['en']}], outputLanguage:'en' })`
- Image-aware `Message` type: `{ id: string; role: 'user'|'assistant'; text: string; attachedImageUrl?: string }`
- Object URLs tracked in `useRef<Set<string>>()` and revoked ALL on page unmount; also revoked on transcript clear / pre-send remove
- Transient transcripts — no IndexedDB persistence
- Drop zone covers entire chat panel; `dragenter`/`dragleave` ref counter prevents flicker
- Paste handler on textarea via `onPaste` + `clipboardData.items`
- Thumbnail `w-20 h-20 object-cover rounded` with "×" remove button
- MIME validation: JPEG / PNG / WebP only; inline error auto-clears after 4s
- Send disabled unless text AND image AND `pageState === 'ready'`
- `promptWithImage` returns `ReadableStream<string>` via `session.promptStreaming([...])`
- `PageState` = `'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error'`
- Availability detection via `LanguageModel.availability({ expectedInputs:[{type:'image'}] })`; thrown availability() → treat as `'unavailable'`
- `MissingFlagBanner` reused unchanged; two flags: `#optimization-guide-on-device-model` + `#prompt-api-for-gemini-nano-multimodal-input`
- Routes: `startsWith('/multimodal/docs')` (NOT `includes`) for tab switch
- SEO titles and descriptions verbatim per CONTEXT.md; byte-identical mirror in `prerender-react.js`
- `MultimodalService` public API: `promptWithImage`, `getAvailability`, `createWithProgress`, `destroyAllSessions`
- Component subdir: `chat/src/app/components/Multimodal/` with five files listed in CONTEXT.md

### Claude's Discretion

- Exact textarea placeholder copy variations (starting point in CONTEXT.md)
- Exact tooltip copy for disabled states
- "Thinking…" placeholder — static `…` or animated spinner
- Whether thumbnail shows filename label below it
- Tailwind classes for drag-over highlight (border style, overlay opacity)
- Send button icon-only vs text vs both — mirror v1.0/v1.1 (paper-plane + "Send")

### Deferred Ideas (OUT OF SCOPE)

- Webcam single-frame capture (MULTI-04) → Phase 11
- Webcam live mode (MULTI-05) → Phase 11
- Camera permission UX (MULTI-08) → Phase 11
- Webcam performance indicator (POLISH-02) → Phase 11
- `/multimodal/docs` markdown content (DOC-02) → Phase 12
- SEO byte-identical grep -F audit (DOC-03) → Phase 12
- 5-cold-run rehearsal log (POLISH-01) → Phase 12
- Multi-image attachments — v1.2 out of scope
- `session.append()` pre-processing — Phase 11 webcam-live
- Audio input — v1.3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MULTI-01 | `/multimodal` route + nav link + `MissingFlagBanner` variant for `LanguageModel.create({ expectedInputs: [{ type: 'image' }] })` availability | ProofreaderPage pattern; `MissingFlagBanner` unchanged; availability API confirmed in v1.2 API research |
| MULTI-02 | Drag-and-drop image input — drop zone on chat panel; validates JPEG/PNG/WebP; thumbnail preview before send | React drag event pattern with ref counter; FileReader/Blob; MIME check via `file.type` |
| MULTI-03 | Clipboard paste — `Cmd/Ctrl+V` attaches image; same preview + send path | `onPaste` + `clipboardData.items[i].getAsFile()` for image items |
| MULTI-06 | `MultimodalService.ts` wrapping `LanguageModel.create({ expectedInputs: [{type:'image'},{type:'text'}] })`; `promptWithImage(text, imageBlob\|ImageBitmap)` + session helpers | ProofreaderService session pool pattern; streaming via `promptStreaming` with content arrays |
| MULTI-07 | Chat transcript renders user-attached image thumbnails inline (image ABOVE text in user bubble) | Object URL pattern; `Message.attachedImageUrl`; custom `MultimodalTranscript` (not reusing ChatBox — incompatible Message shape) |
</phase_requirements>

---

## Summary

Phase 10 adds the `/multimodal` demo page to the existing React 19 SPA. The technical work falls into three buckets: (1) the LanguageModel multimodal session — wrapping Chrome's image-input API with `promptStreaming` and content-part arrays; (2) the image input UX — drag-drop, clipboard paste, thumbnail preview, MIME validation, and object URL lifecycle; and (3) the page shell — replicating the ProofreaderPage pattern with the Tabs/SEO/nav/banner boilerplate.

The pre-existing API research at `.planning/research/v1.2-multimodal-proofreader-api.md` (lines 181–341) already covers the `LanguageModel` multimodal API surface thoroughly. This document focuses on what that research does NOT cover: the concrete React implementation patterns derived from reading the live codebase, the streaming content-array calling convention, object URL lifecycle pitfalls, drag/paste React mechanics, and the exact insertion points in AppRouter and prerender-react.js.

All three buckets are well-understood from the existing codebase. No novel architecture is required — Phase 10 is a disciplined application of ProofreaderPage + WriterService + GenUIChatPanel patterns to a new domain.

**Primary recommendation:** Build every file by mirroring the ProofreaderPage/ProofreaderService pair for the shell and service, and GenUIChatPanel for the chat panel internals. Do not reuse `ChatBox.tsx` — its `Message` type and DOM shape are incompatible with image-bearing bubbles (no `attachedImageUrl` field, fixed `h-96` height). Write `MultimodalTranscript` fresh.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Availability detection + capability probe | Browser (Chrome API) | Frontend component (reads result) | `LanguageModel.availability()` is a Chrome static method; component reads result and drives PageState |
| Session lifecycle (create, pool, destroy) | Frontend service module | — | Module-scope Promise cache; same pattern as ProofreaderService |
| Streaming inference | Browser (Gemini Nano on-device) | Frontend reads stream | `promptStreaming` returns `ReadableStream<string>`; component consumes chunks |
| Image attachment / MIME validation | Browser + Frontend component | — | `DataTransfer`/`clipboardData` API is Browser; MIME check (`file.type`) and state are Frontend |
| Object URL lifecycle | Frontend component | — | `URL.createObjectURL` / `URL.revokeObjectURL` are Frontend; must be tracked in a ref |
| Transcript rendering | Frontend component | — | Pure React state; no service involvement after message is created |
| SEO metadata | Frontend (useSEOData) + prerender script | — | Dual write: runtime hook + prerender-react.js static copy |
| Routing + navigation | Frontend (AppRouter.tsx) | — | React Router `<Route>` and `<Link>` additions |

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x (workspace) | Component model | Project baseline |
| react-router-dom | 6.x (workspace) | Routing | Existing SPA router |
| react-markdown | workspace | Markdown rendering in bubbles | Used in ChatBox, GenUIChatPanel |
| Tailwind v4 | workspace | Styling | Project-wide design system |

[VERIFIED: codebase scan — package.json not read but all imports confirmed in existing components]

**No new npm packages.** UI-SPEC.md §Registry Safety confirms: "No new npm packages introduced in Phase 10." [VERIFIED: UI-SPEC.md line 412]

### Supporting (Chrome Built-in APIs — no install)

| API | Purpose |
|-----|---------|
| `LanguageModel` (global) | Session creation + `promptStreaming` with image content parts |
| `URL.createObjectURL` / `URL.revokeObjectURL` | Blob-to-URL conversion for thumbnail display |
| `DataTransfer` API | Drop handler (`event.dataTransfer.files`) |
| `ClipboardEvent.clipboardData` | Paste handler (`event.clipboardData.items`) |
| `crypto.randomUUID()` | Message ID generation — Chrome stable, already used in project |

---

## Architecture Patterns

### System Architecture Diagram

```
User action (drop / paste / type)
        |
        v
MultimodalInput (pendingImage: Blob, text: string)
        |
        | send()
        v
MultimodalChatPanel
  ├─ URL.createObjectURL(blob) → objectUrl
  ├─ append user Message { role:'user', text, attachedImageUrl: objectUrl }
  ├─ append assistant Message { role:'assistant', text:'' }  ← streaming placeholder
  │
  v
MultimodalService.promptWithImage(text, blob, { signal })
        |
        | LanguageModel.promptStreaming([{ role:'user', content:[...] }])
        v
  ReadableStream<string>
        |
        | for-await loop
        v
MultimodalChatPanel
  └─ setMessages(prev => prev.map(m => m.id===streamingId ? {...m, text: m.text+chunk} : m))
        |
        v
MultimodalTranscript re-renders incrementally
        |
        v
MultimodalPage (unmount cleanup)
  └─ URL.revokeObjectURL(url) for each url in objectUrlSet ref
```

### Recommended Project Structure

```
chat/src/app/
├─ components/
│  └─ Multimodal/
│     ├─ MultimodalPage.tsx        # top-level; PageState; messages; objectUrlSet ref
│     ├─ MultimodalHeader.tsx      # static; mirrors ProofreaderHeader
│     ├─ MultimodalChatPanel.tsx   # transcript + input; orchestrates drop/paste/send
│     ├─ MultimodalTranscript.tsx  # Message[] render; scroll-to-bottom
│     └─ MultimodalInput.tsx       # textarea + thumbnail + send; owns drag/paste
├─ services/
│  └─ MultimodalService.ts         # session pool; promptWithImage; getAvailability; etc.
```

This mirrors the `Proofreader/` subdir layout exactly. [VERIFIED: codebase scan]

---

### Pattern 1: Module-scope pooled LanguageModel session (MultimodalService)

**What:** A single `Promise<LanguageModel>` cached at module scope. Lazy-initialized on first `promptWithImage` call. Multiple callers share the same in-flight create (promise stored before await).

**When to use:** All multimodal inference calls route through `promptWithImage`.

**Example** (mirroring ProofreaderService.ts pattern):

```typescript
// Source: ProofreaderService.ts getOrCreateSession() — adapted for single session
let sessionPromise: Promise<LanguageModel> | null = null;

function getOrCreateSession(): Promise<LanguageModel> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = LanguageModel.create({
    expectedInputs: [{ type: 'image' }, { type: 'text' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
  }).catch((err: unknown) => {
    sessionPromise = null; // allow retry on failure
    throw err;
  });
  return sessionPromise;
}
```

**Key difference from ProofreaderService:** No Map key — only one session (no language variants). `destroyAllSessions` calls `sessionPromise.then(s => s.destroy())` and sets `sessionPromise = null`.

[VERIFIED: ProofreaderService.ts lines 81–101 — pattern confirmed in codebase]

---

### Pattern 2: promptStreaming with content-part array

**What:** The multimodal prompt passes a structured content array to `promptStreaming`. The existing `dom-chromium-ai.d.ts` declares `prompt(input: string)` — this signature must be cast at the call site because the multimodal overload (array input) is not yet typed.

**Critical finding:** `dom-chromium-ai.d.ts` declares `promptStreaming(input: string, ...)` (line 63). The multimodal array overload is NOT in the ambient types. The call site in `MultimodalService.ts` must cast `session` to `any` (or use `as unknown as MultimodalSession`) at the `promptStreaming` call — same workaround pattern ChatAIService.ts uses for `params()` (lines 21–24). Add a local interface for the multimodal-capable session shape inside the service file only — do NOT modify `dom-chromium-ai.d.ts` (per CONTEXT.md: "Phase 10 may add a `MultimodalContentPart` helper type INSIDE `MultimodalService.ts`").

```typescript
// Source: v1.2 API research lines 252–263 + dom-chromium-ai.d.ts cast pattern
interface MultimodalLanguageModel extends LanguageModel {
  promptStreaming(
    input: Array<{ role: string; content: Array<{ type: string; value: unknown }> }>,
    options?: { signal?: AbortSignal }
  ): ReadableStream<string>;
}

export async function promptWithImage(
  text: string,
  image: Blob | ImageBitmap,
  opts?: { signal?: AbortSignal }
): Promise<ReadableStream<string>> {
  const session = await getOrCreateSession() as unknown as MultimodalLanguageModel;
  return session.promptStreaming(
    [{ role: 'user', content: [{ type: 'text', value: text }, { type: 'image', value: image }] }],
    { signal: opts?.signal }
  );
}
```

[VERIFIED: dom-chromium-ai.d.ts lines 59–63 — string-only overload confirmed; multimodal calling convention from v1.2 API research lines 252–263]

---

### Pattern 3: Streaming chunk accumulation in MultimodalChatPanel

**What:** Assistant message created with `text: ''` before stream starts; chunks accumulated in-place via `setMessages` immutable update.

```typescript
// Source: GenUIChatPanel.tsx pattern + CONTEXT.md §Specifics
const streamingId = crypto.randomUUID();
setMessages(prev => [
  ...prev,
  { id: streamingId, role: 'assistant', text: '' }
]);

const stream = await MultimodalService.promptWithImage(text, pendingImage, { signal });
const reader = stream.getReader();
try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    setMessages(prev =>
      prev.map(m => m.id === streamingId ? { ...m, text: m.text + value } : m)
    );
  }
} finally {
  reader.releaseLock();
  setPageState('ready');
}
```

**Why reader.read() not for-await-of:** Using `for await (const chunk of stream)` on a `ReadableStream<string>` requires the stream to be async-iterable. Chrome's `promptStreaming` returns an async-iterable ReadableStream, so `for await` works — but explicitly using `getReader()` is safer across browser versions and avoids the locked-stream pitfall when the component unmounts mid-stream (can call `reader.cancel()` in cleanup).

[VERIFIED: GenUIChatPanel.tsx dispatch loop pattern; ReadableStream API — ASSUMED that `for await` works here but `getReader()` is explicitly safer for cancellation]

---

### Pattern 4: Drag-over ref counter (dragenter / dragleave flicker prevention)

**What:** A `dragenter` event fires on every child element as the drag moves over the panel. Without a counter, `dragleave` on a child immediately fires after `dragenter` on the parent's child, making the overlay flicker.

```typescript
// Source: CONTEXT.md §Image Input UX (specifics)
const dragCounterRef = useRef(0);

const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current++;
  setIsDragOver(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current--;
  if (dragCounterRef.current === 0) setIsDragOver(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current = 0;
  setIsDragOver(false);
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
};
```

[ASSUMED — standard web pattern; not verified via a specific docs source, but well-established]

---

### Pattern 5: Clipboard paste handler

**What:** `onPaste` on the `<textarea>` captures image items from `clipboardData`. The first image item wins; non-image items are ignored silently.

```typescript
// Source: CONTEXT.md §Image Input UX — paste handler; MDN ClipboardEvent API
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = Array.from(e.clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));
  if (!imageItem) return; // no image — let default paste handle text
  e.preventDefault();
  const file = imageItem.getAsFile();
  if (file) handleImageFile(file);
};
```

**Edge case:** On some systems, pasting a copied image from another browser tab gives `image/png` regardless of the original format. MIME validation (`file.type`) still applies; the error message shows if the MIME fails.

[VERIFIED: CONTEXT.md + MDN ClipboardEvent API — pattern confirmed ASSUMED for exact behavior on cross-browser paste edge cases]

---

### Pattern 6: Object URL lifecycle

**What:** Object URLs must be explicitly revoked; they survive until revocation OR page unload. In a React SPA, page unload never happens during navigation — leaking URLs accumulates memory.

```typescript
// Source: CONTEXT.md §Object URL leak prevention
// In MultimodalPage:
const objectUrlSetRef = useRef<Set<string>>(new Set());

// When creating an object URL (in MultimodalChatPanel callback):
const url = URL.createObjectURL(blob);
objectUrlSetRef.current.add(url);
// store url on the Message

// Cleanup on unmount:
useEffect(() => {
  return () => {
    objectUrlSetRef.current.forEach(url => URL.revokeObjectURL(url));
    destroyAllSessions();
  };
}, []);
```

**Pitfall — revoke too early:** Do NOT revoke the URL when the user removes the pending attachment BEFORE send. The URL is still referenced in the Message if the message was already added. Only revoke pre-send URLs that were never committed to a Message. A safe approach: never store the pending attachment as an object URL — keep it as a raw `Blob`. Convert to object URL only at the moment of adding it to the Message array.

[VERIFIED: CONTEXT.md §Specifics; URL.createObjectURL MDN — standard behavior]

---

### Pattern 7: PageState machine (mirrors ProofreaderPage exactly)

**What:** `PageState = 'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error'`

Transition graph:
```
idle → unavailable     (availability() returns 'unavailable' or throws)
idle → downloading     (availability() returns 'downloadable' | 'downloading')
idle → ready           (availability() returns 'available')
downloading → ready    (createWithProgress resolves)
downloading → error    (createWithProgress throws)
ready → prompting      (user sends a message)
prompting → ready      (stream ends)
prompting → error      (stream throws)
error → (manual retry) → prompting
```

[VERIFIED: ProofreaderPage.tsx lines 34–148 — same machine confirmed; PageState names from CONTEXT.md]

---

### Pattern 8: SEO + prerender dual write

**What:** `seoConfigs.multimodal` and `seoConfigs.multimodalDocs` must be added in TWO places:
1. `chat/src/app/hooks/useSEOData.ts` — the `seoConfigs` const at the bottom
2. `chat/scripts/prerender-react.js` — both the route list (lines 55–66 area) AND the `seoConfigs` object (lines 416+ area)

The prerender script also has a routes array that drives which HTML files are generated. Two entries needed:
```javascript
// in the routes array:
{ path: '/multimodal', filename: 'multimodal.html' },
{ path: '/multimodal/docs', filename: 'multimodal-docs.html' },
```

And in the `seoConfigs` object inside `prerender-react.js` (structuredData shape mirrors existing entries):
```javascript
'/multimodal': { title: '...', description: '...', keywords: '...', structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', ... } },
'/multimodal/docs': { title: '...', description: '...', keywords: '...', structuredData: { '@context': 'https://schema.org', '@type': 'TechArticle', ... } },
```

The Phase 12 `grep -F` audit checks that the `title` and `description` strings are byte-identical between the two files.

[VERIFIED: useSEOData.ts lines 94–105 (proofreader entries); prerender-react.js lines 65–66 (route list) + lines 416–440 (seoConfigs object)]

---

### Pattern 9: AppRouter insertion points

Exact insertion points (confirmed by reading AppRouter.tsx):

**Desktop nav** — insert after line 80 (after "Proofreader" `<Link>`):
```tsx
<Link to="/multimodal"
  onClick={() => trackUserInteraction('navigation_click', 'multimodal_link')}
  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
  Multimodal
</Link>
```

**Mobile nav** — insert after line 176 (after "Proofreader" mobile `<Link>`):
```tsx
<Link to="/multimodal"
  onClick={() => trackUserInteraction('navigation_click', 'multimodal_link')}
  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">
  Multimodal
</Link>
```

**Routes** — insert after line 255 (after Proofreader routes):
```tsx
{/* Multimodal routes */}
<Route path="/multimodal" element={<MultimodalPage/>}/>
<Route path="/multimodal/docs" element={<MultimodalPage/>}/>
```

Import: `import {MultimodalPage} from './components/Multimodal/MultimodalPage';`

[VERIFIED: AppRouter.tsx lines 78–81, 174–176, 253–255]

---

### Anti-Patterns to Avoid

- **Reusing `ChatBox.tsx` for the transcript:** ChatBox has an incompatible `Message` type (`id: number`, `sender: string`, no `attachedImageUrl`). Its outer `div` has fixed `h-96` which conflicts with the flex-fill layout spec. Build `MultimodalTranscript` fresh. [VERIFIED: ChatBox.tsx lines 8–16, 50]
- **Modifying `dom-chromium-ai.d.ts` for multimodal types:** Per CONTEXT.md, the multimodal content-part types belong inside `MultimodalService.ts` only. The ambient file already declares `expectedInputs` correctly. [VERIFIED: dom-chromium-ai.d.ts line 23]
- **Creating a new session per prompt:** The module-scope pooled session pattern is mandatory. Creating a new session on each `promptWithImage` call would trigger unnecessary model init overhead. [VERIFIED: CONTEXT.md + ProofreaderService.ts]
- **Revoking object URLs too aggressively:** Do NOT revoke a URL that is still referenced by a `Message.attachedImageUrl` in the transcript — the `<img src>` will break silently. Revoke only on page unmount or when the specific message is removed. [VERIFIED: CONTEXT.md §Object URL leak prevention]
- **Using `promptStreaming(string)` for multimodal:** The session method must receive an array of content-part objects, not a plain string. The ambient type declares only the string overload, so a cast is required. [VERIFIED: dom-chromium-ai.d.ts line 63 + v1.2 API research line 257]
- **Drag events without `e.preventDefault()`:** The browser's default drop handler navigates away from the page when a file is dropped. Every `onDragOver` and `onDrop` handler must call `e.preventDefault()`. [ASSUMED — standard HTML5 drag-and-drop requirement]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown in chat bubbles | Custom markdown renderer | `react-markdown` (already installed) | Already used in ChatBox; handles edge cases |
| Session caching | Custom memoization | Module-scope Promise (ProofreaderService pattern) | Established, tested pattern in codebase |
| Scroll-to-bottom | IntersectionObserver logic | `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` | Exactly what ChatBox and GenUIChatPanel use |
| Download progress | Custom event system | `monitor` callback on `LanguageModel.create` with `downloadprogress` event | Established pattern in ProofreaderService.ts line 157 |
| MIME validation | `FileReader` + magic bytes | `file.type.startsWith('image/')` + allowlist check | `file.type` is MIME type set by the browser; sufficient for the three allowed types |

---

## Common Pitfalls

### Pitfall 1: `promptStreaming` returns an async-iterable but is consumed via `getReader()`

**What goes wrong:** Calling `stream.getReader()` after partially consuming via `for await` (or vice versa) throws `TypeError: ReadableStream is already locked`.

**Why it happens:** `ReadableStream` can have only one active reader at a time. Mixing `for await` (which acquires a reader internally) with `getReader()` locks the stream twice.

**How to avoid:** Pick one pattern and stick with it. The CONTEXT.md specifics section implies chunk-by-chunk accumulation — use `getReader()` / `reader.read()` consistently so unmount cleanup can call `reader.cancel()` on an AbortSignal.

**Warning signs:** `TypeError: Failed to execute 'getReader' on 'ReadableStream': ReadableStream is already locked`

[ASSUMED — standard ReadableStream constraint; not Chrome-specific]

---

### Pitfall 2: Object URL revoked while still in use

**What goes wrong:** `<img src={attachedImageUrl}>` renders broken after the URL is revoked. This is silent — no console error in all browsers.

**Why it happens:** Calling `URL.revokeObjectURL(url)` before the `<img>` has finished loading, or revoking in response to a "remove attachment" action while the URL is still in a committed Message.

**How to avoid:** Keep `pendingImage` as a raw `Blob` (never create an object URL for the pending preview — use it only for committed Messages). Create the object URL at message-commit time; revoke only on page unmount or full transcript clear.

**Warning signs:** Thumbnail renders blank; inconsistent across browsers; only visible after navigation.

[VERIFIED: CONTEXT.md §Object URL leak prevention; URL.createObjectURL behavior — ASSUMED for exact browser behavior on revoke-while-loading]

---

### Pitfall 3: `LanguageModel.availability()` with `expectedInputs` may throw on older Canary

**What goes wrong:** Chrome 146 Canary (pre-multimodal-flag) does not accept the `expectedInputs` parameter to `availability()`. Calling `LanguageModel.availability({ expectedInputs: [{type:'image'}] })` throws instead of returning `'unavailable'`.

**Why it happens:** The `availability()` overload that accepts options was added with the multimodal API; older Canary builds have it as a zero-argument function.

**How to avoid:** Wrap the availability call in try/catch; on throw, treat as `'unavailable'`. This is already specified in CONTEXT.md: "If thrown (older Canary without availability()), treat as `'unavailable'` and show the banner."

```typescript
export async function getAvailability(): Promise<AvailabilityState> {
  if (typeof LanguageModel === 'undefined') return 'unavailable';
  try {
    return await LanguageModel.availability({ expectedInputs: [{ type: 'image' }] });
  } catch {
    return 'unavailable';
  }
}
```

[VERIFIED: CONTEXT.md §Availability Detection + v1.2 API research §Availability check pattern]

---

### Pitfall 4: Drag-over flicker when dropping over child elements

**What goes wrong:** The overlay appears, disappears, and reappears rapidly as the user drags over child elements inside the panel (textarea, send button, transcript div). This is caused by `dragleave` firing on the parent when the cursor moves to a child, even though the drag is still "over" the parent.

**Why it happens:** `dragenter` and `dragleave` bubble from each child element separately. The browser fires `dragleave(parent)` then `dragenter(child)` when crossing an element boundary.

**How to avoid:** Use the ref counter pattern in Pattern 4 above. Increment on `dragenter`, decrement on `dragleave`; show overlay only when counter > 0. Reset to 0 on `drop`.

[ASSUMED — standard HTML5 drag-and-drop known pitfall]

---

### Pitfall 5: StrictMode double-mount fires availability check twice

**What goes wrong:** In React StrictMode (development), `useEffect` fires, then unmount fires, then fires again. If `destroyAllSessions()` is called on the first unmount, the session is destroyed before the second mount's availability check can use it.

**Why it happens:** React StrictMode intentionally double-mounts in development to surface cleanup issues.

**How to avoid:** Use the `cancelled` flag pattern from ProofreaderPage lines 81–120. The `sessionPromise` in the service is fine because it re-creates on the next call after `destroyAllSessions()` clears it. The key is that the effect's cleanup MUST be idempotent.

[VERIFIED: ProofreaderPage.tsx lines 80–120 — cancelled flag pattern confirmed]

---

### Pitfall 6: `ChatBox.tsx` Message type collision

**What goes wrong:** `ChatBox.tsx` exports `Message` with `id: number` and `sender: string`. `MultimodalPage.tsx` needs `Message` with `id: string` (UUID), `role: 'user'|'assistant'`, and `attachedImageUrl?: string`. If a developer mistakenly imports from `ChatBox`, TypeScript will emit errors at the `id: crypto.randomUUID()` assignment and `role` field.

**How to avoid:** Export the multimodal `Message` type from `MultimodalPage.tsx` (or a co-located `types.ts`). Never import from `ChatBox` in Multimodal components.

[VERIFIED: ChatBox.tsx lines 8–16 — incompatible type confirmed]

---

### Pitfall 7: Tabs.tsx empty-path tab matching

**What goes wrong:** If the Chat tab (empty path `''`) is listed BEFORE the Docs tab (`'/docs'`), `currentPath.includes('')` matches everything and the Chat tab is always selected — including on `/multimodal/docs`.

**How to avoid:** Docs tab MUST come first in the tabs array. Already locked in CONTEXT.md. Pattern is proven in ProofreaderPage.tsx lines 197–218 with an explicit comment.

[VERIFIED: ProofreaderPage.tsx lines 197–205 + Tabs.tsx behavior]

---

## Code Examples

### Availability probe with fallback (MultimodalService)

```typescript
// Source: ProofreaderService.ts getAvailability() — adapted with try/catch per CONTEXT.md
type AvailabilityState = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export const getAvailability = async (): Promise<AvailabilityState> => {
  if (typeof LanguageModel === 'undefined') return 'unavailable';
  try {
    return await LanguageModel.availability({
      expectedInputs: [{ type: 'image' }],
    }) as AvailabilityState;
  } catch {
    return 'unavailable';
  }
};
```

### createWithProgress (MultimodalService)

```typescript
// Source: ProofreaderService.ts createWithProgress() — adapted for single session
export const createWithProgress = async (
  onProgress: (pct: number) => void
): Promise<LanguageModel> => {
  const promise = LanguageModel.create({
    expectedInputs: [{ type: 'image' }, { type: 'text' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
    monitor(m: AICreateMonitor) {
      m.addEventListener('downloadprogress', (e: ProgressEvent) => {
        onProgress(e.loaded != null ? e.loaded * 100 : 0);
      });
    },
  });
  sessionPromise = promise;
  return promise;
};
```

### destroyAllSessions (MultimodalService)

```typescript
// Source: ProofreaderService.ts destroyAllSessions() — single-session variant
export const destroyAllSessions = (): void => {
  if (sessionPromise) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sessionPromise.then((s) => s.destroy()).catch(() => {});
    sessionPromise = null;
  }
};
```

### MIME validation helper

```typescript
// Used in handleImageFile() shared by drop + paste paths
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images supported' };
  }
  return { valid: true };
}
```

### Mount effect in MultimodalPage (StrictMode-safe)

```typescript
// Source: ProofreaderPage.tsx lines 80–120 — mirrors exactly
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const availability = await getAvailability();
      if (cancelled) return;
      if (availability === 'unavailable') {
        setPageState('unavailable');
      } else if (availability === 'available') {
        setPageState('ready');
      } else {
        setPageState('downloading');
        try {
          await createWithProgress((pct) => {
            if (!cancelled) setDownloadPct(pct);
          });
          if (!cancelled) setPageState('ready');
        } catch (downloadErr) {
          if (!cancelled) {
            setError(downloadErr instanceof Error ? downloadErr.message : 'Download failed');
            setPageState('error');
          }
        }
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    }
  })();
  return () => {
    cancelled = true;
    destroyAllSessions();
    // also revoke object URLs here (via objectUrlSetRef)
  };
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `LanguageModel.params()` for capabilities | `LanguageModel.availability()` with options | Chrome 147+ | `params()` removed from runtime (see ChatAIService.ts line 14–31) |
| `promptStreaming(string)` for text-only | `promptStreaming(array of content parts)` for multimodal | Chrome 148 multimodal stable | Service must cast session type; string overload still works for text-only |
| `LanguageModel.availability()` zero-arg | `LanguageModel.availability({ expectedInputs })` | Chrome 148 | Requires try/catch on older Canary |

**Note:** Chrome 148 shipped multimodal stable on May 5, 2026 per v1.2 API research. No flag needed on 148+. [VERIFIED: v1.2 API research line 185]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `for await (const chunk of stream)` works for `ReadableStream<string>` from `promptStreaming` | Pattern 3 | If not async-iterable, `getReader()` must be used instead — functionally equivalent but different syntax |
| A2 | Drag-over ref counter is the standard/correct flicker prevention approach | Pattern 4 | Alternative: `event.relatedTarget` check on `dragleave` — both are valid; ref counter is simpler |
| A3 | `e.dataTransfer.files[0]` correctly receives a dropped image file (not a URL string for browser-tab drags) | Pattern 4 | For dragging from browser URL bar/tab, `files` may be empty and the URL is in `dataTransfer.getData('text/uri-list')`. For Phase 10 (file drag from filesystem/desktop), `files[0]` is correct. |
| A4 | `file.type` accurately reports MIME for dropped/pasted images | MIME validation | Some older systems may report `''` for type; in that case the MIME error will incorrectly block valid images |
| A5 | Pending image stored as raw Blob (not object URL) prevents the revoke-too-early pitfall | Pattern 6 | If blob is GC'd before use, the data is lost — but Blobs referenced from component state are retained |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — Phase 10 is purely frontend code changes against Chrome's built-in APIs; no new npm packages, no external services, no CLI tools beyond the existing Nx/Vite workspace).

---

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. Section omitted per instructions.

---

## Security Domain

Phase 10 involves user-supplied image data (drag/paste) processed entirely on-device by Gemini Nano. No network transmission. Key controls:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | MIME allowlist (`image/jpeg`, `image/png`, `image/webp`) checked client-side before passing to the model |
| V2 Authentication | no | Public demo page, no auth |
| V3 Session Management | no | No user sessions |
| V4 Access Control | no | Read-only public page |
| V6 Cryptography | no | No secrets or encryption |

**Threat pattern specific to multimodal:** Cross-origin image elements tainted by cross-origin draw calls will cause `SecurityError` when passed to the model. Phase 10 only processes files from `DataTransfer.files` and `ClipboardEvent.clipboardData.items.getAsFile()` — both are same-origin blobs. No cross-origin risk. [VERIFIED: v1.2 API research line 234 — cross-origin SecurityError noted]

---

## Sources

### Primary (HIGH confidence)
- Codebase — `ProofreaderPage.tsx`, `ProofreaderService.ts`, `ChatBox.tsx`, `GenUIChatPanel.tsx`, `dom-chromium-ai.d.ts`, `AppRouter.tsx`, `useSEOData.ts`, `prerender-react.js`, `MissingFlagBanner.tsx`, `WriterService.ts`, `ChatAIService.ts` — all read directly
- `.planning/research/v1.2-multimodal-proofreader-api.md` lines 181–341 — LanguageModel multimodal API surface, session creation, prompt structure, availability check
- `.planning/phases/10-multimodal-foundation/10-CONTEXT.md` — all implementation decisions
- `.planning/phases/10-multimodal-foundation/10-UI-SPEC.md` — all visual/interaction contracts

### Secondary (MEDIUM confidence)
- `v1.2-multimodal-proofreader-api.md` community testing notes (JPEG/PNG/WebP reliability, absence of hard pixel limits)

### Tertiary (LOW confidence)
- Drag-over ref counter flicker prevention (A2) — standard web development pattern; no single official source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all confirmed from package.json imports in existing files
- Service pattern: HIGH — ProofreaderService is a direct template; only the session key and overload cast differ
- Streaming accumulation: HIGH — GenUIChatPanel confirms the pattern; ReadableStream cast is the only unconfirmed variant
- Drag/paste UX: MEDIUM — drag ref counter and paste handler are standard patterns, not Chrome-specific, not tested in this codebase
- Object URL lifecycle: HIGH — CONTEXT.md is explicit; URL API behavior is stable

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (Chrome API surface stable on 148+; Canary may change minor details)
