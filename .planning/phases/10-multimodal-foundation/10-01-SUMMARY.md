---
phase: 10-multimodal-foundation
plan: "01"
subsystem: multimodal-demo
tags: [routing, service, page-shell, seo, nav]
dependency_graph:
  requires: []
  provides: [MultimodalService, MultimodalPage, MultimodalHeader, /multimodal route, seoConfigs.multimodal]
  affects: [AppRouter, useSEOData, prerender-react.js]
tech_stack:
  added: []
  patterns: [module-scope-session-pool, StrictMode-safe-effect, Tabs-docs-first-ordering, seo-dual-write]
key_files:
  created:
    - chat/src/app/services/MultimodalService.ts
    - chat/src/app/components/Multimodal/MultimodalHeader.tsx
    - chat/src/app/components/Multimodal/MultimodalPage.tsx
  modified:
    - chat/src/app/AppRouter.tsx
    - chat/src/app/hooks/useSEOData.ts
    - chat/scripts/prerender-react.js
decisions:
  - MultimodalLanguageModel interface does not extend LanguageModel (avoids TS2430 incompatible overload); standalone interface with promptStreaming array overload + destroy(), cast via as unknown as
  - void suppressors for Plan-02-owned state (downloadPct, messages, setMessages) to clear no-unused-vars lint warnings
metrics:
  duration_minutes: 25
  completed_date: "2026-05-20"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 10 Plan 01: Multimodal Foundation Shell Summary

**One-liner:** Multimodal page shell with LanguageModel pooled session + promptWithImage streaming wrapper, MissingFlagBanner availability gating, Docs-first Tabs ordering, dual-write SEO entries, and nav routing after Proofreader.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MultimodalService.ts (service + types + session pool) | daba486 | chat/src/app/services/MultimodalService.ts |
| 2 | MultimodalHeader.tsx + MultimodalPage.tsx shell | cdfd97e | chat/src/app/components/Multimodal/MultimodalHeader.tsx, chat/src/app/components/Multimodal/MultimodalPage.tsx |
| 3 | Routing + Nav links + SEO dual-write | f3b279e | chat/src/app/AppRouter.tsx, chat/src/app/hooks/useSEOData.ts, chat/scripts/prerender-react.js |

---

## File Details

### New Files (4 created)

**chat/src/app/services/MultimodalService.ts** (110 lines)
- Exports: `AvailabilityState` (type), `MultimodalContentPart` (interface), `promptWithImage`, `getAvailability`, `createWithProgress`, `destroyAllSessions`
- Module-scope `let sessionPromise: Promise<LanguageModel> | null = null`
- `getOrCreateSession()` stores promise before awaiting (concurrent callers share in-flight create)
- Local `MultimodalLanguageModel` interface (NOT extending LanguageModel — avoids TS2430) with array-input `promptStreaming` overload; cast via `as unknown as MultimodalLanguageModel`
- `getAvailability` wraps `LanguageModel.availability({ expectedInputs: [{ type: 'image' }] })` in try/catch (Pitfall 3: older Canary throws on options argument)
- Zero `: any` annotations

**chat/src/app/components/Multimodal/MultimodalHeader.tsx** (35 lines)
- Static header: camera SVG icon (outline, body + lens paths), gradient badge `from-primary-500 to-purple-600`, h1 "Multimodal", tagline
- Mirrors ProofreaderHeader.tsx structure exactly

**chat/src/app/components/Multimodal/MultimodalPage.tsx** (150 lines)
- Exports: `PageState` type, `Message` type, `MultimodalPage` component
- `PageState = 'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error'`
- `Message = { id: string; role: 'user'|'assistant'; text: string; attachedImageUrl?: string; error?: string }`
- StrictMode-safe mount effect with `cancelled` flag; cleanup calls `destroyAllSessions()` + `objectUrlSetRef.current.forEach(url => URL.revokeObjectURL(url))`
- Tabs ordering: Docs (path `/docs`) FIRST, Chat (path `''`) SECOND — load-bearing per Tabs.tsx includes-match behavior
- `MissingFlagBanner` conditional on `pageState === 'unavailable'` with both `chrome://flags` URLs
- `location.pathname.startsWith('/multimodal/docs')` (NOT includes — Pitfall 6)
- `messages` state + `objectUrlSetRef` declared ready for Plan 02 hand-off

