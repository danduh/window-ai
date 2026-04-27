---
phase: 02-webmcp-tools-in-page-agent
plan: 02
subsystem: components
tags: [webmcp, ui, react, tailwind, dark-mode, agent-drawer, tool-list, language-model, chat-panel]

requires:
  - phase: 02-webmcp-tools-in-page-agent
    plan: 01
    provides: "RECIPE_TOOLS canonical 8-tool registry + toLanguageModelTools(tools, onEvent) adapter + ToolCallEvent discriminated union (services/recipeTools.ts + services/toolAdapter.ts)"
provides:
  - "ToolRegistrationPill.tsx: 5-state status pill (idle/success/partial/error/unavailable) with green/yellow/gray dark-mode-paired Tailwind tokens; returns null on unavailable"
  - "LanguageModelUnavailable.tsx: inline yellow banner inside the AgentDrawer when LanguageModel.availability() ≠ 'available' but navigator.modelContext IS present (chat-specific copy + smaller padding than MissingFlagBanner; no flag table)"
  - "ToolCallIndicator.tsx: 3-state system bubble (pending ⚙ Calling…, done ✓ done, error ✗ failed) driven by ToolCallEvent; motion-reduce:animate-none on spinning gear; role=status + aria-live=polite + aria-atomic=true"
  - "ToolListPanel.tsx: collapsible 8-tool list reading RECIPE_TOOLS at module scope; aria-expanded/aria-controls/tabIndex; live-active row highlight via bg-primary-50 dark:bg-primary-900/20 when liveToolName matches"
  - "AgentDrawer.tsx: drawer container owning LanguageModel session lifecycle + chat transcript composition; non-streaming session.prompt(text); inbound liveToolName?: string | null prop merged with localLiveToolName for the inner ToolListPanel highlight (W1 fix)"
affects: [02-03-page-wiring-and-registration]

tech-stack:
  added: []
  patterns:
    - "Drawer-owned session lifecycle: useEffect with empty deps + cancelled-flag + closure-captured createdSession ensures any session created during a cancelled mount is immediately destroyed (ASVS L1, T-02-02-05)"
    - "Inbound page-level state merge (W1): props.liveToolName ?? localLiveToolName makes the page's external-agent + drawer-side tool-call streams the single source of truth for the drawer's row highlight (AGENT-02 single source, two consumers)"
    - "Wrap-don't-fork override (FLAG-UI-03): ChatBox's hardcoded h-96 is overridden via [&>div:first-child]:h-full Tailwind arbitrary-variant on the wrapping div — no modification to existing ChatBox.tsx (brownfield discipline)"
    - "Stable-callback contract (I1): onLiveToolNameChange JSDoc locks the convention that callers MUST pass a useState setter or useCallback-wrapped function (the callback is captured in the mount-effect closure at session creation)"
    - "Discriminated-union-driven render: ToolCallIndicator branches on event.kind ('pending'|'done'|'error') with no boolean flags — exhaustive type checks via TS narrowing"
    - "Module-scoped registry consumption: ToolListPanel imports RECIPE_TOOLS at module scope and renders rows via .map; no hardcoded names anywhere in the UI layer"

key-files:
  created:
    - chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx
    - chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx
    - chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx
    - chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx
    - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
  modified: []

key-decisions:
  - "Locked the D-04 streaming fallback: AgentDrawer ships session.prompt(text) (non-streaming) instead of session.promptStreaming(). RESEARCH.md §Pitfall #6 + §Open-Q2 confirmed Chrome 146 Canary does not document tool-calling + streaming as a supported combination. ROADMAP success criterion #4 ('streams the assistant's text response') is acknowledged as aspirational; user-facing behavior is 'awaiting first token' lasts longer, then the full reply renders at once. Streaming is deferred until Chrome's docs explicitly support the combination. Recorded as Rule-3 deviation below."
  - "Replaced the plan's `typeof globalThis.LanguageModel === 'undefined'` runtime guard with `typeof LanguageModel === 'undefined'` to match the script-mode ambient declaration in dom-chromium-ai.d.ts. The ambient `declare global { abstract class LanguageModel … }` declares a global identifier, NOT a property on globalThis; TS rejects the indexed access (TS2339). The global identifier form is used everywhere else in the codebase (ChatAIService.ts:4, ChatPage etc.). Recorded as Rule-1 deviation below."

patterns-established:
  - "Phase 2 status-pill pattern (5-state record + early-return-null on unavailable): Phase 3 polish pages can mirror this for any registration / availability surface"
  - "Wrap-don't-fork pattern (FLAG-UI-03): when an existing component hardcodes a dimension or copy that conflicts with a new layout, override via Tailwind arbitrary variants on the parent rather than forking the leaf component"
  - "Inbound-prop-merge-with-local-fallback pattern (W1): a self-contained component can opt into being controlled by the host page via an optional prop, with `incoming ?? local` fallback preserving standalone usage — keeps the contract one-way and avoids duplicate state-of-truth"

