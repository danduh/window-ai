---
phase: 02-webmcp-tools-in-page-agent
plan: 03
subsystem: page-wiring
tags: [webmcp, page-wiring, mount-effect, abort-controller, recipe-store-subscription, manual-uat, tool-inspector, demo-flow, integration]

requires:
  - phase: 02-webmcp-tools-in-page-agent
    plan: 01
    provides: "RECIPE_TOOLS canonical 8-tool registry + wrapToolsWithEvents adapter + ToolCallEvent + recipeStore pub-sub (subscribeRecipeStore, setActiveRecipeId)"
  - phase: 02-webmcp-tools-in-page-agent
    plan: 02
    provides: "AgentDrawer (W1-revised inbound liveToolName prop) + ToolRegistrationPill (5-state status) — wired into RecipeWorkbenchPage at integration time"
provides:
  - "RecipeWorkbenchPage.tsx wired end-to-end: tool-registration mount-effect (AbortController), recipeStore subscription mount-effect, header ToolRegistrationPill cluster, AgentDrawer mounted in workbench tab content with W1 fix plumbing (liveToolName={liveToolName} merging drawer-side AND external-agent calls)"
  - "02-HUMAN-UAT.md: 5-UAT manual verification script covering registration, Tool Inspector, external invocation, the canonical 2-min demo, and unregistration on navigation"
affects: []

tech-stack:
  added: []
  patterns:
    - "Single AbortController per mount + controller.abort() cleanup deregisters every navigator.modelContext.registerTool atomically (W3C WebMCP spec — no separate unregisterTool method) — RESEARCH §Pattern 1 + §Pitfall 2"
    - "Empty-deps useEffect + module-static RECIPE_TOOLS prevents re-registration loops + InvalidStateError (RESEARCH §Pitfall 1)"
    - "Page-level merged liveToolName state: same wrapToolsWithEvents dispatcher feeds external-agent (Tool Inspector / future MCP client) AND drawer-side (in-page LanguageModel) calls; passed BACK into <AgentDrawer/> as inbound prop so the inner ToolListPanel highlight fires for both paths (W1 fix — AGENT-02 single source, two consumers)"
    - "recipeStore subscription mount-effect: tool mutations call notifyRecipeStore() after saveRecipe() → React listener re-fetches getRecipes() → live UI update + reload survival via IndexedDB (MCP-04)"
    - "Tabs-content composition in useMemo: <AgentDrawer/> mounted INSIDE the workbench tab's content array (NOT outside the <Tabs/> component) so the drawer is scoped to the workbench tab and the docs tab stays clean"
    - "Stable-callback contract: React useState setters (setLiveToolName) and useCallback-wrapped functions (handleSelect) satisfy AgentDrawer's I1 'Pass a stable callback' JSDoc — closures captured at session creation hold a fresh reference"

key-files:
  created:
    - .planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md
  modified:
    - chat/src/app/components/RecipeWorkbenchPage.tsx

key-decisions:
  - "Wired the Phase 2 page-level merged liveToolName state per the W1 fix: both the page-level wrapToolsWithEvents dispatcher (external-agent calls) AND AgentDrawer's onLiveToolNameChange (drawer-side calls) update setLiveToolName; the merged value is plumbed BACK into <AgentDrawer/> as the inbound liveToolName prop, so the drawer's inner ToolListPanel highlight fires for BOTH paths (AGENT-02 contract upheld at the drawer-internal ToolListPanel, not just at the registry layer)."
  - "Mounted <AgentDrawer/> INSIDE the workbench tab's content array (not at the page root). Rationale: docs tab and workbench tab are sibling tabs; the drawer is workbench-specific. Mounting inside the workbench content keeps the docs tab clean and ensures the drawer's lifecycle is tied to the workbench tab's mount/unmount cycle (consistent with React's tab-content unmount pattern in <Tabs/>)."
  - "Split the page-modification work into two atomic auto-tasks (W3 fix): Task 1 wired invisible plumbing (imports + state + mount-effects), Task 2 wired visible UX (handleSelect + AgentDrawer + ToolRegistrationPill). Each commit is independently reverting-safe — a partial rollback after Task 1 leaves a working page that registers tools but exposes no new UI; full rollback restores Phase 1 baseline."

