---
phase: 06-in-page-chat-tool-wiring
plan: "01"
subsystem: ui
tags: [webmcp, mcp-apps, types, tool-registration, chatbox, generative-ui, react]

# Dependency graph
requires:
  - phase: 05-mcp-apps-host-sandboxed-iframe-postmessage-bridge
    provides: GEN_UI_TOOLS stub (commitRecipeToPlan), UIResourceFrame, ChatBubbleContainer, renderCarouselHTML
  - phase: 04-v1-1-foundation-page-shell-store-seed
    provides: MealPlanStore.addToPlan, RecipePersistence.getRecipes, Recipe interface (totalMinutes/searchableIngredients)

provides:
  - "ModelContextToolAnnotations.visibility?: string[] — additive type field (webmcp.d.ts)"
  - "recipeCarouselRegistry — setRecipes/getRecipes/clearRecipes over module-scope Map<string, Recipe[]>"
  - "GEN_UI_TOOLS[1] = searchRecipes — MCP-Apps shape with _meta.ui.resourceUri token"
  - "GEN_UI_TOOLS[0].annotations.visibility:['app'] — commitRecipeToPlan hidden from LLM"
  - "setCommitListener(cb) — callback slot invoked after commitRecipeToPlan resolves"
  - "Message.uiResourceUri?: string — optional field for iframe carousel bubble in ChatBox"
  - "ChatBox iframe-render branch — resolveCarouselHTML + ChatBubbleContainer/UIResourceFrame render"

affects:
  - 06-in-page-chat-tool-wiring/06-02
  - any future plan that wires GenUIChatPanel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-scope Map registry with named accessor functions (recipeCarouselRegistry pattern)"
    - "Namespace import convention to avoid function name collision (import * as recipeCarouselRegistry)"
    - "Single-slot commit-listener pub-sub (setCommitListener) for cross-component callbacks"
    - "Conditional render branch in ChatBox keyed on optional Message field"
    - "MCP-Apps _meta shape: { content, _meta: { ui.resourceUri, genUI.recipeCount } }"

key-files:
  created:
    - chat/src/app/services/recipeCarouselRegistry.ts
  modified:
    - chat/src/app/types/webmcp.d.ts
    - chat/src/app/services/genUITools.ts
    - chat/src/app/components/ChatBox.tsx

key-decisions:
  - "Namespace import (import * as recipeCarouselRegistry) is mandatory at all call sites — named import collides with RecipePersistence.getRecipes"
  - "onCommitCallback is fire-and-forget (not awaited) to avoid blocking bridge response on UI work"
  - "uiResourceUri bubble uses max-w-[95%] p-2 to accommodate carousel card width (vs standard max-w-[80%] p-4)"
  - "Registry cleared on window.beforeunload only (no LRU/TTL) — sufficient for 90-second single-page demo session"
  - "searchRecipes has no annotations.visibility — it must remain visible to the LLM"

patterns-established:
  - "Tool visibility filtering: tools with annotations.visibility:['app'] are excluded from model-visible catalog by the chat panel filter (06-02 enforces this; 06-01 establishes the type + annotation)"
  - "recipeCarouselRegistry: always access via namespace import, never destructured named imports"
  - "setCommitListener: single-slot pattern — chat panel registers on mount, clears on unmount"

requirements-completed: [GENUI-04, GENUI-05, GENUI-10]

# Metrics
duration: 20min
completed: 2026-05-19
---

# Phase 6 Plan 01: tools + types + ChatBox extension (additive substrate) Summary

