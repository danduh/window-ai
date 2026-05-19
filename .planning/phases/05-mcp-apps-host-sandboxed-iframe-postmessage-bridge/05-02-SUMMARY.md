---
phase: "05"
plan: "02"
subsystem: generative-ui/react-frame
tags: [mcp-apps, react, iframe, sandbox, postmessage, sep-1865, webmcp, brownfield, tailwind, dark-mode]
dependency_graph:
  requires:
    - "05-01: createUIResourceBridge factory (bridge.ts)"
    - "05-01: renderCarouselHTML (carouselTemplate.ts)"
    - "05-01: GEN_UI_TOOLS + registerGenUITools (genUITools.ts)"
    - "04-02: ChatPlaceholder.tsx Phase 4 empty-state"
    - "04-02: GenerativeUIPage.tsx Phase 4 two-column shell + seedIfMissing effect"
    - "chat/src/app/context/ThemeContext.tsx: useTheme() hook"
    - "chat/src/app/services/RecipePersistence.ts: getRecipes()"
  provides:
    - "chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx: Tailwind card wrapper"
    - "chat/src/app/components/GenerativeUI/UIResourceFrame.tsx: iframe + bridge lifecycle component"
    - "chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx: Show demo carousel trigger + UIResourceFrame slot"
    - "chat/src/app/components/GenerativeUIPage.tsx: registerGenUITools mount effect"
  affects:
    - "06-*: UIResourceFrame.html prop ready for chat-message-borne resources"
    - "06-*: commitRecipeToPlan tool registration in place for Phase 6 visibility annotation"
tech_stack:
  added: []
  patterns:
    - "mounting|ready|error state machine with iframeKey bump for retry (forces iframe DOM remount)"
    - "Separate PRIMARY and THEME effects — bridge instantiation on [iframeKey, html], theme propagation on [theme] via bridgeRef"
    - "Overlay approach: iframe always rendered but display:none until ready (keeps ref stable)"
    - "Single-slot policy: button disabled={showFrame} prevents multiple UIResourceFrame mounts"
    - "React.FC with useState + useRef (no class components) per project convention"
key_files:
  created:
    - "chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx"
    - "chat/src/app/components/GenerativeUI/UIResourceFrame.tsx"
  modified:
    - "chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx"
    - "chat/src/app/components/GenerativeUIPage.tsx"
    - "chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts"
decisions:
  - "Overlay render strategy (iframe always mounted, display:none) chosen over conditional mounting — keeps outerIframeRef stable for bridge.attachLoadListener() on first render"
  - "THEME EFFECT reads bridgeRef.current at call time (not via dep array) — avoids useCallback/bridgeRef dep chain that would trigger PRIMARY EFFECT re-run on theme change (Pitfall 4)"
  - "iframeKey bump for retry — React identity key change forces full DOM destruction + recreation, fresh load event, fresh bridge instance"
  - "Error text rendered via JSX string expressions {\"Couldn't load app\"} to keep apostrophes literal for grep acceptance criteria"
  - "handshakeTimeoutMs: 1000 inlined at call site (not extracted to named constant) to satisfy plan acceptance criteria grep"
  - "registerGenUITools effect placed after seedIfMissing effect in source order (parallel, not sequential — both use empty deps [])"
metrics:
  duration: "~25 min"
  completed: "2026-05-19"
  tasks_completed: 4
  tasks_total: 5
  files_created: 2
  files_modified: 3
---

# Phase 05 Plan 02: MCP Apps Host — Frame Component + Wiring Summary

**One-liner:** React surface layer wiring Plan 05-01 bridge primitives into a visible `/generative-ui` carousel via ChatBubbleContainer, UIResourceFrame (mounting|ready|error state machine), and a "Show demo carousel" trigger button.

## What Was Built

### `ChatBubbleContainer.tsx` — presentational wrapper card

Tiny (9 lines) Tailwind card. Locked class contract from 05-UI-SPEC.md Layout Contract: `rounded-2xl max-w-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm p-2 mt-4 animate-fade-in`. Pure presentational — no state, no effects, `children` prop only. Designed to be reused verbatim in Phase 6 for chat-message-borne iframes.

### `UIResourceFrame.tsx` — React component owning iframe + bridge lifecycle

Component implements the `mounting | ready | error` state machine:

