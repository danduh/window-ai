---
phase: 10-multimodal-foundation
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - chat/src/app/services/MultimodalService.ts
  - chat/src/app/components/Multimodal/MultimodalHeader.tsx
  - chat/src/app/components/Multimodal/MultimodalPage.tsx
  - chat/src/app/components/Multimodal/MultimodalChatPanel.tsx
  - chat/src/app/components/Multimodal/MultimodalInput.tsx
  - chat/src/app/components/Multimodal/MultimodalTranscript.tsx
  - chat/src/app/components/Multimodal/imageFileValidation.ts
  - chat/src/app/AppRouter.tsx
  - chat/src/app/hooks/useSEOData.ts
  - chat/scripts/prerender-react.js
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 10 delivers the Multimodal Foundation feature set across 10 files. The implementation
correctly applies the established ProofreaderPage/Service patterns and addresses most pitfalls
identified in RESEARCH.md. The critical findings are: (1) a side-effect inside `useMemo` that
creates object URLs — React 18+ StrictMode double-invokes memo factories in development, leaking
one URL per image attachment; (2) `createWithProgress` stores a promise into `sessionPromise`
without a `.catch()` reset, permanently caching a rejected promise after a download failure; and
(3) `handleRetry` has no pageState guard, allowing concurrent streaming sessions if clicked
while a send is in flight. The remaining warnings concern missing AbortError filtering and
missing pageState guards in the stream error path.

Pitfall checklist results:
- Pitfall 1 (stream consumption): PASS — `reader.read()` loop with `releaseLock()` in finally.
- Pitfall 2 (object URL lifecycle): PARTIAL — committed URLs tracked correctly; preview URL has a StrictMode double-create bug (CR-01).
- Pitfall 3 (availability try/catch): PASS — `getAvailability` wraps in try/catch.
- Pitfall 4 (drag counter): PASS — ref counter increments/decrements/resets correctly.
- Pitfall 5 (no ChatBox imports): PASS — fresh `Message` type, no cross-imports.
- Pitfall 6 (no `as any`): PASS — single allowed `as unknown as MultimodalLanguageModel` cast.
- No dom-chromium-ai.d.ts modifications: PASS.
- SEO byte-identical strings: PASS — both title and description match byte-for-byte.
- MULTI-07 (image above text in same bubble): PASS.
- Brownfield discipline: PASS.

---

## Critical Issues

### CR-01: Side Effect in `useMemo` Creates Leaked Object URL Under StrictMode

**File:** `chat/src/app/components/Multimodal/MultimodalInput.tsx:35-38`

**Issue:** `URL.createObjectURL(pendingImage)` is called inside a `useMemo` factory. React 18+
StrictMode (active in this project — `main.tsx` line 16) double-invokes `useMemo` factories in
development mode to surface side-effect bugs. The first invocation creates an object URL that is
immediately discarded; only the second invocation's URL is stored. The discarded URL is never
revoked (it is not in `previewUrl`, so the cleanup effect never sees it). This leaks one object
URL per image attachment event in development. Additionally, React's concurrent rendering can
call memo factories multiple times during renders that are discarded (e.g., during Suspense
transitions), causing the same leak in production.

The `useEffect` cleanup on line 43–47 correctly revokes `previewUrl` when it changes, but that
only protects the URL that survived the double-invocation — the abandoned first URL is silently
orphaned.

**Fix:** Move the `URL.createObjectURL` call out of `useMemo` and into a `useEffect` that also
handles revocation. This makes the side effect explicit and runs it only once per `pendingImage`
change:

```tsx
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

useEffect(() => {
  if (!pendingImage) {
    setPreviewUrl(null);
    return;
  }
  const url = URL.createObjectURL(pendingImage);
  setPreviewUrl(url);
  return () => {
    URL.revokeObjectURL(url);
  };
}, [pendingImage]);
```

---

### CR-02: `createWithProgress` Permanently Poisons `sessionPromise` on Download Failure

**File:** `chat/src/app/services/MultimodalService.ts:85-97`

**Issue:** `createWithProgress` assigns the raw `LanguageModel.create(...)` promise to
`sessionPromise` (line 95) with no `.catch()` reset. If the download fails, `sessionPromise`
holds a permanently rejected promise. Every subsequent call to `getOrCreateSession()` — which
checks `if (sessionPromise) return sessionPromise` — returns the same rejected promise
immediately, making all future `promptWithImage` calls fail permanently until the page reloads.

`getOrCreateSession` has a `.catch()` that clears `sessionPromise` on its OWN create failure
(lines 25–29), but that guard is bypassed when `createWithProgress` directly assigns to
`sessionPromise`. The two code paths are inconsistent.

