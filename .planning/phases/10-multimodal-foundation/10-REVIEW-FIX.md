---
phase: 10-multimodal-foundation
fixed_at: 2026-05-20T00:00:00Z
review_path: .planning/phases/10-multimodal-foundation/10-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-05-20
**Source review:** `.planning/phases/10-multimodal-foundation/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (3 Critical + 4 Warning; 2 Info findings deferred per fix_scope)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Side Effect in `useMemo` Creates Leaked Object URL Under StrictMode

**Files modified:** `chat/src/app/components/Multimodal/MultimodalInput.tsx`
**Commit:** cfba6b6
**Applied fix:** Replaced `useMemo` + separate `useEffect` cleanup pair with a single `useEffect` that calls `URL.createObjectURL(pendingImage)`, stores it via `useState`, and revokes it in the effect's own cleanup. Removed `useMemo` from imports, added `useState`. The effect runs once per `pendingImage` change; its cleanup always revokes the URL it created — eliminating the StrictMode double-invocation leak.

---

### CR-02: `createWithProgress` Permanently Poisons `sessionPromise` on Download Failure

**Files modified:** `chat/src/app/services/MultimodalService.ts`
**Commit:** 4fe1086
**Applied fix:** Chained `.catch((err: unknown) => { sessionPromise = null; throw err; })` directly onto the `LanguageModel.create(...)` call in `createWithProgress`, mirroring the identical guard already present in `getOrCreateSession`. The caught promise (with the reset handler) is what gets stored in `sessionPromise`, so a rejected download now clears the module-scope promise, allowing the next call to retry cleanly.

---

### CR-03: `handleRetry` Has No `pageState` Guard — Allows Concurrent Streaming Sessions

**Files modified:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx`
**Commit:** 6f21281
**Applied fix:** Added `if (pageState !== 'ready') return;` as the first statement in `handleRetry`, matching the identical guard in `handleSend`. Added `pageState` to the `useCallback` deps array. Also added `useEffect` to the React import (needed for the WR-01 fix that followed).

---

### WR-01: `runPrompt` Catch Block Does Not Filter `AbortError` — Spurious Error Bubbles on Unmount

**Files modified:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx`
**Commit:** d5cc453
**Applied fix:** Two changes applied together: (1) In the `runPrompt` catch block, added an `AbortError` guard (`if (err instanceof DOMException && err.name === 'AbortError') { setPageState('ready'); return; }`) before the generic error-bubble path. (2) Added a `useEffect(() => () => { abortControllerRef.current?.abort(); }, [])` cleanup effect so the Chrome API receives a cancel signal when the component unmounts, and the `AbortError` it generates is then silently swallowed by the new guard.

---

### WR-02: `handleRetry` Reads Stale `messages` Closure — Race Condition With Streaming Updates

**Files modified:** `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx`
**Commit:** b21caf4
**Applied fix:** Replaced the direct `messages.findIndex` / `messages[idx - 1]` reads (which closed over a potentially stale snapshot) with a no-op `setMessages(prev => ...)` functional update that extracts the latest `userMsg` by reference. `messages` was removed from the `useCallback` deps array (replaced by `setMessages` which is stable). The rest of the function (`blob` lookup, placeholder replacement, `runPrompt` call) proceeds using the freshly-read `userMsg`.

---

### WR-03: Mobile Nav Tracking Event Missing `_mobile` Suffix — Breaks GA Segmentation

**Files modified:** `chat/src/app/AppRouter.tsx`
**Commit:** 809f912
**Applied fix:** Changed `trackUserInteraction('navigation_click', 'multimodal_link')` to `trackUserInteraction('navigation_click', 'multimodal_link_mobile')` on line 182 (mobile nav section). Desktop link on line 83 is correct and unchanged.

---

### WR-04: `sendButtonTooltip` Has No Cases for `'idle'` or `'error'` States — Silent Disabled Button

**Files modified:** `chat/src/app/components/Multimodal/MultimodalInput.tsx`
**Commit:** c495e79
**Applied fix:** Extended the `sendButtonTooltip` ternary chain with two new branches inserted after the `downloading` case: `pageState === 'idle'` returns `'Checking availability…'`; `pageState === 'error'` returns `'An error occurred — please reload the page'`. The existing `pendingImage === null` and `text.trim().length === 0` branches follow unchanged.

---

## Skipped Issues

None — all 7 in-scope findings were successfully fixed.

---

_Fixed: 2026-05-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