**Additive substrate for in-page chat tool wiring: recipeCarouselRegistry token map, searchRecipes MCP-Apps tool, visibility:['app'] annotation on commitRecipeToPlan, setCommitListener slot, and ChatBox iframe-carousel render branch**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-19T00:00:00Z
- **Completed:** 2026-05-19T00:20:00Z
- **Tasks:** 3 of 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Extended `ModelContextToolAnnotations` in `webmcp.d.ts` with additive `visibility?: string[]` field making `annotations: { visibility: ['app'] }` type-legal (GENUI-05)
- Created `recipeCarouselRegistry.ts` with module-scope `Map<string, Recipe[]>`, `setRecipes/getRecipes/clearRecipes` exported functions, and `beforeunload` cleanup
- Extended `genUITools.ts`: `commitRecipeToPlan` gains `visibility:['app']` annotation + `onCommitCallback` invocation; new `searchRecipes` tool with ingredient/maxMinutes filtering, crypto.randomUUID token, and MCP-Apps `_meta` shape; `setCommitListener` exported
- Extended `ChatBox.tsx`: `Message.uiResourceUri?: string` optional field; iframe-carousel render branch with `resolveCarouselHTML` helper, `ChatBubbleContainer`/`UIResourceFrame`, and wider bubble (95%) for iframe messages; standard text bubbles unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ModelContextToolAnnotations.visibility + create recipeCarouselRegistry** - `7ecd3d2` (feat)
2. **Task 2: Extend GEN_UI_TOOLS with searchRecipes + visibility annotation + setCommitListener** - `b148c15` (feat)
3. **Task 3: Extend ChatBox Message type + add iframe-rendering branch** - `c824e21` (feat)

## Files Created/Modified

- `chat/src/app/types/webmcp.d.ts` — Added `visibility?: string[]` to `ModelContextToolAnnotations` interface
- `chat/src/app/services/recipeCarouselRegistry.ts` — New: module-scope registry Map with setRecipes/getRecipes/clearRecipes + beforeunload cleanup
- `chat/src/app/services/genUITools.ts` — Added searchRecipes tool, visibility annotation on commitRecipeToPlan, onCommitCallback slot, setCommitListener export
- `chat/src/app/components/ChatBox.tsx` — Added Message.uiResourceUri field, resolveCarouselHTML helper, iframe-carousel conditional render branch

## Decisions Made

- **Namespace import mandatory**: `import * as recipeCarouselRegistry` required at all call sites. Both `recipeCarouselRegistry.ts` and `RecipePersistence.ts` export a function named `getRecipes`; named destructuring would create an ambiguous import.
- **Fire-and-forget callback**: `onCommitCallback?.(recipeId)` is NOT awaited in the `commitRecipeToPlan` handler — the bridge response must not block on chat panel UI work.
- **Bubble sizing**: iframe carousel messages use `max-w-[95%] p-2` (wider/tighter padding) vs standard `max-w-[80%] p-4` to accommodate carousel card layout.
- **No LRU/TTL on registry**: `beforeunload` clear is sufficient for a 90-second single-page demo. Phase 7 may add LRU if needed.

## Deviations from Plan

None — plan executed exactly as written.

The worktree branch was behind `main` (it was created before Phase 5 work landed), so a `git merge main` fast-forward was required before execution to bring in the Phase 5 files (`genUITools.ts`, `UIResourceFrame.tsx`, etc.) that this plan modifies. This is normal worktree setup, not a plan deviation.

## Issues Encountered

- `npx nx lint chat` target is not configured (lint plugin is commented out in `nx.json`). ESLint was run directly on modified files — no errors found.

## Known Stubs

None — all exports are fully implemented with real logic.

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced. The `recipeCarouselRegistry` is read-only from outside the module; tokens are `crypto.randomUUID()` (unguessable); the `_meta` strip-before-prompt invariant is enforced by Plan 06-02's interceptor.

## Next Phase Readiness

**Plan 06-02 can now import:**

```typescript
// Registry (always use namespace form — never named import):
import * as recipeCarouselRegistry from '../../services/recipeCarouselRegistry';

// genUITools:
import { GEN_UI_TOOLS, setCommitListener } from '../../services/genUITools';

// Message channel: set uiResourceUri on a Message object to render an iframe bubble:
const msg: Message = {
  id: ...,
  sender: 'bot',
  text: 'Found 3 recipes',
  uiResourceUri: 'ui://gen-ui/carousel/<token>',
};
```

Plan 06-02 responsibilities:
1. Filter `GEN_UI_TOOLS` by `annotations.visibility` to build the model-visible system-prompt tool list (only `searchRecipes` should appear)
2. Intercept `_meta.ui.resourceUri` in the tool-result dispatcher and write it to a `Message` object
3. Register `setCommitListener` on mount / clear on unmount to receive commit events
4. Strip `_meta` before feeding tool results back to `LanguageModel.prompt()`

---

*Phase: 06-in-page-chat-tool-wiring*
*Completed: 2026-05-19*
