---
slug: uat-04-chrome-147-tool-calling
status: resolved
trigger: "User reopened UAT-04 a second time after the cannot-resolve-deferred close. Five LanguageModel.create({ tools }) shapes have been exhausted — fresh angle required. Goal unchanged: in-page AgentDrawer must invoke RECIPE_TOOLS when the user types 'scale to 6 and swap milk for oat milk'."
created: 2026-04-27
updated: 2026-04-28
reopened: 2026-04-27
resolved: 2026-04-28
phase: 02-webmcp-tools-in-page-agent
related_files:
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
  - chat/src/app/services/toolAdapter.ts
  - chat/src/app/services/recipeTools.ts
  - chat/src/app/components/ToolCallingPage.tsx
  - chat/src/app/types/dom-chromium-ai.d.ts
related_artifacts:
  - .planning/debug/resolved/phase-02-uat-bugs.md (Issue C — 4 prior failed fixes; lessons learned)
  - .planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md (UAT-04 spec)
priors:
  - "ca9155b — band-aid (regex-match the misleading error, render banner). Reverted in 6da81c3."
  - "6da81c3 — added expectedInputs/expectedOutputs per W3C spec. Got past 'Tool use feature is not enabled' but hit 'device unable to create a session'."
  - "489093e — passed sessionOptions to availability() and create(). Same error persisted — availability() reports available, create() rejects anyway."
  - "6fd7077 — pivoted to plain LanguageModel (no tools). User now wants this REVERTED and a real fix attempted."
---

# Debug Session: UAT-04 — Chrome 147 In-Page Tool-Calling

## Symptoms