requirements-completed:
  - MCP-02
  - MCP-04
  - MCP-05
  - AGENT-01
  - AGENT-02
  - AGENT-03

duration: 270s
completed: 2026-04-27
---

# Phase 02 Plan 03: Page Wiring + WebMCP Registration Summary

**Wired Phase 2's data layer (Plan 02-01: 8 tool handlers + RECIPE_TOOLS registry + recipeStore + toolAdapter) and UI components (Plan 02-02: ToolRegistrationPill + AgentDrawer + ToolListPanel + ToolCallIndicator + LanguageModelUnavailable) into the existing RecipeWorkbenchPage.tsx via two atomic edits, then authored the 5-UAT manual verification script. The canonical 2-min demo phrase "scale to 6 and swap milk for oat milk" is now end-to-end runnable: in-page agent fires scaleRecipe + swapIngredient against the seeded buttermilk-pancakes recipe, recipe view updates live, changes survive reload, and the same RECIPE_TOOLS are listed by the Tool Inspector extension.**

## Performance

- **Duration:** ~270s
- **Started:** 2026-04-27T10:30:50Z
- **Completed:** 2026-04-27T10:35:20Z
- **Tasks:** 3 of 3 (Tasks 1+2 auto-complete; Task 3 step 1 file-authored, step 2 awaits human UAT)
- **Files modified:** 1 modified, 1 created

## Accomplishments

- Wired all 5 Phase 2 imports into `RecipeWorkbenchPage.tsx`: `RECIPE_TOOLS` (Plan 02-01), `wrapToolsWithEvents` + `ToolCallEvent` (Plan 02-01), `subscribeRecipeStore` + `setActiveRecipeId` (Plan 02-01), `ToolRegistrationPill` + `ToolRegistrationStatus` (Plan 02-02), `AgentDrawer` (Plan 02-02). Added `useCallback` to the existing React import.
- Added module-scope `RegistrationState` interface + 2 component-scope useState hooks (`registration`, `liveToolName`) — the page now owns its merged tool-call state.
- **Tool registration mount-effect (MCP-02):** empty-deps `useEffect` + single `AbortController` instantiated INSIDE the effect (RESEARCH §Pitfall 2). Wraps `RECIPE_TOOLS` with `wrapToolsWithEvents(RECIPE_TOOLS, onToolEvent)` where `onToolEvent` updates `setLiveToolName` on `pending` (and clears on `done`/`error`). For-loop registers each wrapped tool via `navigator.modelContext.registerTool(tool, { signal: controller.signal })`; cleanup runs `controller.abort()` to deregister all 8 atomically (W3C WebMCP spec — no separate `unregisterTool` method). `'unavailable'` short-circuit when `navigator.modelContext` is absent. Catch-handler distinguishes `partial` (some succeeded) from `error` (none succeeded) via `registered.length > 0` check.
- **recipeStore subscription mount-effect (MCP-04):** subscribe + `getRecipes().then(setRecipes)` on every notification → mutations from `executeScaleRecipe` / `executeSwapIngredient` / `executeAddIngredient` / `executeRemoveIngredient` propagate live to the UI; `RecipePersistence.saveRecipe` ensures they survive reload.
- **Visible UX wired (Task 2):** `handleSelect` `useCallback` mirrors `setActiveId(id)` AND `setActiveRecipeId(id)` so tool handlers default to `getActiveRecipeId()` when no `recipeId` arg is passed; one extra `setActiveRecipeId(all[0]?.id ?? null)` line in the existing seed/load effect's success branch initial-mirrors without waiting for a click; `onSelect` prop swapped from `setActiveId` to `handleSelect` on `<RecipePicker/>` (via `WorkbenchPanel` props).
- **`<AgentDrawer/>` mounted in the workbench tab content** with the W1 fix wiring (the load-bearing edit of this plan):
  - `liveToolName={liveToolName}` — page-level merged state; AgentDrawer's `effectiveLiveToolName = incomingLiveToolName ?? localLiveToolName` prefers this inbound prop over its own local state, so the inner `<ToolListPanel/>` row highlight fires for BOTH external-agent (Tool Inspector / future MCP client) AND drawer-side (in-page LanguageModel) tool calls. AGENT-02 single-source-of-truth contract upheld at the drawer's inner ToolListPanel layer, not just at the RECIPE_TOOLS registry layer.
  - `onLiveToolNameChange={setLiveToolName}` — stable React `useState` setter satisfies AgentDrawer's I1 "Pass a stable callback" JSDoc contract.
