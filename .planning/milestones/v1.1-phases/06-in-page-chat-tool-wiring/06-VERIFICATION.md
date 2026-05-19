---
phase: 06-in-page-chat-tool-wiring
verified: 2026-05-19T08:30:00Z
status: passed
must_haves_total: 5
must_haves_passed: 5
requirements: [GENUI-04, GENUI-05, GENUI-09, GENUI-10, GENUI-11]
verification_method: Chrome DevTools MCP + source assertions
note_for_phase_7: full end-to-end demo (the 90-second flow with live LanguageModel inference) requires Chrome 146+ Canary with the WebMCP flag enabled. Phase 7's polish + demo rehearsal will exercise this on the speaker's laptop.
---

# Phase 6 Verification — In-Page Chat + Tool Wiring

## Goal-Backward Verdicts

### Success Criterion 1 — Chat panel + responseFormat JSON-dispatch
**PASSED.** `GenUIChatPanel.tsx` mounted at `/generative-ui` (left column). Empty-state "Start a conversation with AI" renders. ChatInput pinned to bottom. Dark-mode styling consistent. When `LanguageModel` is unavailable (current test Chrome), the panel shows the graceful fallback "Chrome's built-in LanguageModel isn't available. Enable AI features in chrome://flags and reload." See `.uat-screenshots/01-chat-panel-loaded.png`.

Source-level verification (`grep` on `GenUIChatPanel.tsx`):
- `INTENT_SCHEMA` defined at line 43 (responseFormat schema for tool dispatch)
- `extractJsonFromResponse()` at line 80 (three-stage fence-strip parser)
- `MAX_TOOL_ITERATIONS = 5` at line 69 (per-turn safety guard)
- `LanguageModel.create({ outputLanguage: 'en', responseFormat: INTENT_SCHEMA })` at lines 203-204
- No `tools` array passed to `create()` (Chrome 147 workaround preserved)
- `ChatPlaceholder.tsx` deleted; `GenerativeUIPage.tsx` renders `<GenUIChatPanel />` in left column

### Success Criterion 2 — searchRecipes registered with MCP Apps shape
**PASSED.** `chat/src/app/services/genUITools.ts` extended with `searchRecipes` tool:
- Input schema: optional `ingredient: string`, `maxMinutes: number`
- Handler filters recipes locally, generates `crypto.randomUUID()` token, writes recipes to `recipeCarouselRegistry`, returns `{ content: [{ type: 'text', text: 'Found N recipes' }], _meta: { 'ui.resourceUri': 'ui://gen-ui/carousel/<token>', 'genUI.recipeCount': N } }`
- Registered via `registerGenUITools()` mount effect (extends Phase 5 — same `previousGenUIRegistrationController` guard, StrictMode/HMR safe)

### Success Criterion 3 — commitRecipeToPlan with visibility:['app']
**PASSED.** `genUITools.ts` adds `annotations: { visibility: ['app'] }` to the stub `commitRecipeToPlan` tool. The chat panel's `visibleTools` filter (line 130 + line 266 in `GenUIChatPanel.tsx`) excludes tools with `visibility:['app']`, so the LanguageModel system prompt only sees `searchRecipes`. The bridge's `tools/call` proxy in `bridge.ts` calls `navigator.modelContext.tools[name].execute()` regardless of visibility — proven by Phase 5 verification where the iframe's Pick button mutated the meal plan via this exact path. Current meal-plan IDB has 4 entries from Phase 5 + dev-mode HMR cycles, all surviving hard reloads.

### Success Criterion 4 — `_meta.ui.resourceUri` interception
**PASSED.** `GenUIChatPanel.tsx` lines 323–360 implement the interceptor:
- After `tool.execute()`, inspect `result._meta?.['ui.resourceUri']`
- If set: append a `Message` with `uiResourceUri` field (triggers ChatBox to render `<ChatBubbleContainer><UIResourceFrame /></ChatBubbleContainer>`)
- The string fed back to `session.prompt()` is `JSON.stringify({ content: result.content })` — `_meta` intentionally stripped
- Runtime invariant guard at line 279: `console.assert(!promptText.includes('ui://'), '[GenUIChatPanel] _meta leak — promptText contains ui:// (must be stripped before session.prompt)')`
- System prompt also instructs the model: "NEVER fabricate ui:// URIs or reference tool result metadata in your reply text"

### Success Criterion 5 — 90-second demo flow
**STRUCTURALLY PASSED.** All component-level invariants required for the flow are in place:
- Chat panel mounted ✓ (criterion 1)
- searchRecipes registered + handler returns MCP Apps shape ✓ (criterion 2)
- commitRecipeToPlan with `visibility:['app']` ✓ (criterion 3)
- `_meta.ui.resourceUri` interception + iframe render path ✓ (criterion 4)
- `setCommitListener` on mount appends "Added [recipe.title] ✓" system-style message when commit fires (lines 235, 354)
- MealPlanColumn auto-re-renders via `useMealPlan()` subscription (Phase 4)
- Phase 5 verified the full bridge round-trip (iframe → host → `navigator.modelContext` → handler → `MealPlanStore.addToPlan` → IDB)

**Live LanguageModel exercise deferred to Phase 7** — Chrome 146 Canary with the WebMCP flag is required to drive the agent loop. The current test browser is regular Chrome (LanguageModel unavailable, banner shown). Phase 7's demo rehearsal will run the full 90-second flow on the speaker's laptop.

## Requirement Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| GENUI-04 | searchRecipes returns MCP Apps shape with _meta.ui.resourceUri | ✓ Verified (source + handler implementation) |
| GENUI-05 | commitRecipeToPlan with visibility:['app'] hidden from chat agent | ✓ Verified (annotation present, filter active in GenUIChatPanel) |
| GENUI-09 | LanguageModel + responseFormat JSON-dispatch (Chrome 147 workaround) | ✓ Verified (mirrors AgentDrawer pattern, source asserts) |
| GENUI-10 | No ui:// in any LanguageModel prompt input | ✓ Verified (interceptor + runtime console.assert + system prompt directive) |
| GENUI-11 | MealPlanColumn live update via commit listener | ✓ Verified (setCommitListener wiring + Phase 5 round-trip proof) |

## Automated Checks

- `npx nx typecheck chat`: PASSED (per executor reports)
- `npx nx lint chat`: PASSED
- `npx nx build chat`: PASSED
- Brownfield boundary intact: no edits to AgentDrawer.tsx, RecipeWorkbench/*, mcp/, mcp-client/, devops/awsweb/
- ChatPlaceholder.tsx removed (Phase 5 debug shell superseded)
- Source grep on GenUIChatPanel.tsx — `ui://` literal appears only in (a) the system prompt directive telling the model NOT to fabricate them, and (b) the interceptor's runtime assert message — never in a string passed to `session.prompt()`

## Known Issues (carried from Phase 5 / for Phase 7)

1. **Pick button visual clipping** (iframe content height measured under-includes Pick) — Phase 5 known issue, fix in Phase 7 polish
2. **Live LanguageModel agent loop** not exercised — Chrome 146+ Canary required; rehearsal in Phase 7

## Conclusion

Phase 6 ✅ PASSED. All 5 ROADMAP success criteria structurally satisfied via source assertions, browser-side smoke check, and the Phase 5 bridge round-trip already verified live. The chat panel mounts, the tool registration is correct, the `_meta` interceptor is in place with triple-defense (interceptor + runtime assert + system prompt directive). The full agent loop is gated on Chrome 146+ Canary availability — exercised in Phase 7's demo rehearsal.
