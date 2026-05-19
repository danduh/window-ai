# Phase 6: In-Page Chat + Tool Wiring — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 wires the chat-driven end-to-end demo on `/generative-ui`:
1. New `GenUIChatPanel` in the left column (replaces Phase 5's `ChatPlaceholder` debug trigger) — clones the `AgentDrawer.tsx` responseFormat JSON-dispatch loop pattern
2. Register `searchRecipes` tool via `navigator.modelContext.registerTool` returning a MCP Apps shape result (`{ content, _meta: { 'ui.resourceUri': ... } }`)
3. Add `visibility:["app"]` annotation to `commitRecipeToPlan` (Phase 5 stub) so the chat agent's system prompt doesn't list it but the iframe→host bridge still proxies to it
4. Chat-side interceptor: when a tool result contains `_meta.ui.resourceUri`, render `<ChatBubbleContainer><UIResourceFrame /></ChatBubbleContainer>` in the chat transcript AND substitute a short text summary in the message-history fed back to LanguageModel (the literal URI never appears in any model prompt)
5. On `commitRecipeToPlan` execution, the chat appends a system-style message "Added [recipe title] ✓" — confirms in text per criterion 5 without another LanguageModel inference
6. The full 90-second demo flow runs on Chrome 146 Canary: user types recipe query → carousel renders in chat → click Pick → MealPlanColumn updates → chat confirms

Out of scope: docs route + markdown (Phase 7), 90s demo polish + zero-network DevTools kicker rehearsal (Phase 7), Pick button visual clipping fix (Phase 7 polish item from Phase 5 verification).

</domain>

<decisions>
## Implementation Decisions

### Chat panel architecture
- **Clone the AgentDrawer pattern** into a new component `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx`. DO NOT touch `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (brownfield). The clone preserves: `INTENT_SCHEMA` for responseFormat, `extractJsonFromResponse()` strip-fence helper, MAX_TOOL_ITERATIONS = 5 safety guard, dark-mode-compatible message rendering.
- **Reuse** `ChatBox`, `ChatInput`, and `Message` type/component verbatim from `chat/src/app/components/`. The `Message` type gains an optional `uiResourceUri?: string` field (additive — does not break v1.0 consumers because the field is optional). Edit `chat/src/app/components/ChatBox.tsx` to check for `uiResourceUri` and render the iframe slot instead of `<Markdown>` when present.
- **System prompt tool list** — only includes tools WITHOUT `visibility:["app"]` (filtered). For Phase 6 this means only `searchRecipes` appears. `commitRecipeToPlan` is hidden from the model entirely.
- **Placement on screen** — left column, replacing the `ChatPlaceholder` debug trigger from Phase 5. The chat takes the full left column: messages above (scrollable), input pinned to the bottom. Right column meal-plan remains unchanged.
- **Phase 5 debug trigger removed** — `ChatPlaceholder.tsx`'s "Show demo carousel" button + render code are deleted in Phase 6. The component itself may be deleted or repurposed.
- **`MAX_TOOL_ITERATIONS = 5`** per user turn matches AgentDrawer; after 5 iterations the chat force-emits a final summary based on whatever data was collected.

### searchRecipes handler + resource URI flow
- **Input schema:** `{ type: 'object', properties: { ingredient: { type: 'string' }, maxMinutes: { type: 'number' } }, required: [] }` — both optional. Empty/missing args returns all 12 recipes; `ingredient` filters by `searchableIngredients` (lowercase contains); `maxMinutes` filters by `totalMinutes <= max`.
- **Handler implementation:**
  1. Call `RecipePersistence.getRecipes()` and apply local filters
  2. Generate `token = crypto.randomUUID()`
  3. Store `recipeCarouselRegistry.set(token, recipes)` in a module-scope `Map<string, Recipe[]>` in `chat/src/app/services/recipeCarouselRegistry.ts` (new file)
  4. Return `{ content: [{ type: 'text', text: 'Found ${recipes.length} recipes' }], _meta: { 'ui.resourceUri': 'ui://gen-ui/carousel/${token}', 'genUI.recipeCount': recipes.length } }`
- **Token TTL:** entries cleared on `window.beforeunload` (page nav). Phase 6 does not implement TTL — for a 90-second demo single-page session, infinite-memory is fine. Phase 7 polish may add LRU if memory becomes a concern.
- **Chat panel interceptor:** the AgentDrawer pattern's tool-dispatch closure inspects the tool result. If `result._meta?.['ui.resourceUri']` is set:
  1. Append a Message to the transcript with `{ role: 'assistant', uiResourceUri: result._meta['ui.resourceUri'], text: result.content[0].text }` — the `text` becomes the chat bubble's caption
  2. For the NEXT LanguageModel turn, the tool-result message fed back to the model is `JSON.stringify({ content: result.content })` — `_meta` is stripped. The model sees only `'Found N recipes'`.

### Iframe rendering in the chat transcript + commit flow
- **Message type extension:** add `uiResourceUri?: string` to `chat/src/app/components/ChatBox.tsx`'s `Message` interface (additive optional field). When set, the message renders `<ChatBubbleContainer><UIResourceFrame html={...} tools={GEN_UI_TOOLS} /></ChatBubbleContainer>` instead of `<Markdown>{message.text}</Markdown>`.
- **Recipe lookup from URI:** the renderer parses the token from `ui://gen-ui/carousel/<token>`, calls `recipeCarouselRegistry.get(token)` to retrieve the recipes, then calls `renderCarouselHTML(recipes)` (Phase 5 helper) to generate the iframe srcdoc.
- **`commitRecipeToPlan` visibility annotation:** update `GEN_UI_TOOLS` in `chat/src/app/services/genUITools.ts` to include `annotations: { visibility: ['app'] }` on the stub tool. Update the chat panel's tool-list-for-prompt generator to filter out tools with `visibility:['app']`. Verify type ambient declaration in `webmcp.d.ts` supports `annotations.visibility` per W3C draft.
- **In-text confirmation on commit:** `wrapToolsWithEvents()` already emits `ToolCallEvent`s when tools fire. Phase 6 adds a chat-side subscriber: when a `tool:completed` event fires for `commitRecipeToPlan`, the chat appends a system-styled message `"Added ${recipeTitle} to your meal plan ✓"` (resolve recipeId → recipe.title via `RecipePersistence.getRecipe(recipeId)`). This avoids re-prompting the model and meets criterion 5's "chat agent confirms in text".
- **The bridge's `tools/call` proxy** in `bridge.ts` calls `navigator.modelContext.tools[name].execute()` regardless of `annotations.visibility` — visibility is a model-facing concern, not a registry concern. No changes to bridge.ts.

### System prompt
The chat panel's system prompt is similar to AgentDrawer's but tool list is filtered. Structure:
- Role: "You are a recipe assistant inside the user's browser. You have access to one tool to search recipes."
- Tool list: only `searchRecipes` with description + input schema (no commitRecipeToPlan)
- Format example: `{ "toolName": "searchRecipes", "args": { "ingredient": "chicken", "maxMinutes": 30 } }` or `{ "toolName": "done", "reply": "..." }`
- Behavior rules: call ONE tool per turn, then wait for result; after tool results arrive emit `{ toolName: 'done', reply: '...' }` with a one-sentence summary; if the user asks for something the tool can't do, emit `done` with an explanation.

### Module / file layout
- New: `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` — the chat component
- New: `chat/src/app/services/recipeCarouselRegistry.ts` — `Map<token, Recipe[]>` lookup + `setRecipes`/`getRecipes`/`clearRecipes` helpers
- Modified: `chat/src/app/services/genUITools.ts` — add `searchRecipes` tool, add `visibility:['app']` annotation to `commitRecipeToPlan`
- Modified: `chat/src/app/components/ChatBox.tsx` — add optional `uiResourceUri` field on `Message`, render iframe slot when set
- Modified: `chat/src/app/components/GenerativeUIPage.tsx` — replace `<ChatPlaceholder>` with `<GenUIChatPanel>` in the left column
- Deleted (or substantially gutted): `chat/src/app/components/GenerativeUI/ChatPlaceholder.tsx` — Phase 5's debug shell is no longer needed
- Modified: `chat/src/app/types/webmcp.d.ts` — verify `annotations.visibility?: string[]` type is declared (additive if missing)

### Claude's Discretion
- Exact system prompt copy — planner authors a tight ~10-line prompt
- "Added X ✓" exact wording — planner picks
- Whether to delete ChatPlaceholder.tsx entirely or keep a minimal stub for future debug entry points — planner picks; if deleted, remove the import from GenerativeUIPage.tsx
- LanguageModel `outputLanguage` parameter — use `'en'` (matches AgentDrawer)
- Token format for resource URI — UUID v4 (`crypto.randomUUID()`) is locked; the leading `ui://gen-ui/carousel/` prefix is locked too

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` (v1.0 — DO NOT EDIT) — clone its responseFormat JSON-dispatch loop, `INTENT_SCHEMA`, `extractJsonFromResponse()` helper, MAX_TOOL_ITERATIONS pattern. The architecture comment at AgentDrawer.tsx:142–149 explains why `LanguageModel.create({tools})` is broken on Chrome 147 — Phase 6 must use the same `responseFormat` workaround.
- `chat/src/app/components/ChatBox.tsx`, `chat/src/app/components/ChatInput.tsx` — reuse verbatim; ChatBox needs the `uiResourceUri` field added to its `Message` type (additive)
- `chat/src/app/components/GenerativeUI/UIResourceFrame.tsx` (Phase 5) — reuse verbatim; takes `html: string` + `tools` prop
- `chat/src/app/components/GenerativeUI/ChatBubbleContainer.tsx` (Phase 5) — reuse verbatim
- `chat/src/app/components/GenerativeUI/iframe/carouselTemplate.ts` (Phase 5) — `renderCarouselHTML(recipes): string` reused by the chat panel
- `chat/src/app/services/genUITools.ts` (Phase 5) — add `searchRecipes` tool, add `visibility:['app']` to commitRecipeToPlan. `previousGenUIRegistrationController` guard stays.
- `chat/src/app/services/toolAdapter.ts` — `wrapToolsWithEvents()` + `ToolCallEvent` already fires on tool execute; subscribe to it for the "Added X ✓" confirmation message
- `chat/src/app/services/RecipePersistence.ts` — `getRecipes()` for the searchRecipes handler; `getRecipe(id)` for resolving recipe titles in the commit confirmation message
- `chat/src/app/services/ChatAIService.ts` — `LanguageModel` ambient + `getModelCapabilities()`/`zeroShot()` helpers (may not be needed; the chat panel creates its own session)
- `chat/src/app/types/dom-chromium-ai.d.ts` — `LanguageModel.create({ responseFormat, outputLanguage })` types
- `chat/src/app/types/webmcp.d.ts` — `ModelContextRegisterToolOptions.annotations` should accept `visibility?: string[]`; verify additive type if missing

### Established Patterns
- **AgentDrawer JSON-dispatch loop** (lines 142–185 area): create session with `responseFormat: INTENT_SCHEMA`, loop calling `session.prompt(messages)`, parse the JSON, dispatch tool or emit final reply, max 5 iterations
- **Tool registration mount effect**: extend the existing Phase 5 `registerGenUITools()` in `chat/src/app/services/genUITools.ts` to register `searchRecipes` alongside the (annotated) `commitRecipeToPlan`. The `previousGenUIRegistrationController` guard handles StrictMode/HMR cleanly.
- **`_meta` interception**: an upper-layer dispatcher reads the tool result, inspects `_meta`, decides chat-side rendering vs LanguageModel-feedback. Same dispatcher exists nowhere yet — Phase 6 adds it inside `GenUIChatPanel.tsx`.
- **Module-scope pub-sub** for cross-component reactivity (used by `MealPlanStore`, `recipeStore`). The `recipeCarouselRegistry` is a plain `Map` — no pub-sub needed since reads happen synchronously on iframe mount.

### Integration Points
- `GenerativeUIPage.tsx` — replace `<ChatPlaceholder />` with `<GenUIChatPanel />` in the left column. Mount-time `registerGenUITools()` effect from Phase 5 stays unchanged but the function now registers BOTH `searchRecipes` and `commitRecipeToPlan`.
- `genUITools.ts` `GEN_UI_TOOLS` array grows from 1 → 2 tools.
- `ChatBox.tsx` `Message` interface gains optional `uiResourceUri?: string` — verify no v1.0 ChatBox consumers break (additive only).
- The Phase 5 `UIResourceFrame` already accepts `html: string` as a prop — no API changes needed.
- `MealPlanColumn.tsx` is unchanged from Phase 4 — automatically re-renders when `commitRecipeToPlan` mutates `MealPlanStore`.

</code_context>

<specifics>
## Specific Ideas

- **The 90-second demo script for criterion 5** is:
  1. User opens `/generative-ui` (cold load)
  2. Types "Find me a 30-minute chicken recipe" and presses Enter
  3. Chat panel calls LanguageModel; model emits `{ toolName: 'searchRecipes', args: { ingredient: 'chicken', maxMinutes: 30 } }`
  4. Chat panel dispatches the tool, gets result with `_meta.ui.resourceUri`
  5. Chat appends an iframe message; carousel renders inside chat bubble (3 chicken recipes ≤30min)
  6. Chat sends tool-result-without-meta back to model; model emits `{ toolName: 'done', reply: 'Here are 3 chicken recipes under 30 minutes.' }`
  7. User clicks Pick on one card; iframe fires JSON-RPC `tools/call` for `commitRecipeToPlan` — bridge proxies; MealPlanStore.addToPlan fires
  8. Chat sees the `tool:completed` event for commitRecipeToPlan; appends system message "Added Lemon Garlic Chicken Skillet to your meal plan ✓"
  9. MealPlanColumn on the right re-renders with the new entry

- **The "resource URI never appears in any prompt sent back to LanguageModel" criterion 4 check** can be verified by Playwright/DevTools: spy on `LanguageModel.prompt()` calls and assert no string starting with `ui://` is in the input. Phase 7 may automate this. Phase 6 ensures it structurally.

- **`outputLanguage: 'en'`** is required per `LanguageModel.create()` to silence the "no output language specified" warning seen in Phase 4 UAT.

- **`visibility:['app']` annotation** is from W3C WebMCP draft — the convention `visibility` is the source of truth (matches MCP Apps spec value lists). If `webmcp.d.ts` doesn't yet have this typed, add it as part of Plan 06-01.

</specifics>

<deferred>
## Deferred Ideas

- Docs route `/generative-ui/docs` + markdown explainer (GENUI-13) → Phase 7
- SEO entry update for docs sub-route → Phase 7
- 90-second demo polish + zero-network DevTools kicker (GENUI-14, GENUI-15) → Phase 7
- Pick button visual clipping (Phase 5 known issue) — fix in Phase 7 polish; iframe content height calculation needs to include card overflow
- Tool-result streaming (currently tool calls return synchronously) — out of v1.1 scope
- Multi-iframe simultaneous rendering (only one iframe in chat at a time) — out of scope per STATE.md
- LRU/TTL for `recipeCarouselRegistry` — out of v1.1 scope; single-page session is fine
- Voice input or richer chat affordances — out of scope

</deferred>