- **`<ToolRegistrationPill/>` mounted in the page header** flex cluster (`flex items-center space-x-3`) BEFORE `<ThemeToggle/>` per UI-SPEC §Pill Placement — green pill on success, yellow on partial/error, returns null on unavailable.
- **`tabs` useMemo deps expanded** to `[recipes, activeId, loading, handleSelect, registration.status, registration.count, liveToolName]` so the workbench tab content re-renders when registration state OR `liveToolName` changes.
- **`02-HUMAN-UAT.md` authored** with the canonical 5-UAT verification script: UAT-01 (page-level registration), UAT-02 (Tool Inspector discoverability of all 8 tools), UAT-03 (tool invocation via Tool Inspector + W1 fix verification), UAT-04 (the 2-min demo with the locked phrase "scale to 6 and swap milk for oat milk"), UAT-05 (unregistration on navigation). Mentions both required Chrome flags (`#WebMCP for testing` AND `#enable-webmcp-testing`), the dev port 4300, IndexedDB reset procedure, fail-mode diagnostics for each UAT, and reporter hand-off capture criteria.
- TypeScript strict typecheck passes (`npx nx typecheck chat` exits 0); production build passes (`npx nx build chat` exits 0). Webpack reports `compiled successfully (d4b3d0271a5ac4f3)` on the final post-Task-2 build.
- **Brownfield-clean:** `git diff --stat HEAD chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx chat/src/app/components/RecipeWorkbench/RecipePicker.tsx chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx chat/src/app/components/RecipeWorkbench/IngredientsList.tsx chat/src/app/components/RecipeWorkbench/StepsList.tsx chat/src/app/components/ChatBox.tsx chat/src/app/components/ChatInput.tsx` returns NOTHING — Phase 1 components and `/chat`/`/tool-calling` reference pages all unmodified.

## Task Commits

1. **Task 1: invisible plumbing (imports + state + mount effects)** — `e83a0e7` (feat) — 5 imports + `useCallback` + `RegistrationState` interface + 2 useState hooks + tool-registration mount-effect (AbortController) + recipeStore subscription mount-effect.
2. **Task 2: visible UX (handleSelect + AgentDrawer + pill cluster)** — `3fea639` (feat) — `handleSelect` useCallback + `setActiveRecipeId(all[0]?.id ?? null)` line in seed/load effect + `onSelect` prop swap + `<AgentDrawer/>` mount with W1 fix plumbing + `<ToolRegistrationPill/>` in header cluster + useMemo deps expansion.
3. **Task 3 Step 1: 02-HUMAN-UAT.md** — `2aad418` (docs) — 5-UAT manual verification script.

(Task 3 Step 2 — human UAT execution — is the checkpoint awaiting verifier routing; not committed by the executor.)

## Files Created/Modified

