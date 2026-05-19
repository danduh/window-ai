---
phase: 06-in-page-chat-tool-wiring
plan: "02"
subsystem: ui
tags: [webmcp, language-model, json-dispatch, chat-panel, mcp-apps, brownfield, generative-ui, react]

# Dependency graph
requires:
  - phase: 06-in-page-chat-tool-wiring/06-01
    provides: GEN_UI_TOOLS with searchRecipes + visibility:['app'] on commitRecipeToPlan, setCommitListener, Message.uiResourceUri, ChatBox iframe-render branch

provides:
  - "GenUIChatPanel — LanguageModel JSON-dispatch loop + _meta interceptor + commit listener + visibility-filtered system prompt"
  - "GenerativeUIPage left column renders GenUIChatPanel instead of ChatPlaceholder"
  - "ChatPlaceholder.tsx deleted (Phase 5 debug trigger superseded)"

affects:
  - 07-documentation-seo (next phase — docs route + 90s demo polish)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "responseFormat INTENT_SCHEMA dispatch loop cloned from codebase agent pattern (no LanguageModel.create({tools}) — Chrome 147 broken)"
    - "_meta interceptor: strips ui.resourceUri from toolResultForModel before session.prompt() — GENUI-10 invariant"
    - "useCallback for addMessage: stable identity for setCommitListener registration"
    - "console.assert(!promptText.includes('ui://')) runtime invariant enforcement"
    - "visibleTools filter: GEN_UI_TOOLS.filter(t => !t.annotations?.visibility?.includes('app'))"

key-files:
  created:
    - chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx
  modified:
    - chat/src/app/components/GenerativeUIPage.tsx
  deleted:
    - chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx

key-decisions:
  - "addMessage declared with useCallback (stable identity) so setCommitListener captures it without stale closure risk"
  - "console.assert is single-line to satisfy grep -c 'console.assert.*ui://' acceptance criterion"
  - "No eslint-disable-next-line no-console directives: the ESLint config does not enable no-console, making disable directives generate unused-directive warnings"
  - "Triple-slash reference suppressed with eslint-disable-next-line @typescript-eslint/triple-slash-reference (same root issue as existing codebase files)"

# Metrics
duration: ~6min
completed: 2026-05-19
---

# Phase 6 Plan 02: GenUIChatPanel + page wiring Summary

**In-page chat panel with LanguageModel JSON-dispatch loop, _meta interceptor for ui:// URI stripping, commit-listener for meal-plan confirmation, and GenerativeUIPage rewired to render the new panel**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-19T08:37:40Z
- **Completed:** 2026-05-19T08:43:00Z
- **Tasks:** 2 of 2 implemented (Task 3 is checkpoint:human-verify — automated gates below)
- **Files modified:** 3 (1 created, 1 modified, 1 deleted)

## Accomplishments

- Created `GenUIChatPanel.tsx` — LanguageModel JSON-dispatch panel for `/generative-ui`:
  - INTENT_SCHEMA + extractJsonFromResponse (three-stage parser) cloned from codebase agent pattern
  - MAX_TOOL_ITERATIONS = 5 (Phase 6 safety guard)
  - System prompt generated from `GEN_UI_TOOLS.filter(t => !annotations?.visibility?.includes('app'))` — only `searchRecipes` listed; `commitRecipeToPlan` intentionally hidden
  - `_meta` interceptor: when `searchRecipes` returns `_meta['ui.resourceUri']`, strips it from `toolResultForModel` before feeding back to `session.prompt()` — GENUI-10 invariant
  - `console.assert(!promptText.includes('ui://'))` before every `session.prompt()` call — runtime enforcement
  - `setCommitListener` registered on mount, cleared on unmount — appends "Added \<title\> to your meal plan ✓" when `commitRecipeToPlan` resolves
  - `useCallback` for `addMessage` — stable reference for the commit-listener closure
- Modified `GenerativeUIPage.tsx` — replaced `<ChatPlaceholder />` with `<GenUIChatPanel />` in the left column; both `useEffect` hooks (seedIfMissing, registerGenUITools) are byte-identical
- Deleted `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` via `git rm` — Phase 5 debug trigger superseded by the real chat panel

## Task Commits

Each task committed atomically:

1. **Task 1: Create GenUIChatPanel** - `85bec2f` (feat)
2. **Task 2: Wire GenUIChatPanel into GenerativeUIPage; delete ChatPlaceholder** - `b988abb` (feat)

## Automated Gate Results

| Gate | Status |
|------|--------|
| `npx nx typecheck chat` | PASSED |
| `npx nx build chat` | PASSED |
| `npx nx lint chat` | N/A — lint target not configured (same as Plan 06-01) |
| `grep -c "ui://" GenUIChatPanel promptText assignments` | 0 (invariant satisfied) |
| `grep -c "console.assert.*ui://"` | 1 (runtime guard present) |
| `grep -rn "ChatPlaceholder" chat/src` | 0 (fully purged) |
| Brownfield check (RecipeWorkbench, mcp, mcp-client, devops) | CLEAN |

## Manual UAT Checklist

The following steps are the **Task 3 checkpoint:human-verify** UAT. They require Chrome 146+ Canary with `chrome://flags/#WebMCP for testing` enabled.

### Prerequisites

```
npx nx serve chat
```

Open `http://localhost:4300/generative-ui` in Chrome Canary.

### Step 1 — Cold-load baseline

- [ ] Page header "Generative UI" renders with the gradient icon (Phase 4 baseline)
- [ ] Two-column layout: chat panel on the left (full-height flex container), meal-plan column on the right
- [ ] Left column shows the empty chat state (empty bubble icon + "Start a conversation with AI" centered)
- [ ] **No "Show demo carousel" button visible** — ChatPlaceholder debug trigger is deleted
- [ ] MissingFlagBanner NOT visible (flag is on)
- [ ] Console shows no errors. A `[GenUI]` info log may appear when registerGenUITools succeeds.