- **PRIMARY EFFECT** `[iframeKey, html]`: creates the bridge via `createUIResourceBridge` with locked host constants (name: `window-ai-generative-ui`, mcpVersion: `2026-01-26`, handshakeTimeoutMs: 1000, 320px initial height). Registers `window.addEventListener('message', bridge.handleMessage)`. Cleanup destroys bridge and removes listener.
- **THEME EFFECT** `[theme]`: reads `bridgeRef.current` at call time (not as dep) and calls `bridge.sendHostContextChanged({ theme, displayMode: 'inline' })`. Separate from PRIMARY EFFECT to avoid re-instantiating the bridge on theme change.
- **Retry via iframeKey**: `handleRetry` sets frameState to `'mounting'` and increments `iframeKey`, forcing React to destroy and recreate the `<iframe>` DOM element.
- **Render strategy**: iframe is always present in the DOM (keeps ref stable for `attachLoadListener`), hidden via `display: none` until `frameState === 'ready'`. Loading skeleton and error card are rendered above the iframe based on state.

### `ChatPlaceholder.tsx` — augmented empty-state with "Show demo carousel" trigger

Converted from stateless to stateful. All Phase 4 visible content (SVG, h2, p) preserved verbatim. Additions:

- `showFrame` (boolean) + `carouselHTML` (string | null) state
- `handleShowCarousel`: calls `getRecipes()` → `renderCarouselHTML(recipes)` → sets state. Error-narrowed catch with `console.error`.
- Primary-600 button with locked Tailwind class contract, `disabled={showFrame}` for single-slot policy
- Conditional `<ChatBubbleContainer><UIResourceFrame html={carouselHTML} /></ChatBubbleContainer>` outside the card div, wrapped in React fragment

### `GenerativeUIPage.tsx` — parallel registerGenUITools effect

Added one new `useEffect(() => { const ctrl = registerGenUITools(); return () => { ctrl?.abort(); }; }, [])` after the existing `seedIfMissing` effect. The existing effect is untouched. Import added for `registerGenUITools`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed carouselTemplate.ts import path**
- **Found during:** Task 2 (typecheck run after UIResourceFrame.tsx created)
- **Issue:** `import type { Recipe } from '../../services/RecipePersistence'` in `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts` — the path goes 2 levels up from `iframe/` which lands at `components/`, not `app/`. Correct path needs 3 levels: `../../../services/RecipePersistence`.
- **Fix:** Changed `../../services/RecipePersistence` → `../../../services/RecipePersistence`
- **Files modified:** `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts`
- **Commit:** 2a6ef96 (bundled with Task 2 commit)

### Task 5 — Autonomous mode (checkpoint:human-verify)

Per orchestrator instructions, the interactive browser smoke check is skipped. Automated gates (typecheck, build) confirmed. The full verification checklist is in **Manual Verification Checklist** below for the orchestrator's browser UAT.

## Manual Verification Checklist

For the orchestrator's browser UAT agent (Chrome 146+ Canary, WebMCP flag enabled):

**Prerequisites:**
1. Start dev server: `npx nx serve chat` (from repo root). Open `http://localhost:4300/generative-ui` in Chrome Canary with `chrome://flags/#WebMCP for testing` enabled.

**Step-by-step checks:**

2. **Phase 4 baseline preserved:**
   - [ ] Page header "Generative UI" renders with gradient icon
   - [ ] Two-column layout: chat placeholder left, meal plan right
   - [ ] Empty-state heading: "Chat coming in a future phase"
   - [ ] Empty-state body: "Ask for a recipe here and an interactive card carousel will appear — powered by Chrome's built-in AI, all on-device."
   - [ ] MissingFlagBanner NOT visible (flag is on)

3. **New trigger button:**
   - [ ] Primary-600 button "Show demo carousel" visible below body copy
   - [ ] Button has `font-semibold` weight
   - [ ] Toggle dark mode: button adapts (stays primary-600)

4. **Show demo carousel click:**
   - [ ] Console logs `[mcp-apps:host] handshake complete` within ≤ 1000ms
   - [ ] ChatBubbleContainer (rounded white card with animate-fade-in) appears below placeholder card
   - [ ] Inside: horizontal carousel of recipe cards (recipe title, totalMinutes badge, top 1–3 ingredients, "Pick" button per card)
   - [ ] "Show demo carousel" button is now disabled (opacity-50, cursor-not-allowed)

5. **Theme propagation while iframe mounted:**
   - [ ] Toggle dark mode → console logs `[mcp-apps:host] host-context-changed sent`
   - [ ] Iframe cards switch to dark palette (`#1f2937` bg, `#f9fafb` text) within one animation frame, no flash
   - [ ] Toggle back to light → cards return to light palette