- **Modified:** `chat/src/app/components/RecipeWorkbenchPage.tsx` — diff summary (Tasks 1+2 combined):
  - **5 new imports added** (lines 16–20): `RECIPE_TOOLS` from `'../services/recipeTools'`; `wrapToolsWithEvents, type ToolCallEvent` from `'../services/toolAdapter'`; `subscribeRecipeStore, setActiveRecipeId` from `'../services/recipeStore'`; `ToolRegistrationPill, type ToolRegistrationStatus` from `'./RecipeWorkbench/ToolRegistrationPill'`; `AgentDrawer` from `'./RecipeWorkbench/AgentDrawer'`.
  - **`useCallback` added** to the React import (line 1).
  - **`interface RegistrationState`** declared at module scope between `WorkbenchPanel` and `RecipeWorkbenchPage` (lines 56–59).
  - **2 new useState hooks** added inside the component (lines 66–67): `registration: RegistrationState` (default `{ status: 'idle', count: 0 }`) and `liveToolName: string | null` (default `null`).
  - **1 line added** to the existing seed/load effect's success branch (line 81): `setActiveRecipeId(all[0]?.id ?? null);` — initial mirror of `activeId` into the recipeStore.
  - **2 new useEffect blocks** added between the seed/load effect and the `tabs` useMemo (lines 95–151): tool-registration mount-effect (with AbortController + try/catch + partial-vs-error branch) and recipeStore subscription mount-effect.
  - **`handleSelect` useCallback** added between the second useEffect and `tabs` useMemo (lines 153–159): calls both `setActiveId(id)` AND `setActiveRecipeId(id)`.
  - **`tabs` useMemo workbench-tab content expanded** to a fragment (`<>...</>`) wrapping the existing `<WorkbenchPanel/>` (with `onSelect={handleSelect}` instead of `setActiveId`) and the new `<AgentDrawer registrationStatus={registration.status} registeredCount={registration.count} liveToolName={liveToolName} onLiveToolNameChange={setLiveToolName} />` (lines 183–198).
  - **`tabs` useMemo deps expanded** from `[recipes, activeId, loading]` to `[recipes, activeId, loading, handleSelect, registration.status, registration.count, liveToolName]` (line 201).
  - **Header `<ThemeToggle/>` wrapped** in a `<div className="flex items-center space-x-3">` cluster with `<ToolRegistrationPill status={registration.status} registeredCount={registration.count} totalCount={RECIPE_TOOLS.length} />` placed BEFORE `<ThemeToggle/>` (lines 219–226).
  - **Default export preserved** (line 237: `export default RecipeWorkbenchPage;`). Existing `WorkbenchPanel` inner component (lines 22–54) preserved untouched. Existing `MissingFlagBanner` placement (line 229: `{!navigator.modelContext && <MissingFlagBanner />}`) preserved untouched. Existing `<Tabs basePath="/webmcp" defaultTab="workbench" tabs={tabs} />` (line 231) preserved untouched.

- **Created:** `.planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md` — 5-UAT manual verification script (UAT-01 through UAT-05) with Chrome flag prerequisites, port 4300 dev-server instructions, IndexedDB reset procedure, fail-mode diagnostics for each UAT, acceptance gate, and reporter hand-off capture criteria.

## W1 Fix Verification

```
$ grep -E "<AgentDrawer[\s\S]*?liveToolName=\{liveToolName\}" chat/src/app/components/RecipeWorkbenchPage.tsx
<AgentDrawer
  registrationStatus={registration.status}
  registeredCount={registration.count}
  liveToolName={liveToolName}
  onLiveToolNameChange={setLiveToolName}
/>
```

The W1 fix's load-bearing edit is present: `liveToolName={liveToolName}` plumbs the page-level merged state (populated by BOTH the page's `wrapToolsWithEvents` dispatcher for external-agent calls AND AgentDrawer's `onLiveToolNameChange` callback for drawer-side calls) BACK into `<AgentDrawer/>`. The drawer's `effectiveLiveToolName = incomingLiveToolName ?? localLiveToolName` then drives the inner `<ToolListPanel/>` row highlight for BOTH paths — AGENT-02 single-source contract upheld at the drawer's inner panel.

## Decisions Made