### Modified Files (3 wired)

**chat/src/app/AppRouter.tsx**
- Import: `import {MultimodalPage} from './components/Multimodal/MultimodalPage'`
- Desktop nav: `<Link to="/multimodal">` after Proofreader link (line 82 > 79)
- Mobile nav: `<Link to="/multimodal">` after Proofreader link (line 181 > 178)
- Routes: `<Route path="/multimodal" .../>` + `<Route path="/multimodal/docs" .../>`
- Both nav links use `trackUserInteraction('navigation_click', 'multimodal_link')`

**chat/src/app/hooks/useSEOData.ts**
- `seoConfigs.multimodal` + `seoConfigs.multimodalDocs` added after `proofreaderDocs`
- Comment: "Must match prerender-react.js seoConfigs['/multimodal'] verbatim — Phase 12 grep -F audits."

**chat/scripts/prerender-react.js**
- Routes array: `{ path: '/multimodal', filename: 'multimodal.html' }` + `{ path: '/multimodal/docs', filename: 'multimodal-docs.html' }`
- seoConfigs object: `/multimodal` + `/multimodal/docs` entries with `structuredData` blocks

---

## Acceptance Criteria Results

All criteria pass:

| Check | Command | Result |
|-------|---------|--------|
| Service exports ≥5 | `grep -E "^export (async function|function|const|type)" MultimodalService.ts` | 5 exports (AvailabilityState, MultimodalContentPart via interface, promptWithImage, getAvailability, createWithProgress, destroyAllSessions) |
| LanguageModel.create count | `grep -c "LanguageModel.create" MultimodalService.ts` | 2 |
| expectedInputs: image count | `grep -c "expectedInputs: \[{ type: 'image'"` | 3 |
| try { count | `grep -c "try {"` | 1 |
| No :any | `grep -c ": any"` | 0 |
| Typecheck | `npx nx run chat:typecheck` | 0 errors |
| Tabs ordering | docs line 97 < chat line 107 | PASS |
| startsWith check | `grep -c "startsWith('/multimodal/docs')"` | 1 |
| destroyAllSessions | `grep -c "destroyAllSessions()"` | 1 (in cleanup) |
| URL.revokeObjectURL | `grep -c "URL.revokeObjectURL"` | 1 (in cleanup) |
| objectUrlSetRef | `grep -c "objectUrlSetRef"` | 3 (declaration + cleanup + ref) |
| max-w-6xl mx-auto p-4 | `grep -c "max-w-6xl mx-auto p-4"` | 1 |
| MissingFlagBanner import | `grep -c "import.*MissingFlagBanner"` | 1 |
| useSEOData | `grep -c "useSEOData"` | 1 |
| Both chrome://flags URLs | `grep -c "chrome://flags/#..."` | 1 each |
| MultimodalPage nav after Proofreader (desktop) | lines 82 > 79 | PASS |
| MultimodalPage nav after Proofreader (mobile) | lines 181 > 178 | PASS |
| multimodal_link count | `grep -c "multimodal_link" AppRouter.tsx` | 2 |
| Route /multimodal + /multimodal/docs | `grep -cE 'Route path="/multimodal(/docs)?"'` | 2 |
| SEO byte-identical title | `grep -Fc "Multimodal — Ask Gemini..."` | 1 in each file |
| JS syntax | `node -c prerender-react.js` | OK |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MultimodalLanguageModel interface cannot extend LanguageModel**
- **Found during:** Task 1 typecheck
- **Issue:** `interface MultimodalLanguageModel extends LanguageModel` caused TS2430 (Interface incorrectly extends — the `promptStreaming(string)` overload in LanguageModel is incompatible with the array-input overload we need to add)
- **Fix:** Made `MultimodalLanguageModel` a standalone interface (not extending LanguageModel); includes only `promptStreaming` (array overload) and `destroy()`. Cast unchanged: `as unknown as MultimodalLanguageModel`. Equivalent runtime behavior, type-safe.
- **Files modified:** chat/src/app/services/MultimodalService.ts
- **Commit:** daba486 (fix included in the same task commit)

**2. [Rule 2 - Lint] Unused variable warnings for Plan-02-owned state**
- **Found during:** Task 3 lint check
- **Issue:** ESLint `no-unused-vars` warnings for `downloadPct`, `messages`, `setMessages` (these are declared in MultimodalPage for Plan 02 hand-off, not yet consumed)
- **Fix:** Added `void` suppressors (`void downloadPct; void messages; void setMessages;`) consistent with the existing `void error; void setMessages;` pattern already in the file
- **Files modified:** chat/src/app/components/Multimodal/MultimodalPage.tsx
- **Commit:** f3b279e (included in Task 3 commit)

### Pre-existing Issues (NOT introduced by this plan)

- `react-hooks/exhaustive-deps` lint rule not found — same error in ProofreaderPage.tsx (lines 119, 216). Pre-existing lint config gap. Not fixed here (out of scope per brownfield discipline).

---

## Smoke Test Results

Automated verification only (browser smoke test requires Chrome 148+):

- Typecheck: 0 errors across all 6 files
- JS syntax: `node -c prerender-react.js` passes
- SEO byte-identity: Both title strings appear exactly once in each file
- Routing: 2 Route entries for /multimodal and /multimodal/docs
- Nav ordering: Multimodal links at lines 82, 181 (after Proofreader at lines 79, 178)
- Service: 5 exports, 0 `:any`, 2 `LanguageModel.create` calls, 3 `expectedInputs: [{ type: 'image'` occurrences
- Tabs: docs tab (line 97) before chat tab (line 107)

---

## Plan 02 Hand-off

The following are declared in `MultimodalPage.tsx` and ready for Plan 02 to wire to `MultimodalChatPanel`:

```tsx
const [messages, setMessages] = useState<Message[]>([]);   // transcript state
const objectUrlSetRef = useRef<Set<string>>(new Set());     // object URL tracking
```

Plan 02 is purely additive:
1. Create `MultimodalChatPanel.tsx`, `MultimodalTranscript.tsx`, `MultimodalInput.tsx` under `chat/src/app/components/Multimodal/`
2. Import `MultimodalChatPanel` in `MultimodalPage.tsx` and pass `messages`, `setMessages`, `objectUrlSetRef`, `pageState`
3. Wire `promptWithImage` + streaming chunk accumulation in `MultimodalChatPanel`
4. Add drag/paste handlers in `MultimodalInput`

No changes needed to `MultimodalService.ts`, `MultimodalHeader.tsx`, `AppRouter.tsx`, `useSEOData.ts`, or `prerender-react.js` in Plan 02.

---

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `"Documentation coming in Phase 12."` in Docs tab | MultimodalPage.tsx line 101 | Phase 12 will add markdown content for `/multimodal/docs` (DOC-02) |
| `"Chat panel coming in plan 10-02."` in Chat tab | MultimodalPage.tsx line 109 | Plan 02 replaces this with MultimodalChatPanel |

These stubs are intentional — the plan objective explicitly states Plan 01 ships the shell only. They will be resolved in Plan 02 and Phase 12 respectively.

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All processing is on-device via LanguageModel. Image input comes from DataTransfer/Clipboard APIs (same-origin blobs only). No threat surface additions beyond what was planned.

---

## Self-Check: PASSED

All created files exist on disk. All task commits exist in git log. Typecheck produces 0 errors.