6. **Pick button → MealPlanColumn update:**
   - [ ] Click "Pick" on first card → console logs `[mcp-apps:iframe] tools/call sent` + `[mcp-apps:host] tools/call handled`
   - [ ] MealPlanColumn right column shows new entry (recipeId + timestamp)
   - [ ] Card "Pick" button shows "Added!" for ~2s then reverts
   - [ ] Click "Pick" on second card → second entry in MealPlanColumn

7. **Persistence across reload:**
   - [ ] Reload page → MealPlanColumn entries persist (IDB-backed)

8. **Brownfield boundary:**
   - [ ] `git diff --stat main...HEAD -- chat/src/app/components/RecipeWorkbench chat/src/app/services/recipeTools.ts mcp mcp-client devops` is empty

9. **`/webmcp` regression safety:**
   - [ ] Navigate to `http://localhost:4300/webmcp` → Recipe Workbench loads, AgentDrawer operational, no new console errors

**Optional (negative path):**
10. **Handshake timeout error UI:**
    - Temporarily comment out `ui/initialize` in `iframeBridgeScript.ts`, reload, click "Show demo carousel"
    - [ ] Within 1s: error card appears with "Couldn't load app" heading and "Try again" button
    - [ ] Click "Try again" → iframe remounts (error card still appears since init still disabled)
    - Revert the edit before continuing

## Threat Flags

No new threat surface beyond Plan 05-01. The iframe remains sandboxed with `allow-scripts allow-same-origin` on the outer iframe (inner iframe has only `allow-scripts`). No new network endpoints or auth paths introduced.

## Notes for Phase 6

- **UIResourceFrame's `html` prop** already supports any HTML string — Phase 6 routes the chat tool result (a `renderCarouselHTML`-generated string) through this same prop. No structural changes to UIResourceFrame needed; Phase 6 just wires the chat response into `setCarouselHTML` in whatever chat-message handler it introduces.
- **`commitRecipeToPlan` tool** currently has no `visibility:["app"]` annotation (Phase 6 GENUI-05 adds this). The registration guard (`previousGenUIRegistrationController`) is in place and the AbortController cleanup is wired.
- **Phase 6 `searchRecipes` tool** replaces the current "load all 12 recipes" approach in `handleShowCarousel`. The Phase 6 chat-driven flow will call `searchRecipes` via `navigator.modelContext`, get a filtered Recipe array, and pass the result to `renderCarouselHTML`. No changes to `ChatPlaceholder` or `UIResourceFrame` are needed for this upgrade.
- **Single-slot policy** is currently permanent for the session. Phase 6 may add a close/dismiss affordance to allow re-triggering the carousel after a search result.

## Test-Flake Notes

Not observed during automated verification. The `handshakeTimeoutMs: 1000` cap is generous for `srcdoc`-loaded content (no network I/O). Browser UAT should observe completion well under 200ms on localhost. If UAT reports occasional timeouts (> 1s handshake), the pre-load queue may need a `DOMContentLoaded` fence in `iframeBridgeScript.ts` — but this is not expected given the srcdoc loading model.

## Known Stubs

- `commitRecipeToPlan` in `genUITools.ts` is a Phase 6 stub (no `visibility:["app"]`, fixed text response) — carried forward from Plan 05-01. Phase 6 resolves.

## Self-Check

**Commits exist:**
- d741609: feat(05-02): ChatBubbleContainer — Tailwind card wrapper for UIResourceFrame
- 2a6ef96: feat(05-02): UIResourceFrame — iframe + bridge lifecycle + loading/error state machine
- e4675d6: feat(05-02): ChatPlaceholder — Show demo carousel trigger + UIResourceFrame slot
- 7cbe0b8: feat(05-02): GenerativeUIPage — parallel mount-time registerGenUITools effect

**Files exist:**
- chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx ✓
- chat/src/app/components/GenerativeUI/UIResourceFrame.tsx ✓
- chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx ✓ (modified)
- chat/src/app/components/GenerativeUIPage.tsx ✓ (modified)

**Quality gates:**
- npx nx typecheck chat: PASSED
- npx nx build chat: PASSED
- No `: any` at API surface: PASSED
- No `as any`: PASSED
- Brownfield boundary: INTACT (no edits to RecipeWorkbench, mcp, mcp-client, devops)

## Self-Check: PASSED