- **W1 fix wired exactly as 02-02 prescribed.** AgentDrawer's revised inbound `liveToolName?: string | null` prop receives the page-level merged state; the `onLiveToolNameChange={setLiveToolName}` callback is the same `useState` setter consumed by the page's `wrapToolsWithEvents` dispatcher. Single source of truth at the merge layer; two consumers (page-level + drawer-internal ToolListPanel highlight); two writers (page-level dispatcher + drawer-side AgentDrawer's session). The cycle is safe because both writers funnel into the same `setState` call (idempotent reducer behavior).
- **AgentDrawer mounted INSIDE the workbench tab content** (the `useMemo` content array) instead of at the page root. Rationale: the drawer is workbench-specific, not docs-specific; mounting it inside the workbench tab content keeps the docs tab clean and ties the drawer's lifecycle to the workbench tab's render cycle. The page-level tool registration still runs unconditionally on page mount (independent of which tab is visible), so the AGENT-02 contract holds even when the user is on the docs tab.
- **`tabs` useMemo deps explicit and exhaustive.** The 02-PATTERNS PATTERNS.md specified `[recipes, activeId, loading, handleSelect, registration.status, registration.count, liveToolName]` — every value the workbench tab content reads, including the registration shape's two scalars (rather than the unstable object reference). This is the React-correct way to memoize when the dep is an object whose identity changes on each setRegistration call.
- **No deferred items.** All three task commits land on `feature/mcp-preview` cleanly; no skipped acceptance criteria; no scope creep.

## Deviations from Plan

None. The plan was executed exactly as written. Tasks 1, 2, and 3-step-1 each ran in sequence with no auto-fix invocations, no architectural changes, no auth gates, and no out-of-scope work. The two pre-existing Phase 2 deviations (Plan 02-01 §1 — structural alias for `LanguageModelTool`; Plan 02-02 §1 — `typeof LanguageModel` instead of `globalThis.LanguageModel`) are inherited as-is and do not affect this plan's outputs.

## Issues Encountered

- **`npx nx run-many -t lint --projects=chat`** target does not exist on the chat project (verified via `npx nx show project chat`; targets are `build`, `serve`, `preview`, `serve-static`, `build-deps`, `watch-deps`, `test`, `typecheck` — no `lint`). The plan's lint acceptance criterion is satisfied by `typecheck` instead, which exits 0. This is a Phase-1 inheritance, NOT a 02-03 deviation — already flagged in 02-01-SUMMARY §Issues Encountered and 02-02-SUMMARY §Issues Encountered. A future phase can decide whether to add an ESLint target to `chat/project.json`.
- **One PreToolUse hook reminder** fired during the edit sequence ("READ-BEFORE-EDIT REMINDER"). The file had been read at the start of execution; the hook was a no-op cautionary message. All edits succeeded without rejection. No action taken.

## User Setup Required

The Task 3 Step 2 manual UAT requires the following human-side setup before verification can proceed:
- Chrome 146.0.7672.0+ Canary (or newer Canary) — confirm via `chrome://version`.
- Both Chrome flags Enabled and browser relaunched: `chrome://flags/#WebMCP for testing` AND `chrome://flags/#enable-webmcp-testing`.
- Optional but recommended: `chrome://flags/#prompt-api-for-gemini-nano` Enabled (for UAT-04 in-page agent path).
- WebMCP Tool Inspector extension installed (Chrome Web Store or built from source per `02-HUMAN-UAT.md` link).
- Dev server running: `npx nx serve chat` → `http://localhost:4300/webmcp`.

The full step-by-step script is in `02-HUMAN-UAT.md`.

## Next Phase Readiness

- Phase 2 is functionally code-complete. The remaining gate is the human UAT (Task 3 Step 2), which is a `checkpoint:human-verify` — the verifier orchestrator routes this via the phase verifier's `human_needed` gate.
- Phase 3 (Documentation + SEO) inherits a fully-wired `/webmcp` page with: (1) registration pill in header, (2) AgentDrawer in workbench tab, (3) tool registration on mount + cleanup on unmount, (4) recipeStore live-update subscription, (5) the canonical demo flow runnable end-to-end. Phase 3 owns the docs tab content and SEO copy refinements; no further wiring needed in `RecipeWorkbenchPage.tsx`.
- No blockers. No open concerns.

## Self-Check

- chat/src/app/components/RecipeWorkbenchPage.tsx: FOUND (modified)
- .planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md: FOUND (created)
- Commit e83a0e7 (Task 1): FOUND
- Commit 3fea639 (Task 2): FOUND
- Commit 2aad418 (Task 3 step 1): FOUND
- `npx nx build chat` exits 0: PASS (post-Task-2 build verified)
- `npx nx typecheck chat` exits 0: PASS (post-Task-2 typecheck verified)
- W1 fix grep on `liveToolName={liveToolName}`: PASS (≥ 1 match in RecipeWorkbenchPage.tsx)
- All 23 Task-1 automated checks: PASS
- All 19 Task-2 automated checks: PASS
- All 11 Task-3 UAT-file automated checks: PASS
- Out-of-scope files unchanged (MissingFlagBanner, RecipePicker, RecipeHeader, IngredientsList, StepsList, ChatBox, ChatInput): PASS
- No `as any` / `: any` in RecipeWorkbenchPage.tsx: PASS
- No `promptStreaming` in RecipeWorkbenchPage.tsx: PASS

## Self-Check: PASSED

---
*Phase: 02-webmcp-tools-in-page-agent*
*Completed: 2026-04-27 (executor work; awaiting human UAT for full phase shipped status)*
