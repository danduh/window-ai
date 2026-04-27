---
slug: uat-04-chrome-147-tool-calling
status: cannot-resolve-deferred
trigger: "User reopened UAT-04 deferral. Goal: get in-page LanguageModel tool-calling working on Chrome 147.0.7727.117 Canary so the AgentDrawer can directly invoke RECIPE_TOOLS handlers when the user types 'scale to 6 and swap milk for oat milk'."
created: 2026-04-27
updated: 2026-04-27
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

## Goal

Restore the in-page agent's tool-calling capability so UAT-04's canonical demo works:
> Type *"scale to 6 and swap milk for oat milk"* into the AgentDrawer → model calls `scaleRecipe` + `swapIngredient` → recipe view updates live.

## Hypotheses to test (in order, cheapest first)

1. **`responseFormat: schema` activates Chrome 147's tool-use** (the only known-working precedent in this repo). ToolCallingPage.tsx ships this shape; if `/tool-calling` works on the user's 147 Canary, this is the right path.
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

hypothesis: Chrome 147's `LanguageModel.create({ tools })` requires `responseFormat: schema` to activate tool-use mode (the W3C `expectedInputs/expectedOutputs` shape may not yet be implemented in 147).
test: Restore tool-passing in AgentDrawer, mirror ToolCallingPage's pattern verbatim — `responseFormat: { type: 'object', required: ['toolName'], properties: { toolName: { type: 'string' } } }` + `tools: adaptedTools`. Drop `expectedInputs/expectedOutputs`. Compare side-by-side with ToolCallingPage line-by-line.
expecting: AgentDrawer creates session cleanly. `session.prompt("scale to 6")` returns either `{toolName: "scaleRecipe", ...}` (Chrome auto-invokes execute) or natural text (Chrome supports tool-calling without responseFormat). Either way: a clear runtime answer.
next_action: AWAITING USER ANSWER — does `/tool-calling-demo` work on Chrome 147 Canary today? That single answer determines whether the responseFormat pattern is viable on this build.
reasoning_checkpoint: 2026-04-27 — verified ToolCallingPage.tsx ships `LanguageModel.create({ responseFormat: schema, initialPrompts, tools: [{ name, description, inputSchema, execute }] })` (lines 22-32 + 170-188). NO `expectedInputs/expectedOutputs`. Schema has `required: ['toolName']` and a single `toolName: string` property. This is the only repo precedent for Chrome AI tool-use; if it works on user's 147 build, AgentDrawer can mirror it verbatim. If it does NOT work on 147, no static-analysis path remains and the pivot in 6fd7077 stands.
tdd_checkpoint:

## Evidence

- timestamp: 2026-04-27 — read ToolCallingPage.tsx; confirmed exact create() shape (no expectedInputs/expectedOutputs, uses responseFormat with required:[toolName]).
- timestamp: 2026-04-27 — read AgentDrawer.tsx (current, post-pivot 6fd7077); confirmed tools/adapter imports + ToolCallIndicator + reducer all stripped out. SYSTEM_PROMPT now points users at the Tool Inspector instead of attempting tool calls.
- timestamp: 2026-04-27 — read git show 489093e:AgentDrawer.tsx (last tools-enabled version); have full pre-pivot source to restore from. Pre-pivot used expectedInputs/expectedOutputs shape (FAILED) — restoration must replace that with responseFormat shape from ToolCallingPage.
- timestamp: 2026-04-27 — `dom-chromium-ai.d.ts` does NOT declare `responseFormat` on `LanguageModelCreateOptions`. ToolCallingPage's session is typed `useState<any>` so it slips by. AgentDrawer types its session as `LanguageModel | null` — passing `responseFormat` will require either widening the ambient type or a localized cast at the create() call.

## Eliminated

(carried over from prior session — confirmed inert hypotheses)
- "Plain `expectedInputs/expectedOutputs` per W3C spec works on Chrome 147" — FAILED (commit 6da81c3 + 489093e).
- "Calling availability() with same options as create() unblocks the device-side check" — FAILED (commit 489093e).
- "Tool-use feature flag is the gating issue" — DISPROVED (user confirmed all flags on, /chat works).

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
  was an over-spec relative to the canonical pattern — there is no upstream
  precedent for in-page tool-use chat. ToolCallingPage.tsx works on the
  user's Canary, but with simple inputSchemas and a different overall
  architectural posture (it's its own demo, not layered on WebMCP). The
  AgentDrawer + WebMCP combination triggers some interaction that Chrome 147
  doesn't yet support.
fix: |
  REVERTED to plain LanguageModel AgentDrawer (commit 0e1a4be — same shape
  as 6fd7077). The drawer is conversational only; recipe tool execution
  flows through the WebMCP path (navigator.modelContext + Tool Inspector)
  which is the canonical design pattern AND the path UAT-02 / UAT-03 / UAT-05
  all confirmed working.
  
  Followups when Chrome ships stable LanguageModel.create({ tools }) (likely
  Chrome 148+ when the W3C Prompt API spec lands cleanly):
  - Re-test in a fresh debug session.
  - Restore the tools-passing AgentDrawer (the `c01cab9` shape was correct on paper).
  - Use sanitizeInputSchema if strict-schema rejection is still happening.
verification: |
  - npx nx typecheck chat — green
  - npx nx build chat — green
  - User runtime-tested 5 fix iterations on /webmcp; all 5 surfaced "Tool use feature is not enabled" or "device unable to create a session"
  - User confirmed /tool-calling-demo works on same Canary (proves Chrome 147's tool-use isn't entirely broken — there's something specific about WebMCP+LanguageModel coexistence)
files_changed:
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx (reverted to plain LanguageModel — commit 0e1a4be)
  - chat/src/app/services/toolAdapter.ts (sanitizeInputSchema removed — reverted to pre-1a76f7e)
  - chat/src/app/types/dom-chromium-ai.d.ts (responseFormat?: object addition kept — harmless and forward-useful)