In practice, `MultimodalPage` sets `pageState` to `'error'` when `createWithProgress` throws,
so the user cannot send (send button is disabled). But if the user navigates away and back to
`/multimodal`, the page remounts and `destroyAllSessions()` (called in the cleanup effect) sets
`sessionPromise = null`, which resets state correctly. The window in which this is harmful is
narrow but real: any code path that calls `promptWithImage` (including a retry from a different
component) between a failed `createWithProgress` and the next unmount will receive a permanently
rejected session rather than a fresh retry.

**Fix:** Add a `.catch()` to the promise in `createWithProgress` to clear the poisoned promise,
mirroring the pattern in `getOrCreateSession`:

```typescript
export const createWithProgress = async (
  onProgress: (pct: number) => void
): Promise<LanguageModel> => {
  const promise = LanguageModel.create({
    // ... options unchanged ...
  }).catch((err: unknown) => {
    sessionPromise = null; // allow retry on failure — same as getOrCreateSession
    throw err;
  });
  sessionPromise = promise;
  return promise;
};
```

---

### CR-03: `handleRetry` Has No `pageState` Guard — Allows Concurrent Streaming Sessions

**File:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx:114-143`

**Issue:** `handleRetry` calls `runPrompt` without checking whether `pageState === 'ready'`.
If a streaming response is already in-flight (`pageState === 'prompting'`) and the user clicks
"Retry" on a previous error bubble (possible because the retry button is always rendered when
`msg.error` is set), two concurrent `runPrompt` calls will run simultaneously:

1. Both call `setPageState('prompting')` — no damage.
2. Both create a new `AbortController` and assign it to `abortControllerRef.current`, so the
   first stream loses its abort handle.
3. Both streams write to different `streamingId` values in the message array — the state
   updates interleave unpredictably, producing garbled output in both assistant bubbles.
4. `setPageState('ready')` can fire from either stream on completion, masking the other still
   running.

The transcript can theoretically have both a "Thinking…" placeholder (empty text, no error) and
an active stream simultaneously — an unrecoverable UI state.

**Fix:** Add the same pageState guard used in `handleSend`:

```typescript
const handleRetry = useCallback(
  async (assistantMessageId: string) => {
    if (pageState !== 'ready') return; // guard concurrent sends
    // ... rest of implementation unchanged ...
  },
  [messages, setMessages, runPrompt, pageState], // add pageState to deps
);
```

---

## Warnings

### WR-01: `runPrompt` Catch Block Does Not Filter `AbortError` — Spurious Error Bubbles on Unmount

**File:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx:62-71`

**Issue:** When the component unmounts with a stream in flight (e.g., user navigates away),
`MultimodalPage`'s cleanup calls `destroyAllSessions()` which destroys the model session. The
in-flight `reader.read()` throws. The catch block (line 62) treats ALL errors identically:
it sets an error message on the assistant bubble and calls `setPageState('ready')`. These state
updates fire after unmount, generating React `setState` warnings in development (and, in edge
cases, writing to stale React fiber state).

Additionally, `abortControllerRef.current` is never `.abort()`-ed in any cleanup function.
The `AbortSignal` passed to `promptWithImage` is therefore never triggered by navigation, so
the Chrome API may continue processing for a brief window after the component unmounts.

**Fix:** Filter `AbortError` in the catch block, and abort the controller in a cleanup effect:

```typescript
// In runPrompt catch block:
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    // Cancelled — do not show error bubble
    setPageState('ready');
    return;
  }
  // ... existing error handling unchanged ...
}

// Add to MultimodalChatPanel (or pass abortControllerRef up to MultimodalPage cleanup):
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

---

### WR-02: `handleRetry` Reads Stale `messages` Closure — Race Condition With Streaming Updates

**File:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx:117-119`

**Issue:** `handleRetry` is a `useCallback` that closes over `messages` (listed in its deps
array at line 143). It reads `messages[idx - 1]` to find the user message preceding the failed
assistant message. If `messages` changes between the render that showed the Retry button and the
moment the user clicks it (e.g., due to a concurrent streaming update from the previous response
still accumulating), `idx` could point to the wrong element. More concretely:

```
messages = [userA, assistantA_error, userB, assistantB_streaming]
```

If `assistantB` is streaming and inserts chunks, `handleRetry(assistantA_error.id)` may find
`idx` correctly (2 → `userB` at idx 1? No — `findIndex` finds `assistantA_error` at index 1,
so `messages[0]` = `userA`). In this case it works, but the closure can be stale if `messages`
was captured before the last `setMessages` batch landed.

The more reliable approach is to use the functional form of `setMessages` to access the latest
state, avoiding the stale-closure concern:

**Fix:** Use a functional state update to retrieve current messages:

```typescript
const handleRetry = useCallback(
  async (assistantMessageId: string) => {
    if (pageState !== 'ready') return;
    let userMsg: Message | undefined;
    let blob: Blob | undefined;

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantMessageId);
      if (idx < 1 || prev[idx - 1].role !== 'user') return prev; // no-op
      userMsg = prev[idx - 1];
      blob = pendingResendBlobsRef.current.get(userMsg.id);
      return prev; // state unchanged — we only read here
    });

    if (!userMsg || !blob) { /* ... */ }
    // ... rest unchanged ...
  },
  [setMessages, runPrompt, pageState],
);
```

---

### WR-03: Mobile Nav Tracking Event Missing `_mobile` Suffix — Breaks GA Segmentation

**File:** `chat/src/app/AppRouter.tsx:182`

**Issue:** Every other mobile nav link uses a `_mobile`-suffixed tracking event name (e.g.,
`'proofreader_link_mobile'`, `'writer_link_mobile'`), but the Multimodal mobile link uses the
desktop event name `'multimodal_link'` (same as line 83, the desktop link). This makes it
impossible to distinguish desktop vs. mobile navigation clicks to `/multimodal` in Google
Analytics.

Compare:
- Line 179: `'proofreader_link_mobile'` — correct
- Line 182: `'multimodal_link'` — **missing `_mobile` suffix**
- Line 185: `'writer_link_mobile'` — correct

**Fix:**
```tsx
// Line 182 — change:
onClick={() => trackUserInteraction('navigation_click', 'multimodal_link')}
// to:
onClick={() => trackUserInteraction('navigation_click', 'multimodal_link_mobile')}
```

---

### WR-04: `sendButtonTooltip` Has No Cases for `'idle'` or `'error'` States — Silent Disabled Button

**File:** `chat/src/app/components/Multimodal/MultimodalInput.tsx:70-79`

**Issue:** The `sendButtonTooltip` ternary chain covers `'unavailable'`, `'downloading'`, and
the ready-with-missing-inputs cases, but has no explicit branch for `pageState === 'idle'` or
`pageState === 'error'`. In both states, `canSend` is false (send is disabled), but `title`
resolves to `undefined` — no tooltip is shown to explain why the button is non-interactive.

During the `'idle'` window (before the availability check completes on mount), users who
immediately try to send see a disabled button with no explanation. During `'error'` state,
the same problem occurs.

**Fix:** Add cases for `'idle'` and `'error'`:

```tsx
const sendButtonTooltip =
  pageState === 'unavailable'
    ? 'Enable multimodal image input to use this demo'
  : pageState === 'downloading'
    ? 'Download model first'
  : pageState === 'idle'
    ? 'Checking availability…'
  : pageState === 'error'
    ? 'An error occurred — please reload the page'
  : pendingImage === null
    ? 'Attach an image first'
  : text.trim().length === 0
    ? 'Type a question about the image'
  : undefined;
```

---

## Info

### IN-01: `multimodalDocs` SEO `description` Is Identical to `multimodal` Description

**File:** `chat/src/app/hooks/useSEOData.ts:115` and `chat/scripts/prerender-react.js:455`

**Issue:** The `multimodalDocs` SEO description (line 115) is byte-identical to the `multimodal`
description. This was likely copied verbatim as a placeholder. While not a code bug, it means
the Multimodal Docs page (`/multimodal/docs`) has the same `<meta description>` as the Chat
page — which is technically correct per CONTEXT.md (both share the same locked description string),
but the description copy is not semantically appropriate for a documentation page. The CONTEXT.md
`multimodalDocs` locked description is undefined — the description was reused from the main page.
Flag this for Phase 12 when DOC-02 content lands.

**Fix:** No code change required for Phase 10. When Phase 12 delivers `/multimodal/docs` content,
update both `useSEOData.ts` and `prerender-react.js` with a docs-specific description.

---

### IN-02: `ALLOWED_MIME_TYPES` Exported But Has No Consumer Other Than `validateImageFile`

**File:** `chat/src/app/components/Multimodal/imageFileValidation.ts:6`

**Issue:** `ALLOWED_MIME_TYPES` is exported as `export const` but is not imported by any
component — only `validateImageFile` is imported. If the constant is intended to be private
to the module, it should not be exported. If it's exported for documentation or future use,
a comment explaining its purpose as public API would clarify intent.

**Fix:** Either remove the `export` keyword to keep it module-private, or add a JSDoc comment
explaining why it is part of the public API:

```typescript
// If internal:
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// If public API (leave export, add doc):
/** Public allowlist for use by Phase 11 webcam frame validation. */
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
```

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
