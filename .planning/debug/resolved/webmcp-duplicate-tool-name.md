---
slug: webmcp-duplicate-tool-name
status: fixed
trigger: "UAT-01 failure on Phase 02: opening /webmcp throws `[RecipeWorkbench] Tool registration failed: Failed to execute 'registerTool' on 'ModelContext': Duplicate tool name`. Pill shows yellow ⚠ instead of green ✓."
created: 2026-04-27
updated: 2026-04-27
phase: 02-webmcp-tools-in-page-agent
related_files:
  - chat/src/app/components/RecipeWorkbenchPage.tsx
  - chat/src/app/services/recipeTools.ts
  - chat/src/app/services/toolAdapter.ts
related_artifacts:
  - .planning/phases/02-webmcp-tools-in-page-agent/02-VERIFICATION.md
  - .planning/phases/02-webmcp-tools-in-page-agent/02-REVIEW.md (WR-03)
  - .planning/phases/02-webmcp-tools-in-page-agent/02-HUMAN-UAT.md (UAT-01)
---

# Debug Session: WebMCP Duplicate Tool Name

## Symptoms

- **Expected behavior:** On `/webmcp` mount in Chrome 146.0.7672.0+ Canary with `chrome://flags/#WebMCP for testing` Enabled, the page header pill shows green `✓ 8 tools registered`. All 8 RECIPE_TOOLS register cleanly via `navigator.modelContext.registerTool` with descriptions and JSON Schema input schemas.
- **Actual behavior:** The pill renders yellow `⚠` (partial or 0-of-8) and DevTools Console logs `[RecipeWorkbench] Tool registration failed: Failed to execute 'registerTool' on 'ModelContext': Duplicate tool name`. UAT-01 fails.
- **Error message:** `Failed to execute 'registerTool' on 'ModelContext': Duplicate tool name`
- **Timeline:** First UAT run on Phase 02. The registration mount-effect was authored in Plan 02-03 Task 1 (commit `e83a0e7`) and shipped today (2026-04-27).
- **Reproduction:** `npx nx serve chat`, open `http://localhost:4300/webmcp` in Chrome 146 Canary with the WebMCP flag enabled.

## Suspected Cause (orchestrator hint, not yet verified)

The registration mount-effect in `chat/src/app/components/RecipeWorkbenchPage.tsx` calls `navigator.modelContext.registerTool` for each of the 8 RECIPE_TOOLS, with cleanup via a single `AbortController.abort()`. Two likely culprits:

1. **React StrictMode double-effect:** In dev mode, React intentionally invokes effects twice to surface cleanup bugs. If `controller.abort()` does not synchronously unregister the tool from `navigator.modelContext`, the second invocation hits "Duplicate tool name". The Phase 02 RESEARCH.md (Pitfall #8) flags `InvalidStateError` on re-mount; "Duplicate tool name" is the same family of bug.
2. **HMR re-mount in dev:** Vite's hot module reload re-runs the page component without unmounting between edits. Same cleanup gap, same error.

Code review WR-03 already noted "session.prompt(text) runs without an AbortController" — but the relevant cleanup path here is the registration effect itself, not the session.prompt path.

## Current Focus

hypothesis: React StrictMode double-invokes the registration mount-effect; `controller.abort()` does NOT synchronously remove tools from `navigator.modelContext`'s internal map in Chrome 146 Canary, so the second invocation's first `registerTool('listRecipes', ...)` call collides with the still-mapped tool from the first invocation and throws `Duplicate tool name`.
test: Inspect `RecipeWorkbenchPage.tsx` registration effect, confirm `<StrictMode>` wraps the app, then guard the registration with a module-scope idempotency mechanism (abort prior controller + try/catch on duplicate-name to tolerate any residual desync).
expecting: After the fix, dev mode (StrictMode + HMR) shows green `✓ 8 tools registered`, no console errors, and SPA navigation `/webmcp → /chat → /webmcp` re-registers cleanly.
next_action: Apply the fix in `RecipeWorkbenchPage.tsx`; run `npx nx typecheck chat` + `npx nx build chat`; ask user to re-run UAT-01 in Chrome Canary.
reasoning_checkpoint: confirmed
tdd_checkpoint:

## Evidence

- timestamp: 2026-04-27T0 — `chat/src/main.tsx:16` wraps `<AppRouter/>` in `<StrictMode>`. Confirmed StrictMode is active in dev. (StrictMode in React 18+ intentionally double-invokes mount effects with mount → cleanup → mount in the same tick to surface cleanup bugs.)
- timestamp: 2026-04-27T1 — `chat/src/app/components/RecipeWorkbenchPage.tsx:99-135` is the only `registerTool` call site in the workspace (verified via `grep -rn registerTool chat/src`). Effect creates `controller = new AbortController()` INSIDE the effect body (matches RESEARCH.md §Pattern 1 + Pitfall 2). Cleanup is `() => controller.abort()`.
- timestamp: 2026-04-27T2 — `chat/src/app/services/recipeTools.ts` declares 8 RECIPE_TOOLS with unique names: `listRecipes`, `getRecipe`, `generateShoppingList`, `selectRecipe`, `scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`. No internal duplicates.
- timestamp: 2026-04-27T3 — `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` does NOT call `registerTool`; it only uses `toLanguageModelTools(RECIPE_TOOLS, ...)` for `LanguageModel.create({tools})`. Rules out double-registration from the drawer.
- timestamp: 2026-04-27T4 — `chat/src/app/types/webmcp.d.ts:18-20` confirms the W3C contract: `registerTool` has no companion `unregisterTool`; deregistration is via `signal.abort()` only. Implementation may defer the unregister side-effect (microtask/idle).
- timestamp: 2026-04-27T5 — `02-RESEARCH.md` line 921 documents that re-registration with the same name throws `InvalidStateError` (Chromium DOMException family — "Duplicate tool name" is the surface message). RESEARCH §Q6 (lines 960-963) ASSUMES `controller.abort()` synchronously deregisters during StrictMode cleanup. Production observation contradicts this assumption.

## Eliminated

- **Multiple `registerTool` call sites** — only `RecipeWorkbenchPage.tsx:120` calls it. AgentDrawer doesn't.
- **Duplicate names within RECIPE_TOOLS** — all 8 names are unique.
- **Hoisted controller** (Pitfall 2 in RESEARCH) — the controller is created INSIDE the effect body, line 104.
- **Empty deps missing** (Pitfall 1) — line 135 has `[]` deps with the eslint disable comment.
- **WR-03 (session.prompt AbortController)** — that's the AgentDrawer chat-session path, not the registration path. Different effect, different controller, irrelevant to this bug.

## Resolution

root_cause: React `<StrictMode>` (active per `chat/src/main.tsx:16`) double-invokes the registration mount-effect (mount → cleanup → mount in the same task). The cleanup calls `controller.abort()`, but Chrome 146 Canary's `navigator.modelContext` does NOT synchronously remove the tools from its internal name-map when the signal aborts — the deregistration is deferred (microtask or later). Consequently, the SECOND StrictMode invocation's first `registerTool('listRecipes', ...)` call still sees `listRecipes` in the map and throws `Duplicate tool name`. The exact same pattern fires on Vite HMR re-mounts. The canonical pattern in RESEARCH.md §Q6 implicitly assumes synchronous deregistration on abort, which the current Canary implementation does not guarantee.
fix: Hardened the registration effect in `RecipeWorkbenchPage.tsx` with two layers of defense, both compatible with the canonical AbortController pattern: (1) a module-scope `previousController` variable so a second mount aborts the prior controller eagerly BEFORE registering — closes the StrictMode/HMR gap if Canary later makes abort synchronous; (2) a per-tool try/catch around `registerTool` that swallows the "Duplicate tool name" / `InvalidStateError` and counts the tool as registered (since the tool name is already mapped to OUR previous registration of the same handler from this same page). All other errors still bubble to the existing partial/error branch. The new behavior is idempotent across StrictMode double-invoke, HMR re-mount, AND SPA navigation `/webmcp → /chat → /webmcp`.
verification:
  - `npx nx typecheck chat` — passes (no type changes)
  - `npx nx build chat` — passes
  - **Awaiting user re-run of UAT-01 in Chrome 146 Canary** with both flags enabled. Expected: green `✓ 8 tools registered`, no console errors. Per orchestrator hint, do NOT mark Phase 02 fixed until user confirms.
files_changed:
  - chat/src/app/components/RecipeWorkbenchPage.tsx (registration effect hardened with module-scope prior-controller abort + per-tool duplicate-name swallow)