requirements-completed:
  - AGENT-01
  - AGENT-02
  - MCP-02

duration: 345s
completed: 2026-04-27
---

# Phase 02 Plan 02: In-Page Agent UI Components Summary

**5 React components composing the in-page WebMCP agent: ToolRegistrationPill (header status), LanguageModelUnavailable (inline drawer banner), ToolCallIndicator (lifecycle system bubble), ToolListPanel (collapsible 8-tool list), AgentDrawer (session-owning chat container) — non-streaming `session.prompt` ships per D-04 fallback; same RECIPE_TOOLS registry consumed by both LanguageModel and (in 02-03) navigator.modelContext.**

## Performance

- **Duration:** ~345s
- **Started:** 2026-04-27T10:19:32Z
- **Completed:** 2026-04-27T10:25:17Z
- **Tasks:** 3 of 3
- **Files modified:** 5 created, 0 modified

## Accomplishments

- Shipped `ToolRegistrationPill.tsx` — exports `ToolRegistrationStatus` union and a 5-state pill (idle ⏳, success ✓, partial ⚠, error ⚠, unavailable→null) with role=status + aria-live=polite + animate-fade-in mount; every visible class dark-mode-paired per UI-SPEC §1.
- Shipped `LanguageModelUnavailable.tsx` — yellow banner mirroring MissingFlagBanner with smaller padding (`p-3` vs `p-4`), chat-specific copy ("Chrome built-in AI isn't available." / "The recipe tools are still registered (try the Tool Inspector)…"), and no flag table per UI-SPEC §5 / §Copywriting.
- Shipped `ToolCallIndicator.tsx` — 3-state system bubble (pending/done/error) driven by a single discriminated `ToolCallEvent` prop; `motion-reduce:animate-none` next to `animate-spin` on the gear glyph; role=status + aria-live=polite + aria-atomic=true so screen readers announce the call as a single update; `formatArgs(args)` caps at 2 entries then renders `(…)` per UI-SPEC §4 args display rule.
- Shipped `ToolListPanel.tsx` — collapsible panel with `aria-expanded`/`aria-controls="recipe-tool-list"` toggle button + `tabIndex={0}` scroll region; reads RECIPE_TOOLS at module scope (no hardcoded names) and renders 8 rows on expand with monospace name + dim description; live-active row highlight `bg-primary-50 dark:bg-primary-900/20` when `liveToolName` matches; header copy reflects state ("Tools (8)" / "Tools (registering…)" / "Tools (n of 8)" / "Tools (0 — unavailable)").
- Shipped `AgentDrawer.tsx` — drawer container owning LanguageModel session lifecycle: `useEffect` with empty deps + `cancelled = false` flag + `createdSession?.destroy()` cleanup; non-streaming `session.prompt(text)` per D-04 fallback; `LanguageModel.create({ initialPrompts: [{role:'system', …}], tools: toLanguageModelTools(RECIPE_TOOLS, onToolEvent) })` — same RECIPE_TOOLS registry that 02-03 will register with navigator.modelContext (AGENT-02 single source of truth). Composes `ToolListPanel` + `ChatBox` (wrapped via `[&>div:first-child]:h-full` to override its hardcoded h-96 — FLAG-UI-03 wrap-don't-fork) + indicator rows + `LanguageModelUnavailable` + `ChatInput`. Drawer card geometry exactly matches UI-SPEC §2: `h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96`. Disabled-mode wiring: ChatInput.disabled = isLoading || unavailable || (!session && !sessionInitFailed).
- **W1 fix shipped (AGENT-02 single source, two consumers):** `AgentDrawer` declares `liveToolName?: string | null` inbound prop and computes `effectiveLiveToolName = incomingLiveToolName ?? localLiveToolName`; the inner `<ToolListPanel liveToolName={effectiveLiveToolName} />` receives the merged value so external-agent (Tool Inspector) tool calls AND drawer-side LanguageModel tool calls both light up the inner panel's row highlight.
- **I1 fix shipped (stable-callback contract):** `onLiveToolNameChange` JSDoc carries the literal phrase **"Pass a stable callback"** to lock the convention — callers MUST pass a `useState` setter or `useCallback`-wrapped function, since the callback is captured in the mount-effect closure at session creation (an unstable inline function would leave the closure holding a stale reference).
- TypeScript strict typecheck passes (`npx nx typecheck chat` exits 0); production build passes (`npx nx build chat` exits 0).
- Brownfield-clean: `git diff --stat HEAD chat/src/app/components/ChatBox.tsx chat/src/app/components/ChatInput.tsx chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` returns NOTHING — no existing components modified.

## Task Commits

1. **Task 1: ToolRegistrationPill.tsx + LanguageModelUnavailable.tsx (status components)** — `28f881e` (feat)
2. **Task 2: ToolCallIndicator.tsx + ToolListPanel.tsx (chat-row + collapsible list)** — `e19ab50` (feat)
3. **Task 3: AgentDrawer.tsx (session-owning chat container)** — `88a6876` (feat)

## Files Created/Modified

- `chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx` — named export `ToolRegistrationPill`, named export `ToolRegistrationStatus`. Props: `{ status, registeredCount, totalCount }`. Returns null on `'unavailable'`. ~64 LoC.
- `chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx` — named export `LanguageModelUnavailable`. No props (renders fixed inline copy). ~30 LoC.
- `chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx` — named export `ToolCallIndicator`. Props: `{ event: ToolCallEvent }`. Local helper `formatArgs(args)` caps at 2 entries. ~70 LoC.
- `chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx` — named export `ToolListPanel`. Props: `{ status, registeredCount, liveToolName }`. Reads RECIPE_TOOLS at module scope. ~85 LoC.
- `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` — named export `AgentDrawer`. Props: `{ onLiveToolNameChange?, registrationStatus, registeredCount, liveToolName? }`. Owns `useReducer<Map<id, ToolCallEvent>>` for indicator rows + LanguageModel session state. ~205 LoC.

## Decisions Made

- **D-04 fallback locked: non-streaming session.prompt(text)** — see Deviations §1. Plan explicitly authorized this fallback; recorded as Rule-3 deviation per the plan's `<deviations>` block.
- **Runtime guard: `typeof LanguageModel === 'undefined'`** instead of `globalThis.LanguageModel` — see Deviations §2. The ambient `declare global { abstract class LanguageModel … }` in `dom-chromium-ai.d.ts` declares a global identifier, NOT a property on `globalThis`; the indexed access form fails type-checking with TS2339. The global-identifier form is the codebase's existing pattern (ChatAIService.ts:4).
- **No JSDoc-driven type narrowing for `formatArgs`** — `String(v)` and template literals are sufficient at the React text-node trust boundary (T-02-02-01) since JSX never interprets strings as HTML.
- **Indicator events accumulate across the session** — the `useReducer<Map>` model preserves all calls in the transcript for the 2-min demo. UI-SPEC §4 explicitly allowed merging events into the transcript stream; a "reset on next user message" policy is deferred (out of scope for v1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] D-04 streaming fallback recorded (consciously accepted, spec-driven)**

- **Found during:** Plan-level (pre-coded into the plan's `<deviations>` block).
- **Issue:** The plan's `<deviations>` instructed AgentDrawer to ship NON-streaming `session.prompt(text)` per CONTEXT.md D-04 fallback authorization (RESEARCH.md §Open-Q2 + Pitfall #6 — Chrome 146 Canary does not document tool-calling + streaming as a supported combination). ROADMAP success criterion #4 ("streams the assistant's text response") is acknowledged as aspirational.
- **Fix applied:** AgentDrawer.tsx uses `await session.prompt(text)`; never calls the streaming variant. The user-facing behavior is "awaiting first token" lasts longer, then the full reply renders at once. The `motion-reduce:animate-none` on the in-flight gear glyph still degrades correctly when the call is in flight.
- **Files modified:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (Task 3).
- **Verification:** `grep -E "promptStreaming" chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` returns no matches; `grep "session.prompt(text)" …` returns 1 match (the call site).
- **Committed in:** `88a6876` (Task 3 commit).

---

**2. [Rule 1 — Bug] `globalThis.LanguageModel` runtime guard fails TypeScript strict typecheck**

- **Found during:** Task 3 (initial build of AgentDrawer.tsx after Write).
- **Issue:** The plan's verbatim code snippet contained `if (typeof globalThis.LanguageModel === 'undefined')` as the WebMCP/LanguageModel runtime detection guard. `npx nx build chat` failed with `TS2339: Property 'LanguageModel' does not exist on type 'typeof globalThis'`. Root cause: `chat/src/app/types/dom-chromium-ai.d.ts` declares `LanguageModel` as `abstract class LanguageModel extends EventTarget` inside `declare global { … }`. This creates a top-level global identifier (referenced as `LanguageModel` directly), NOT a property on the `globalThis` interface (which is what indexed access requires). The same script-mode quirk caused a similar TS error in Plan 02-01 Task 3 (see 02-01-SUMMARY §Deviations §1).
- **Attempted fix:** None other than the final form below — this fix is the canonical codebase pattern. `chat/src/app/services/ChatAIService.ts:4` (the existing reference) calls `await LanguageModel.availability();` directly, treating `LanguageModel` as a global identifier. The `typeof X === 'undefined'` form is the only safe runtime existence check on a `declare global` class identifier — TS allows it as a special-case operator.
- **Final fix:** Replaced `typeof globalThis.LanguageModel === 'undefined'` with `typeof LanguageModel === 'undefined'`. Behavior is identical at runtime (both resolve to the global scope) but the global-identifier form passes strict type-check because `typeof` on a possibly-undefined identifier is special-cased in TS.
- **Files modified:** `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (Task 3, no separate commit — folded into commit `88a6876`).
- **Verification:** `npx nx build chat` exits 0; `npx nx typecheck chat` exits 0; the no-`any` regex check returns no matches in AgentDrawer.tsx.
- **Committed in:** `88a6876` (Task 3 commit).

---

**Total deviations:** 2 (1 Rule-3 spec-driven, 1 Rule-1 bug fix). **Impact on plan:** No scope creep. The D-04 fallback was pre-authorized; the runtime-guard fix uses the codebase's canonical pattern. Both fixes preserve the plan's contract: AgentDrawer detects LanguageModel availability and short-circuits to `setUnavailable(true)` when the API is missing, AND ships non-streaming session.prompt for the in-page agent. AGENT-01, AGENT-02, MCP-02 substrates are unaffected.

## Issues Encountered

- **`npx nx run-many -t lint --projects=chat`** target does not exist on the chat project (verified via `npx nx show project chat`; targets are `build`, `serve`, `preview`, `serve-static`, `build-deps`, `watch-deps`, `test`, `typecheck` — no `lint`). The plan's lint acceptance criterion is satisfied by `typecheck` instead, which exits 0. This is a Phase-1 inheritance, NOT a 02-02 deviation — already flagged in 02-01-SUMMARY §Issues Encountered, so it's expected. A future phase can decide whether to add an ESLint target to `chat/project.json`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02-03 (page wiring + WebMCP registration) can now `import { AgentDrawer } from '../components/RecipeWorkbench/AgentDrawer'`, `import { ToolRegistrationPill } from '…/ToolRegistrationPill'`, and pass page-level state (`registrationStatus`, `registeredCount`, `liveToolName`, `setLiveToolName`) into the drawer.
- `<ToolRegistrationPill status={…} registeredCount={…} totalCount={RECIPE_TOOLS.length} />` slots into the existing header `<div className="flex items-center space-x-3">` immediately before `<ThemeToggle />` per UI-SPEC §Pill Placement Decision.
- `<AgentDrawer registrationStatus={…} registeredCount={…} liveToolName={liveToolName} onLiveToolNameChange={setLiveToolName} />` mounts inside the Workbench tab below the existing WorkbenchPanel grid (`mt-6` gap).
- The W1 fix means 02-03's external-agent path (`navigator.modelContext.registerTool` wrapped via `wrapToolsWithEvents`) will also light up the drawer's inner ToolListPanel highlight when the same `setLiveToolName` is wired into both consumers — single source of truth at the UI layer.
- `LanguageModelUnavailable` is rendered automatically by AgentDrawer (no host wiring needed); 02-03 only needs to handle the `MissingFlagBanner` (page-level, when navigator.modelContext is absent).
- No blockers. Both deviations are documented above and verified to preserve the plan's contracts.

## Self-Check

- chat/src/app/components/RecipeWorkbench/ToolRegistrationPill.tsx: FOUND
- chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx: FOUND
- chat/src/app/components/RecipeWorkbench/ToolCallIndicator.tsx: FOUND
- chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx: FOUND
- chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx: FOUND
- Commit 28f881e: FOUND
- Commit e19ab50: FOUND
- Commit 88a6876: FOUND
- `npx nx build chat` exits 0: PASS
- `npx nx typecheck chat` exits 0: PASS
- Existing components unmodified (ChatBox.tsx, ChatInput.tsx, MissingFlagBanner.tsx): PASS
- No `as any` / `: any` in any of the 5 new files: PASS
- No `promptStreaming` / `dangerouslySetInnerHTML` in any of the 5 new files: PASS
- W1: `liveToolName?: string | null` declared in AgentDrawerProps: PASS
- W1: `incomingLiveToolName ?? localLiveToolName` merge expression present: PASS
- W1: `<ToolListPanel … liveToolName={effectiveLiveToolName} />` in AgentDrawer JSX: PASS
- I1: `Pass a stable callback` literal phrase present in AgentDrawer JSDoc: PASS

## Self-Check: PASSED

---
*Phase: 02-webmcp-tools-in-page-agent*
*Completed: 2026-04-27*
