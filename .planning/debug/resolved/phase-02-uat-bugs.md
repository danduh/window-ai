---
slug: phase-02-uat-bugs
status: resolved
trigger: "Three bugs surfaced during Phase 02 UAT regression sweep — token duplication on /chat, ChatAIService.ts:9 TypeError on LanguageModel.params(), and AgentDrawer 'Tool use feature is not enabled' on /webmcp."
created: 2026-04-27
updated: 2026-04-27
phase: 02-webmcp-tools-in-page-agent
related_files:
  - chat/src/app/services/ChatAIService.ts
  - chat/src/app/components/ChatPage.tsx
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
  - chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx
  - chat/src/main.tsx
related_artifacts:
  - .planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md
  - .planning/debug/webmcp-duplicate-tool-name.md (prior session, status: fixed — user implicitly confirmed by reaching deeper UATs)
---

# Debug Session: Phase 02 UAT Multi-Bug

## Symptoms

User ran the dev server (`npx nx serve chat` → http://localhost:4300) in Chrome 146 Canary with both WebMCP flags + `#prompt-api-for-gemini-nano` Enabled. After the duplicate-tool-name fix landed, three NEW bugs surfaced during regression sweep across `/chat` and `/webmcp`:

### Issue A — `/chat` token duplication
- **Expected:** Streaming chat response renders each token once.
- **Actual:** Every token rendered twice. Concrete example: typing "hi" produced `"HiHi there there!! 👋 👋 HowHow can can I I help help you you today today?? DoDo you you have have a a question question..."`. Each chunk doubled.
- **Suspected cause:** React `<StrictMode>` (active per `chat/src/main.tsx:16`) double-invokes the streaming subscription effect; if the chunk handler appends to a list without identity dedup, both subscribers append.

### Issue B — `/chat` TypeError
- **Expected:** `/chat` page mounts cleanly and queries Gemini Nano capabilities.
- **Actual:** `ChatAIService.ts:9 Uncaught (in promise) TypeError: LanguageModel.params is not a function at getModelCapabilities (ChatAIService.ts:9:30) at ChatPage.tsx:44:5`
- **Suspected cause:** Chrome's built-in `LanguageModel` API has drifted between when this code was written (likely an older Canary that exposed `LanguageModel.params()`) and current Chrome 146 Canary. Per Chrome WebAI docs, the canonical method is now `LanguageModel.availability()` and capabilities-style queries moved to `LanguageModel.capabilities()` or have been folded into `availability()`. Need to read ChatAIService.ts and adapt to the current Canary surface.

### Issue C — `/webmcp` AgentDrawer
- **Expected:** Typing a message into the AgentDrawer creates a `LanguageModel` session WITH tools and dispatches `session.prompt(text)`.
- **Actual:** `[AgentDrawer] Failed to create LanguageModel session: Tool use feature is not enabled` — surfaced via the existing error catch in AgentDrawer.tsx.
- **Suspected cause:** Chrome 146 Canary's `LanguageModel.create({ tools })` requires a separate Origin Trial token OR the `Optimization Guide On Device Model` capability has not yet been built with tool-use support on the user's profile. Tool-use in built-in `LanguageModel` is gated behind a feature flag distinct from the basic prompt API.
  - Fallback strategies: (1) call `LanguageModel.availability()` to detect tool-use capability before `create({tools})`; if unavailable, render the existing `<LanguageModelUnavailable/>` banner with a tools-specific message; (2) optionally fall back to no-tools mode where the agent just chats without tool access (loses the demo's value but at least renders).
  - Phase 02-RESEARCH.md acknowledges this risk in §AGENT-01 — the locked decision was to surface a banner when tools are unavailable rather than silently degrade.

## Current Focus

hypothesis: Three independent bugs that all touch the Chrome built-in LanguageModel API surface — (A) StrictMode-style double-effect in chat streaming, (B) API drift on `LanguageModel.params()`, (C) tool-use feature unavailable in current Canary build → AgentDrawer needs availability detection before `create({tools})`.
test: Read ChatAIService.ts:9 + ChatPage.tsx:44 to confirm A+B; read AgentDrawer.tsx where `LanguageModel.create({tools})` is called; check current Chrome WebAI docs (or chat/src/app/types/dom-chromium-ai.d.ts) for the canonical API surface; consider using chrome_devtools MCP to capture the live error state.
expecting: A localized fix per bug — A: ref-guard or AbortController on the streaming subscription; B: replace `LanguageModel.params()` with `LanguageModel.availability()` or equivalent; C: add availability detection + tools-specific banner.
next_action: REOPENED — Issue C fix was wrong. User confirms (a) regular `/chat` works, (b) all flags ARE on including tool-use. So `LanguageModel.create({ tools })` rejection is NOT a flag/feature-gate problem — it's a wrong API call shape on my side. Investigate the EXACT shape passed to `LanguageModel.create({...})` in AgentDrawer.tsx vs what the existing repo precedent (`ToolCallingPage.tsx` or equivalent) uses. Compare property names, schema field names (`inputSchema` vs `parameters`), and whether `execute` belongs in the create-time payload at all. Then revert/remove the band-aid banner from commit ca9155b and apply the real fix.
reasoning_checkpoint:
tdd_checkpoint:

## Evidence

- timestamp: 2026-04-27T00:00:00Z
  source: static-read
  finding: "ChatPage.tsx:74-79 streaming reducer MUTATES `prevMessages` via `prevMessages.pop()` and mutates `lastMessage.text` in place. Under React StrictMode, the setState updater is invoked TWICE with the same `prev` reference; the first call mutates the object, the second call sees the already-mutated `lastMessage` and concatenates `value` again. Result: every chunk is appended twice. Fix: replace the pop/mutate/push pattern with an immutable map-based update analogous to WriteRewritePage.tsx:67 (`setWrittenContent(prev => prev + value)`)."
- timestamp: 2026-04-27T00:00:01Z
  source: static-read
  finding: "ChatAIService.ts:9 calls `LanguageModel.params()`. The dom-chromium-ai.d.ts:39 declares it as a static method, but Chrome 146 Canary no longer exposes it at runtime — the runtime surface is `LanguageModel.availability()` + `LanguageModel.create()` only. Fix: feature-detect `LanguageModel.params` before calling; fall back to returning `{ available: <availability> }` so the UI's optional `defaultTopK || 'N/A'` displays gracefully."
- timestamp: 2026-04-27T00:00:02Z
  source: static-read
  finding: "AgentDrawer.tsx:113-122 calls `LanguageModel.availability()` (no `tools` option) then `LanguageModel.create({ tools, initialPrompts })`. When the user's Canary build does not have the tool-use feature gate enabled, `create({tools})` throws 'Tool use feature is not enabled'. Per RESEARCH §AGENT-01 the locked decision is to surface a banner. Fix: check `LanguageModel.availability({ tools: [...] })` first and, if it returns 'unavailable', set a NEW state `toolUseUnavailable: boolean` and render the existing `<LanguageModelUnavailable />` banner (or a sibling variant) with tool-use-specific copy — without calling `create({tools})`."
- timestamp: 2026-04-27T00:00:03Z
  source: static-read
  finding: "main.tsx:16 confirms `<StrictMode>` is wrapped around `<AppRouter/>` — the entire app is subject to double-invocation of state updaters in development. The fix to Issue A must be a pure (non-mutating) updater. Other pages (WriteRewritePage.tsx:67, Summary.tsx:57, TranslatePage.tsx:46) already use the canonical `setX(prev => prev + value)` pattern and are unaffected — only ChatPage.tsx uses the buggy pop/push form."
- timestamp: 2026-04-27T00:01:00Z
  source: typecheck
  finding: "`npx nx typecheck chat` → green after the three fixes (had to inline structural types for LMParams + LMAvailability in ChatAIService because the named ambient interfaces declared inside `declare global { ... }` in a script-mode .d.ts are not visible to consumers via indexed-access form — same constraint already documented in toolAdapter.ts:24-29)."
- timestamp: 2026-04-27T00:01:30Z
  source: build
  finding: "`npx nx build chat` → webpack compiled successfully (3.75 MiB main bundle, no warnings related to the patched files)."

## Eliminated

- "Issue A is NOT caused by a duplicate `getReader()` subscription — `addMessage` is called once per response (ChatPage.tsx:103). The doubling is purely the in-place mutation under StrictMode."
- "Issue B is NOT caused by missing types — the `.d.ts` DOES declare `params()`. The drift is purely runtime-vs-declared-type."

## Environment Note (added at closeout)

**Tested on Chrome 147.0.7727.117 Canary**, NOT Chrome 146 as the Phase 02 plan/RESEARCH.md/UAT script assumed. The 146→147 transition is the actual driver of all three bugs touching `LanguageModel`:
- Issue B: `LanguageModel.params()` was a 146-era surface; removed/renamed in 147.
- Issue C resolution path: `LanguageModel.create({ tools, expectedInputs, expectedOutputs })` rejects in 147 even with all flags on AND `availability()` returning `'available'`. After 4 fix iterations the in-page tool-use path was abandoned; AgentDrawer pivoted to plain LanguageModel chat (commit 6fd7077). The canonical webmcp-tools demos (GoogleChromeLabs/webmcp-tools — confirmed by orchestrator inspection) do NOT use an in-page LanguageModel session at all; the WebMCP design is page-registers / external-agent-consumes.

**Lesson for future phases**: pin a single Chrome Canary version in PROJECT.md / RESEARCH.md and verify it via `chrome://version` BEFORE writing the API-shape contracts. The 146→147 step shipped breaking changes to `LanguageModel.params()` and `LanguageModel.create({ tools })` despite both being "experimental" — type definitions in `dom-chromium-ai.d.ts` lag the runtime by at least a Canary release.

## Resolution

root_cause: "Three independent bugs, each touching the Chrome built-in LanguageModel API surface: (A) ChatPage.tsx streaming reducer mutates state in place via `prevMessages.pop()` + `lastMessage.text +=`, which doubles every chunk under React StrictMode (the updater is invoked twice with the same `prev` reference). (B) ChatAIService.ts:9 calls `LanguageModel.params()`, which is declared in dom-chromium-ai.d.ts but does NOT exist at runtime in Chrome 146 Canary — the type drifted ahead of the runtime. (C) AgentDrawer.tsx calls `LanguageModel.create({ tools })` without first checking whether the tool-use feature gate is enabled in the user's Canary build; when the gate is off, Chrome throws 'Tool use feature is not enabled' and the agent fails to start."
fix: |
  A — ChatPage.tsx: replaced the mutating reducer (`prevMessages.pop()` + `lastMessage.text +=`) with a pure immutable update that builds a fresh `updatedLast` message via spread and returns `[...prevMessages.slice(0, -1), updatedLast]`. Mirrors the canonical pattern used by WriteRewritePage / Summary / TranslatePage. Commit 5535d68.
  B — ChatAIService.ts: `getModelCapabilities()` now feature-detects `LanguageModel.params` at runtime; when absent it returns `{ available }` derived from `LanguageModel.availability()`. Inlined structural types `LMParams` / `LMAvailability` because the ambient names are declared inside `declare global` in a script-mode .d.ts and are not visible via indexed-access form. The Model Stats panel renders "N/A" for the missing fields. Commit 993c2e0.
  C — AgentDrawer.tsx + LanguageModelUnavailable.tsx: added `toolUseUnavailable` state. Catch block on `LanguageModel.create({tools})` now matches the message `/tool use feature is not enabled/i`; on match, it sets `toolUseUnavailable=true` instead of falling into the generic `sessionInitFailed` path. The banner component gained a `variant: 'default' | 'tool-use'` prop that swaps in tool-use-specific copy explaining the recipe tools are still registered with `navigator.modelContext` (so the external Tool Inspector continues to work) but the in-page agent is disabled. ChatInput is also disabled in this state. Commit ca9155b.
verification: |
  - `npx nx typecheck chat` → green.
  - `npx nx build chat` → webpack compiled successfully (3.75 MiB main bundle).
  - Live UAT (UAT-01..UAT-05 in Chrome 146 Canary) is OUTSTANDING — user must re-run before this session is closed as resolved.
files_changed:
  - chat/src/app/components/ChatPage.tsx (commit 5535d68)
  - chat/src/app/services/ChatAIService.ts (commit 993c2e0)
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx (commit ca9155b)
  - chat/src/app/components/RecipeWorkbench/LanguageModelUnavailable.tsx (commit ca9155b)