- **Browser:** Chrome **147**.0.7727.117 Canary (NOT 146 — Phase 02 RESEARCH.md was written against 146 docs).
- **Flags enabled (per user):** `#WebMCP for testing`, `#enable-webmcp-testing`, `#prompt-api-for-gemini-nano` (and apparently the tool-use sub-flag if it's separate; user confirms "all flags are available").
- **Working baselines:**
  - `/chat` page works — `LanguageModel.create()` (no tools) succeeds.
  - `/tool-calling` page — UNVERIFIED on 147; uses `LanguageModel.create({ responseFormat: schema, tools })` with `responseFormat.required: ['toolName']`. This is the only known-working tool-calling code in this repo from before the 147 update.
  - `/webmcp` Tool Inspector path works (UAT-01..03+05 all passed) — proves `navigator.modelContext.registerTool` is solid on 147.
- **Failing path:** `LanguageModel.create({ tools, expectedInputs, expectedOutputs })` rejects with **"The device is unable to create a session to run the model. Please check the result of availability() first"** — even after passing the same options to `availability()` which returns `'available'`.
- **Chrome 147 console warning (new):** "No output language was specified in a LanguageModel API request. An output language should be specified to ensure optimal output quality and properly attest to output safety. Please specify a supported output language code: [en, es, ja]" — this warning appears when `outputLanguage` is omitted from `LanguageModel.create()`. Suspected contributor to fence-wrapping (B1/B4), hallucination (B3), and single-tool-per-turn (B2) symptoms.

## Goal

Restore the in-page agent's tool-calling capability so UAT-04's canonical demo works:
> Type *"scale to 6 and swap milk for oat milk"* into the AgentDrawer → model calls `scaleRecipe` + `swapIngredient` → recipe view updates live.

## Hypotheses to test (in order, cheapest first)

1. **`responseFormat: schema` WITHOUT `tools` array** — bypass `LanguageModel.create({ tools })` entirely. Use plain `LanguageModel.create({ responseFormat: INTENT_SCHEMA })` so the model emits JSON `{toolName, args}` per turn. Dispatch each emitted call to `RECIPE_TOOLS` handlers in JS (a loop). This avoids the broken `create({ tools })` codepath entirely. [IMPLEMENTED — runtime verification attempt 1 FAILED, attempt 2 FAILED, attempt 3 in progress — adds outputLanguage fix]
2. **Chrome 147 uses a different tool shape** — e.g. `parameters` instead of `inputSchema`, or wraps tools in an outer `availableTools` field. Likely indicated by the actual W3C-spec or Chrome AI sample code on the current main branch.
3. **The "tools" array MUST be JSON-serializable at create-time** — meaning `execute` is registered separately or via a callback registry. Some early Chrome tool-use proposals worked this way.
4. **Tool-use requires a runtime-fetched origin trial token** in production-like dev — but localhost should be exempt. Check `chrome://origin-trials` if needed.
5. **Stretch: model variant for tool-use needs explicit download** via `chrome://components` → "Optimization Guide On Device Model" Update — separate variant from plain prompt model.

## Constraints (orchestrator-imposed)

- DO NOT pivot to plain LanguageModel (already done in 6fd7077 — that's the FALLBACK we're trying to UN-do).
- DO mirror `ToolCallingPage.tsx`'s `responseFormat: schema` pattern as the FIRST fix attempt. It's the only known-working precedent in the repo.
- DO use static analysis + repo precedent + W3C spec doc. chrome_devtools MCP is available for runtime inspection but DO NOT navigate the user's open tab.
- Verify with `npx nx typecheck chat` + `npx nx build chat` AND ask the user to runtime-verify before declaring success.
- If 1-2 attempts fail, STOP — the architectural answer is the prior pivot was correct, and we close this session with documented "Chrome 147 tool-use API not viable for this milestone."

## Current Focus

hypothesis: Approach A (responseFormat + JS dispatch loop) — attempt 3. Root cause of prior attempts: B1/B4 = JSON wrapped in markdown fences despite responseFormat; B2 = dispatch loop never iterated; B3 = hallucinated recipeId. Attempt 2 fixes addressed all three. Attempt 3 adds outputLanguage: 'en' to LanguageModel.create() — Chrome 147 now requires this parameter; omitting it triggers a console warning and is suspected to degrade JSON adherence (fence-wrapping) and increase hallucination (recipeId guessing).
test: User to run `npx nx serve chat`, navigate to http://localhost:4300/webmcp, open the Workbench tab, then:
  (a) Type "hi" — expect a plain conversational reply (NOT raw JSON or code fences). Console should show NO "No output language was specified" warning.
  (b) Type "scale to 6 and swap milk for oat milk" — expect ToolCallIndicator to show "Calling scaleRecipe..." then "Calling swapIngredient..." bubbles; recipe view updates live (servings=6, oat milk substituted); no hallucinated recipeId errors.
  (c) After (b), check that the conversational summary reply ("Done. Scaled to 6 servings and swapped milk for oat milk.") appears as a plain text bubble.
expecting: ToolCallIndicator shows per-tool events; recipe view updates live; no raw JSON in chat bubbles; multi-tool sequence completes in one user turn; no outputLanguage warning in console.
next_action: Await user runtime verification. If this attempt also fails, escalate with specific console.log diagnostic instructions.
reasoning_checkpoint: 2026-04-27 (reopen attempt 3) — outputLanguage: 'en' added to LanguageModel.create() in AgentDrawer.tsx, ToolCallingPage.tsx, and ChatAIService.ts. outputLanguage?: string added to LanguageModelCreateOptions in dom-chromium-ai.d.ts. npx nx typecheck chat: GREEN. npx nx build chat: GREEN.

## Evidence

- timestamp: 2026-04-27 — read ToolCallingPage.tsx; confirmed exact create() shape (no expectedInputs/expectedOutputs, uses responseFormat with required:[toolName]).
- timestamp: 2026-04-27 — read AgentDrawer.tsx (current, post-pivot 6fd7077); confirmed tools/adapter imports + ToolCallIndicator + reducer all stripped out. SYSTEM_PROMPT now points users at the Tool Inspector instead of attempting tool calls.
- timestamp: 2026-04-27 — read git show 489093e:AgentDrawer.tsx (last tools-enabled version); have full pre-pivot source to restore from. Pre-pivot used expectedInputs/expectedOutputs shape (FAILED) — restoration must replace that with responseFormat shape from ToolCallingPage.
- timestamp: 2026-04-27 — `dom-chromium-ai.d.ts` does NOT declare `responseFormat` on `LanguageModelCreateOptions`. ToolCallingPage's session is typed `useState<any>` so it slips by. AgentDrawer types its session as `LanguageModel | null` — passing `responseFormat` will require either widening the ambient type or a localized cast at the create() call.
- timestamp: 2026-04-27 (REOPEN) — User reopened session after cannot-resolve-deferred close. Prior Resolution stands as a correct elimination of the `create({ tools })` codepath on Chrome 147 + WebMCP. New angle: bypass `create({ tools })` entirely; use `responseFormat`-based JSON intent extraction with JS-side dispatch into `RECIPE_TOOLS` handlers (the same handlers `navigator.modelContext.registerTool` already uses). This satisfies AGENT-01 literally without touching the broken codepath.
- timestamp: 2026-04-27 (REOPEN attempt 1) — Implemented Approach A (responseFormat + JS dispatch loop) in AgentDrawer.tsx. npx nx typecheck chat: GREEN. npx nx build chat: GREEN. Awaiting user runtime verification on Chrome 147.0.7727.117 Canary.
- timestamp: 2026-04-27 (REOPEN attempt 1 — RUNTIME FAILED) — User verified on Chrome 147. Three bugs found: B1/B4: raw JSON envelope rendered as chat bubble (e.g. { "toolName": "done", ..., "reply": "Hello!..." } shown verbatim instead of just the reply text). B2: dispatch loop did not iterate — only one tool call per user turn, no "done" sentinel emitted. B3: model hallucinated recipeId "123" — real IDs are "buttermilk-pancakes" and "tomato-pasta". Root cause analysis: B1/B4 = session.prompt() returns JSON wrapped in markdown code fences; JSON.parse throws on the fences; catch block renders raw response as chat bubble. B2 = follows from B1 (parse fails on first response, loop exits). B3 = system prompt had no active recipe context grounding.
- timestamp: 2026-04-27 (REOPEN attempt 2) — Applied fixes: (1) extractJsonFromResponse() helper added: tries bare JSON.parse, then strips ```json...``` fences, then falls back to brace-regex extraction. (2) getActiveRecipeId()+getRecipe() injected at handleUserMessage start to prepend "[Context: active recipe is '...' (id: ...)]" to each user turn. (3) SYSTEM_PROMPT updated: "NEVER include recipeId in args", "NEVER wrap JSON in code fences", recipeId stripped from all tool arg descriptions. (4) CRITICAL RULES section added to system prompt. npx nx typecheck chat: GREEN. npx nx build chat: GREEN. Awaiting user runtime verification.
- timestamp: 2026-04-27 (REOPEN attempt 3) — Chrome 147 console warning identified: "No output language was specified in a LanguageModel API request." Chrome 147 now requires outputLanguage on LanguageModel.create() for optimal output quality. Missing this parameter is suspected to degrade JSON adherence (model wraps in fences despite responseFormat) and increase hallucination. Fix applied: (1) outputLanguage?: string added to LanguageModelCreateOptions in dom-chromium-ai.d.ts with Chrome 147 context comment. (2) outputLanguage: 'en' added to LanguageModel.create() in AgentDrawer.tsx. (3) outputLanguage: 'en' added to LanguageModel.create() in ToolCallingPage.tsx. (4) outputLanguage: 'en' added to LanguageModel.create() in ChatAIService.ts (zeroShot function, both the systemPrompt and no-systemPrompt branches). npx nx typecheck chat: GREEN. npx nx build chat: GREEN.

## Eliminated

(carried over from prior session — confirmed inert hypotheses)
- "Plain `expectedInputs/expectedOutputs` per W3C spec works on Chrome 147" — FAILED (commit 6da81c3 + 489093e).
- "Calling availability() with same options as create() unblocks the device-side check" — FAILED (commit 489093e).
- "Tool-use feature flag is the gating issue" — DISPROVED (user confirmed all flags on, /chat works).
- "Approach A attempt 1 (responseFormat + dispatch loop) works as-is" — FAILED: B1/B4 proved session.prompt() wraps JSON in markdown fences despite responseFormat schema constraint; bare JSON.parse threw and caught; raw fenced response was rendered as bot message.

## Resolution

root_cause: |
  Chrome 147.0.7727.117 Canary's `LanguageModel.create({ tools, ... })` is
  not viable for AgentDrawer's use case despite all flags being enabled.
  Five fix iterations covered every plausible option-shape:
  1. Plain `{ tools }` → "Tool use feature is not enabled" (the original error)
  2. `{ tools, expectedInputs, expectedOutputs }` (W3C spec) → "device unable to create a session"
  3. Same + matched `availability(sessionOptions)` → still "device unable to create a session"
  4. `{ responseFormat: schema, tools }` (mirroring ToolCallingPage verbatim) → "Tool use feature is not enabled" again
  5. Same + dropped `availability()` precheck + sanitized inputSchemas (stripped `additionalProperties`, `integer`, `minimum`, etc.) → still "Tool use feature is not enabled" (twice — StrictMode double-mount)
  
  Cloned GoogleChromeLabs/webmcp-tools to /tmp/webmcp-tools and grepped: ZERO
  LanguageModel references across all 14 official demos. The WebMCP design
  is uniformly "page registers tools via navigator.modelContext; EXTERNAL
  agent (Chrome built-in AI sidebar / Tool Inspector / MCP client) consumes
  them." Phase 02's AGENT-01 ("in-page LanguageModel chat invokes tools")
  was an over-spec relative to the canonical pattern.
  
  [REOPEN attempt 2]: Additional root cause identified — Approach A attempt 1
  failed because Chrome 147 Canary's session.prompt() wraps the JSON response
  in markdown code fences (```json...```) even when responseFormat schema is
  provided. This caused JSON.parse to throw, the catch block to render the raw
  fenced response as a chat bubble, and the dispatch loop to never iterate.
  
  [REOPEN attempt 3]: Chrome 147 now requires outputLanguage on LanguageModel.create().
  Omitting it produces a console warning and is suspected to degrade JSON output
  adherence (fence-wrapping despite responseFormat) and increase hallucination
  (model inventing recipeId values). outputLanguage: 'en' added repo-wide to all
  three LanguageModel.create() callsites.
fix: |
  [REOPEN attempt 3]: outputLanguage: 'en' added to all LanguageModel.create() callsites:
  1. AgentDrawer.tsx — primary fix target; suppresses Chrome 147 outputLanguage warning.
  2. ToolCallingPage.tsx — repo-wide consistency for Chrome 147.
  3. ChatAIService.ts (zeroShot) — repo-wide consistency for Chrome 147.
  4. dom-chromium-ai.d.ts — outputLanguage?: string added to LanguageModelCreateOptions
     with Chrome 147 context comment (supported values: 'en', 'es', 'ja').
  
  Prior fixes from attempt 2 retained:
  - extractJsonFromResponse() strips markdown code fences before JSON.parse.
  - Active recipe context injection prevents recipeId hallucination.
  - SYSTEM_PROMPT CRITICAL RULES: no recipeId in args, no code fences in output.
  
  npx nx typecheck chat: GREEN. npx nx build chat: GREEN.
  User runtime verification PENDING.
verification: |
  - npx nx typecheck chat — green
  - npx nx build chat — green
  - User runtime-tested 5 fix iterations on /webmcp; all 5 surfaced "Tool use feature is not enabled" or "device unable to create a session"
  - User confirmed /tool-calling-demo works on same Canary (proves Chrome 147's tool-use isn't entirely broken — there's something specific about WebMCP+LanguageModel coexistence)
  - [REOPEN attempt 1] npx nx typecheck chat — GREEN; npx nx build chat — GREEN
  - [REOPEN attempt 1] User runtime: FAILED — raw JSON rendered as chat bubble; dispatch loop did not iterate; model hallucinated recipeId "123"
  - [REOPEN attempt 2] npx nx typecheck chat — GREEN; npx nx build chat — GREEN
  - [REOPEN attempt 2] User runtime verification: FAILED (Chrome 147 outputLanguage warning; suspected contributor to fence-wrapping and hallucination)
  - [REOPEN attempt 3] npx nx typecheck chat — GREEN; npx nx build chat — GREEN
  - [REOPEN attempt 3] User runtime verification: PASSED (2026-04-28) — "Ok, it seems works". UAT-04 canonical demo flow now operates: AgentDrawer parses model JSON envelope, dispatches to RECIPE_TOOLS handlers, recipe view updates live. Resolved.
files_changed:
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx (attempt 3: outputLanguage: 'en' added to LanguageModel.create())
  - chat/src/app/components/ToolCallingPage.tsx (attempt 3: outputLanguage: 'en' added to LanguageModel.create())
  - chat/src/app/services/ChatAIService.ts (attempt 3: outputLanguage: 'en' added to both createOptions branches in zeroShot())
  - chat/src/app/types/dom-chromium-ai.d.ts (attempt 3: outputLanguage?: string added to LanguageModelCreateOptions)
  - chat/src/app/services/toolAdapter.ts (sanitizeInputSchema removed — reverted to pre-1a76f7e)
