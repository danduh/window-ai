---
phase: quick
plan: 260428-fam
subsystem: chat/webmcp-ui
tags: [layout, tailwind, webmcp, recipe-workbench]
key-files:
  modified:
    - chat/src/app/components/RecipeWorkbenchPage.tsx
    - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
decisions:
  - Steps go in LEFT column under Ingredients (recipe-content cohesion, honors user intent, zero StepsList refactor)
  - AgentDrawer moved inside WorkbenchPanel rather than staying as a tab-level sibling (cleaner prop flow, enables flex-fill layout)
metrics:
  completed: "2026-04-28"
---

# Quick Task 260428-fam: Rework WebMCP Recipe Workbench Layout

**One-liner:** Two-column workbench layout (lg:col-span-4 recipe / lg:col-span-8 chat) replacing the recipe-dominant top + thin bottom drawer.

## What Changed

### Task 1 — RecipeWorkbenchPage.tsx (`8e79ce2`)

`WorkbenchPanel` was rewritten from a `lg:grid-cols-4` (1 left / 3 right recipe-dominant) layout to `lg:grid-cols-12` with:

- **LEFT column (`lg:col-span-4`):** `RecipePicker` → `IngredientsList` → `StepsList` stacked with `space-y-6`
- **RIGHT column (`lg:col-span-8`):** `RecipeHeader` (compact) → `AgentDrawer` wrapped in `flex-1 min-h-[60vh] lg:min-h-0`

`WorkbenchPanelProps` gained four new props: `registrationStatus`, `registeredCount`, `liveToolName`, `onLiveToolNameChange`. The workbench tab content went from a `<>WorkbenchPanel + AgentDrawer</>` fragment to a single `<WorkbenchPanel ... />` invocation. `useMemo` deps array unchanged.

### Task 2 — AgentDrawer.tsx (`67c6c84`)

Outer wrapper className changed from:
```
bg-white ... mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96
```
to:
```
bg-white ... h-full min-h-[60vh] lg:min-h-[600px] flex flex-col
```

Inner wrapper className gained `min-h-0` (standard flexbox scrollable-child fix).

Exactly two lines changed. All behavior code (`INTENT_SCHEMA`, `SYSTEM_PROMPT`, `extractJsonFromResponse`, `LanguageModel.create`, `outputLanguage: 'en'`, dispatch loop, recipe-context injection, `RECIPE_TOOLS` lookup) is byte-for-byte identical.

## Gates

| Gate | Status |
|------|--------|
| `npx nx typecheck chat` after Task 1 | GREEN |
| `npx nx typecheck chat` after Task 2 | GREEN |
| `npx nx build chat` after Task 2 | GREEN (webpack compiled successfully) |

## Deviations from Plan

None — plan executed exactly as written. Edits were applied to the worktree path (`.claude/worktrees/agent-af6ead9b65fa6aac2/`) rather than the main repo path; this is the correct target for the worktree-agent execution model.

## Known Stubs

None — no placeholder text or empty data sources introduced.

## Threat Flags

None — layout-only changes; no new network endpoints, auth paths, or schema changes.

## UAT Script (Task 3 — Human Verify)

Run `npx nx serve chat` from the project root (`/Users/danielos/dev/window-ai`), then open `http://localhost:4300/webmcp`.

**1. Desktop layout (lg+ viewport, e.g. 1440px wide)**

- The Workbench tab shows a clear two-column layout.
- LEFT column (narrower, ~33%) contains, top-to-bottom: recipe picker cards, then Ingredients list, then Steps list.
- RIGHT column (wider, ~67%) contains: a compact recipe header ("Buttermilk Pancakes — Serves 4") at the top, then the chat panel filling the remaining vertical space (visibly tall — not a thin bottom drawer).

**2. Dark-mode check**

- Click the theme toggle (top-right sun/moon icon).
- Every panel (picker, ingredients, steps, header, chat) flips to dark mode cleanly. No light-background "islands" remain.

**3. Mobile check (resize browser to < 1024 px wide, or DevTools mobile emulation)**

- Layout collapses to a single column.
- Order: picker → ingredients → steps → header → chat.
- The chat input area is still comfortably tall (at least 60 vh).

**4. Behavior smoke test (must not regress)**

- Type "scale to 6 servings" in the chat input and press Send / Enter.
- Expected: a User bubble appears, then one or more `ToolCallIndicator` rows appear briefly, then a Bot reply summarises the change, and the Ingredient quantities in the LEFT column update to 6-serving amounts.
- This confirms AgentDrawer's dispatch loop, recipe-context injection, and tool execution all survived the layout change.

**5. Console check**

- Open DevTools → Console. Confirm no new red errors introduced by this change (pre-existing Chrome 147 warnings about LanguageModel are expected and fine).

**Resume signal:** Type "approved" if everything matches, or describe any visual/behavioral issues.

## Self-Check

- [x] `chat/src/app/components/RecipeWorkbenchPage.tsx` exists and contains `lg:grid-cols-12`
- [x] `chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` exists and contains `h-full`
- [x] Commit `8e79ce2` exists (Task 1)
- [x] Commit `67c6c84` exists (Task 2)