### Step 2 — Type the search query

- [ ] Type `Find me a 30-minute chicken recipe` into the chat input and press Enter
- [ ] The input clears; a user-side bubble appears with the typed text
- [ ] Within ~3-5s, the model emits a `searchRecipes` tool call; a bot-side bubble appears containing the recipe carousel iframe (3 cards based on seeded data)
- [ ] The caption text in the bubble reads something like `Found N recipes`
- [ ] A second bot bubble follows with the model's `done` reply (e.g. `Here are 3 chicken recipes under 30 minutes.`)
- [ ] **The literal substring `ui://` MUST NOT appear in this reply** — this is the GENUI-10 visible criterion

### Step 3 — Verify NO `ui://` leaked to the model (devtools)

- [ ] Open the Console. The defensive `console.assert(!promptText.includes('ui://'), ...)` MUST NOT fire (no red assert message)
- [ ] Optional: pause at `session.prompt(promptText)` in GenUIChatPanel.tsx and inspect `promptText` — it must never contain `ui://`

### Step 4 — Pick a card

- [ ] Click "Pick" on the first carousel card
- [ ] Console shows `[mcp-apps:iframe] tools/call sent` + `[mcp-apps:host] tools/call handled` (Phase 5 bridge logs)
- [ ] The right-column MealPlanColumn updates within one animation frame with a new entry
- [ ] The chat appends a new system-style message: `Added <recipeTitle> to your meal plan ✓` (with the actual recipe title, not the raw recipeId — verifies `getRecipe` title resolution)
- [ ] The card's "Pick" button briefly shows `Added!` for ~2s then reverts (Phase 5 iframe behavior)

### Step 5 — Persistence

- [ ] Reload the page. The MealPlanColumn entry survives the reload (IDB-backed).
- [ ] The chat transcript is fresh (in-memory only — intentional).

### Step 6 — Brownfield boundary

- [ ] `git diff --stat main...HEAD -- chat/src/app/components/RecipeWorkbench chat/src/app/services/recipeTools.ts mcp mcp-client devops` is empty
- [ ] Visit `http://localhost:4300/webmcp` — Recipe Workbench loads, the webmcp agent chat still works, MealPlanColumn from `/generative-ui` is not present (correct — different page)

### Step 7 — Edge cases (best-effort)

- [ ] Type `tell me a joke` — model emits `{ toolName: 'done', reply: '...' }` directly with no tool call; reply text appears in a bot bubble
- [ ] Type `find me a recipe with mango under 5 minutes` — carousel renders with 0 cards; `done` reply explains

### Step 8 — Source grep (final gate)

```
grep -nE 'session\.prompt\(.*ui://' chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx
```

- [ ] Returns 0 lines (no literal `ui://` constructed into prompt arguments)

## Files Created/Modified

- `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` — New: 399 lines; full dispatch loop + interceptor
- `chat/src/app/components/GenerativeUIPage.tsx` — Modified: ChatPlaceholder → GenUIChatPanel swap (2 lines changed)
- `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` — Deleted (63 lines removed)

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree behind main — merge required before execution**

- **Found during:** Task 1 start
- **Issue:** The worktree branch `worktree-agent-adc5d63d56d638872` was at `f454625` (old main HEAD from before Phases 4-6 Plan 01 landed). The working tree did not have `genUITools.ts`, `ChatBox.tsx` with `uiResourceUri`, or the `GenerativeUI/` directory components that Plan 06-02 depends on.
- **Fix:** Ran `git merge main --no-edit` (fast-forward) to bring the worktree up to `e76b2bc` (current main HEAD with all Phase 4-6 Plan 01 work).
- **Files affected:** All Phase 4-6 Plan 01 files landed via merge.
- **Deviation type:** Environment setup, not a code deviation. No Plan 06-01 re-execution needed.

**2. [Rule 1 - Bug] console.assert must be on one line for grep pattern**

- **Found during:** Acceptance criteria verification
- **Issue:** The acceptance criterion `grep -c "console.assert.*ui://"` requires 1 match. A multi-line call (assertion value on one line, message on next) returns 0.
- **Fix:** Collapsed the console.assert to a single line to satisfy the grep.

**3. [Rule 1 - Bug] ESLint warns on unused eslint-disable directives**

- **Found during:** ESLint run on new file
- **Issue:** The codebase agent pattern uses `// eslint-disable-next-line no-console` before console.error calls, but the chat workspace's ESLint config does not enable `no-console`, making those directives generate "unused directive" warnings.
- **Fix:** Removed the `no-console` disable directives; added `eslint-disable-next-line @typescript-eslint/triple-slash-reference` for the required triple-slash reference (same issue exists in pre-existing codebase files).

## Known Stubs

None — GenUIChatPanel is fully wired to:
- `GEN_UI_TOOLS.searchRecipes` via the JSON-dispatch loop
- `setCommitListener` / `getRecipe` for commit confirmation
- `ChatBox` with the `uiResourceUri` iframe-render branch from Plan 06-01

## Notes for Phase 7 Polish

- Pick button visual clipping (carousel card overflow) — known Phase 5 issue, deferred to Phase 7
- Cold-run timing: model may take 3-8s on first inference after browser launch
- The `console.assert(!promptText.includes('ui://'))` runtime check should NOT fire during UAT (if it does, it indicates an _meta interceptor regression)
- Docs route `/generative-ui/docs` + markdown explainer → Phase 7
- SEO entry update for docs sub-route → Phase 7

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced beyond those documented in the plan's threat model.

---

*Phase: 06-in-page-chat-tool-wiring*
*Completed: 2026-05-19*
