---
phase: quick
plan: 260428-fam
type: execute
wave: 1
depends_on: []
files_modified:
  - chat/src/app/components/RecipeWorkbenchPage.tsx
  - chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "On lg+ viewports the page renders a two-column layout: a narrower LEFT column and a wider RIGHT column."
    - "LEFT column on lg+ shows, top-to-bottom: RecipePicker, IngredientsList, StepsList — in that exact order."
    - "RIGHT column on lg+ shows, top-to-bottom: RecipeHeader (compact, for chat context), AgentDrawer (chat panel) filling the remaining vertical space."
    - "AgentDrawer is no longer a thin bottom-pinned drawer — it visibly dominates the right column's vertical space (≥ ~600px tall on a typical 1080p viewport)."
    - "On <lg viewports the page collapses to a single-column stack (picker → ingredients → steps → header → chat) and the chat still has a usable height (≥ 60vh)."
    - "Dark-mode parity is preserved — every dark: variant present today is still aligned (no light/dark mismatches in the new layout)."
    - "AgentDrawer behavior is unchanged: chat send works, tool dispatch loop runs, ToolCallIndicators render, ToolListPanel still renders inside the drawer."
    - "`npx nx typecheck chat` passes."
    - "`npx nx build chat` produces a successful production bundle."

  artifacts:
    - path: "chat/src/app/components/RecipeWorkbenchPage.tsx"
      provides: "Reworked WorkbenchPanel grid + repositioned AgentDrawer in the workbench tab content"
      contains: "lg:grid-cols-12"
    - path: "chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx"
      provides: "AgentDrawer outer wrapper resized to fill column (no longer fixed-height drawer)"
      contains: "h-full"

  key_links:
    - from: "RecipeWorkbenchPage.tsx WorkbenchPanel"
      to: "RecipePicker + IngredientsList + StepsList"
      via: "left column (lg:col-span-4) vertical stack"
      pattern: "lg:col-span-4"
    - from: "RecipeWorkbenchPage.tsx workbench tab content"
      to: "AgentDrawer"
      via: "right column (lg:col-span-8) — chat is the dominant area"
      pattern: "lg:col-span-8"
---

<objective>
Rework the `/webmcp` Recipe Workbench page from "recipe-dominant top, thin chat drawer at bottom" to a **two-column layout** where the chat panel dominates the right side and recipe content (picker → ingredients → steps) stacks on the left.

**User's verbatim request:** *"the section with recipe takes too much place, while chat section is too small. Move ingredient list to the left, under recipes. and chat section pull up."*

**Locked design choices** (Steps placement was open per task_intent — locked here):

- **Outer grid:** `grid grid-cols-1 lg:grid-cols-12 gap-6` on lg+ (12-col bias → chat clearly dominant).
- **LEFT column** (`lg:col-span-4`, ~33% width): `RecipePicker` → `IngredientsList` → `StepsList`, stacked vertically with `space-y-6`.
- **RIGHT column** (`lg:col-span-8`, ~67% width): `RecipeHeader` (compact, gives the chat its recipe context at a glance) → `AgentDrawer` filling the remaining vertical space.
- **Mobile (`<lg`):** single-column stack in the order picker → ingredients → steps → header → chat. Chat keeps a usable height (`min-h-[60vh]`).

**Why Steps go in the LEFT column under Ingredients (option a from task_intent):**

1. **Cohesion** — all read-only recipe content (picker, ingredients, steps) lives in one column. The right side becomes a clean "interaction" column (context header + chat).
2. **Honors user intent** — they explicitly asked for the chat to "pull up" and the recipe section to take less horizontal space. Putting steps in the right column would steal vertical room from the chat.
3. **Zero refactor of `StepsList`** — it just slots into the new column. Brownfield discipline preserved.
4. **No accordion** — the user did not ask for a collapse/expand; adding interaction state for steps is out of scope.

Purpose: the chat is the showcase feature of `/webmcp`. Today it's visually buried; after this change a first-time visitor opens the page and immediately sees the chat as the primary affordance. Recipe content stays accessible but no longer competes for the dominant vertical real estate.

Output:
- Updated `RecipeWorkbenchPage.tsx` with reworked `WorkbenchPanel` grid + repositioned `AgentDrawer`.
- Updated `AgentDrawer.tsx` outer wrapper (sizing classes only — no behavior changes).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@chat/src/app/components/RecipeWorkbenchPage.tsx
@chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx
@chat/src/app/components/RecipeWorkbench/RecipePicker.tsx
@chat/src/app/components/RecipeWorkbench/IngredientsList.tsx
@chat/src/app/components/RecipeWorkbench/StepsList.tsx
@chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx
@chat/src/app/components/RecipeWorkbench/ToolListPanel.tsx

<interfaces>
<!-- Sub-components consumed unchanged. Layout-only edits at the page level. -->

`RecipePicker` props (chat/src/app/components/RecipeWorkbench/RecipePicker.tsx):
```ts
interface RecipePickerProps {
  recipes: Recipe[];
  activeId: string | null;
  onSelect: (id: string) => void;
}
```

`IngredientsList` props:
```ts
interface IngredientsListProps {
  ingredients: Ingredient[];
}
```

`StepsList` props:
```ts
interface StepsListProps {
  steps: string[];
}
```

`RecipeHeader` props:
```ts
interface RecipeHeaderProps {
  title: string;
  servings: number;
}
```

`AgentDrawer` props (DO NOT MODIFY THE INTERNAL SESSION/DISPATCH LOGIC):
```ts
interface AgentDrawerProps {
  onLiveToolNameChange?: (name: string | null) => void;
  registrationStatus: ToolRegistrationStatus;
  registeredCount: number;
  liveToolName?: string | null;
}
```

`AgentDrawer.tsx` current outer wrapper (the ONLY part of AgentDrawer to touch):
```tsx
return (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96">
    <div className="flex flex-col gap-3 h-full">
      ...children unchanged...
    </div>
  </div>
);
```

**Hands-off zones inside AgentDrawer.tsx (UAT-04 hardening — DO NOT TOUCH):**
- `INTENT_SCHEMA`, `SYSTEM_PROMPT`, `MAX_TOOL_CALLS`, `extractJsonFromResponse()`
- `useEffect` that calls `LanguageModel.availability()` + `LanguageModel.create({ outputLanguage: 'en', responseFormat: INTENT_SCHEMA, ... })`
- `handleUserMessage` dispatch loop, recipe-context injection, `RECIPE_TOOLS` lookup
- `outputLanguage: 'en'` — DO NOT REMOVE (suppresses Chrome 147 warning)
- All `useState`/`useRef` hooks and child JSX inside the inner `<div className="flex flex-col gap-3 h-full">`

Layout-only edits to AgentDrawer = changing the className of the OUTERMOST `<div>` only.
</interfaces>

**Current `WorkbenchPanel` shape to be replaced** (RecipeWorkbenchPage.tsx lines 29–54):
```tsx
const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({ recipes, activeId, loading, onSelect }) => {
  const active = recipes.find((r) => r.id === activeId);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1">
        {!loading && recipes.length > 0 && (
          <RecipePicker recipes={recipes} activeId={activeId} onSelect={onSelect} />
        )}
      </aside>
      <section className="lg:col-span-3 space-y-6">
        {loading ? (...) : !active ? (...) : (
          <>
            <RecipeHeader title={active.title} servings={active.servings} />
            <IngredientsList ingredients={active.ingredients} />
            <StepsList steps={active.steps} />
          </>
        )}
      </section>
    </div>
  );
};
```

**Current workbench-tab content** (RecipeWorkbenchPage.tsx lines 235–251):
```tsx
{
  id: 'workbench',
  label: 'Workbench',
  path: '',
  content: (
    <>
      <WorkbenchPanel ... />
      <AgentDrawer ... />
    </>
  ),
},
```

The `<AgentDrawer />` is currently a sibling of `WorkbenchPanel` and lives BELOW the grid. The plan moves `AgentDrawer` INSIDE the new grid's right column.

</context>

<tasks>

<task type="auto">
  <name>Task 1: Rework WorkbenchPanel into two-column layout and pull AgentDrawer into the right column</name>
  <files>chat/src/app/components/RecipeWorkbenchPage.tsx</files>
  <action>
Edit `chat/src/app/components/RecipeWorkbenchPage.tsx` to restructure the workbench layout. Two coordinated changes in this single file:

**Change A — Rewrite `WorkbenchPanel`** (currently lines ~29–54). Update its signature to accept the chat-related props it needs to render `AgentDrawer` inside the right column, and rebuild its JSX as a 12-column grid:

1. Update `WorkbenchPanelProps`:
```ts
interface WorkbenchPanelProps {
  recipes: Recipe[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  registrationStatus: ToolRegistrationStatus;
  registeredCount: number;
  liveToolName: string | null;
  onLiveToolNameChange: (name: string | null) => void;
}
```

2. Replace the JSX body with the two-column layout:
```tsx
const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({
  recipes,
  activeId,
  loading,
  onSelect,
  registrationStatus,
  registeredCount,
  liveToolName,
  onLiveToolNameChange,
}) => {
  const active = recipes.find((r) => r.id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:min-h-[calc(100vh-14rem)]">
      {/* LEFT column: recipe content stacked top-to-bottom */}
      <aside className="lg:col-span-4 space-y-6">
        {!loading && recipes.length > 0 && (
          <RecipePicker recipes={recipes} activeId={activeId} onSelect={onSelect} />
        )}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading your recipes&hellip;</p>
        ) : !active ? (
          <p className="text-gray-500 dark:text-gray-400">No recipes yet. Reload the page to seed the demo recipes.</p>
        ) : (
          <>
            <IngredientsList ingredients={active.ingredients} />
            <StepsList steps={active.steps} />
          </>
        )}
      </aside>

      {/* RIGHT column: compact recipe header + dominant chat panel */}
      <section className="lg:col-span-8 flex flex-col gap-6 min-h-[60vh] lg:min-h-0">
        {!loading && active && (
          <RecipeHeader title={active.title} servings={active.servings} />
        )}
        <div className="flex-1 min-h-[60vh] lg:min-h-0">
          <AgentDrawer
            registrationStatus={registrationStatus}
            registeredCount={registeredCount}
            liveToolName={liveToolName}
            onLiveToolNameChange={onLiveToolNameChange}
          />
        </div>
      </section>
    </div>
  );
};
```

Notes on the classes:
- `lg:grid-cols-12` + `lg:col-span-4`/`lg:col-span-8` gives the chat ~67% of the horizontal space (vs. the old 75/25 that favored recipe content).
- `lg:min-h-[calc(100vh-14rem)]` on the grid gives the right column real vertical room so AgentDrawer's `h-full` can resolve to a meaningful height (header chrome ≈ 14rem; tweak to 12rem if visually too tall).
- The `flex-1 min-h-[60vh] lg:min-h-0` wrapper around `<AgentDrawer>` is what lets the chat fill the remaining vertical space on lg+ while still having a usable height on mobile.
- Dark-mode parity: every existing `dark:` variant on sub-components is preserved (we don't change those files). The new wrapper divs add no light-only classes.

**Change B — Update the workbench tab content** (currently lines ~235–251). Move `<AgentDrawer />` OUT of the tab-content fragment and INTO `<WorkbenchPanel />` via the new props. The fragment becomes a single component:

```tsx
{
  id: 'workbench',
  label: 'Workbench',
  path: '',
  content: (
    <WorkbenchPanel
      recipes={recipes}
      activeId={activeId}
      loading={loading}
      onSelect={handleSelect}
      registrationStatus={registration.status}
      registeredCount={registration.count}
      liveToolName={liveToolName}
      onLiveToolNameChange={setLiveToolName}
    />
  ),
},
```

The `useMemo` deps array stays the same (recipes, activeId, loading, handleSelect, registration.status, registration.count, liveToolName) — `setLiveToolName` is a stable React setter and does not need to be in the deps array (matches the existing convention used by the previous `<AgentDrawer />` invocation).

**DO NOT** modify any other code in `RecipeWorkbenchPage.tsx`:
- Leave the `previousRegistrationController` module-level state untouched.
- Leave all three `useEffect` hooks (seed, registration, store-subscribe) untouched.
- Leave the page-level `<header>` (logo + title + ToolRegistrationPill + ThemeToggle) untouched.
- Leave the `MissingFlagBanner` rendering untouched.
- Leave the `Tabs` invocation untouched.
- Leave the docs tab content untouched.
  </action>
  <verify>
    <automated>cd /Users/danielos/dev/window-ai && npx nx typecheck chat</automated>
  </verify>
  <done>
- `WorkbenchPanel` accepts and forwards 4 new chat-related props.
- `WorkbenchPanel` renders `lg:grid-cols-12` with `lg:col-span-4` LEFT (picker + ingredients + steps stacked) and `lg:col-span-8` RIGHT (header + AgentDrawer flex-1 fill).
- The workbench tab content is now a single `<WorkbenchPanel ... />` invocation with no sibling `<AgentDrawer />`.
- `npx nx typecheck chat` exits 0.
- No other code in the file changed (diff is localized to `WorkbenchPanel` + the workbench tab `content` field).
  </done>
</task>

<task type="auto">
  <name>Task 2: Resize AgentDrawer outer wrapper to fill its column (sizing classes only — zero behavior changes)</name>
  <files>chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx</files>
  <action>
Edit ONLY the className of the outermost `<div>` returned by `AgentDrawer` (currently the JSX at the bottom of the file, around line 350).

**Before:**
```tsx
return (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96">
    <div className="flex flex-col gap-3 h-full">
      ...
    </div>
  </div>
);
```

**After:**
```tsx
return (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 h-full min-h-[60vh] lg:min-h-[600px] flex flex-col">
    <div className="flex flex-col gap-3 h-full min-h-0">
      ...
    </div>
  </div>
);
```

Why each change:
- **Removed `mt-6`** — vertical spacing now comes from the parent column's `gap-6` / `space-y-6`. Keeping `mt-6` here would compound spacing and push the chat down.
- **Removed `h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96`** — these forced a tiny fixed-height bottom drawer. The whole point of this rework is to let the chat fill the right column.
- **Added `h-full`** — fills the wrapper provided by `WorkbenchPanel`'s `<div className="flex-1 min-h-[60vh] lg:min-h-0">`.
- **Added `min-h-[60vh] lg:min-h-[600px]`** — guarantees a usable height even if the parent's flex math degrades; on lg+ ensures the chat is meaningfully tall (≥ 600px) regardless of viewport oddities.
- **Added `flex flex-col`** to the outer div — needed so the inner `flex flex-col gap-3 h-full` can grow correctly inside it.
- **Added `min-h-0` to the inner div** — standard flexbox fix so the scrollable `<div className="flex-1 min-h-0 overflow-y-auto">` (already present, unchanged) actually scrolls instead of overflowing.

**ABSOLUTELY DO NOT TOUCH** anything else in `AgentDrawer.tsx`:
- Do not modify `INTENT_SCHEMA`, `SYSTEM_PROMPT`, `MAX_TOOL_CALLS`, `extractJsonFromResponse()`.
- Do not modify the `useEffect` that creates the `LanguageModel` session.
- Do not remove `outputLanguage: 'en'` (UAT-04 hardening — Chrome 147 requirement).
- Do not modify `handleUserMessage`, the dispatch loop, the recipe-context injection, or the `RECIPE_TOOLS` lookup.
- Do not modify any `useState`/`useRef` hooks.
- Do not modify the inner JSX (`ToolListPanel`, `ChatBox`, `ToolCallIndicator` map, `LanguageModelUnavailable`, `ChatInput`).

The diff for this task should be exactly two changed lines (the outer wrapper className and the inner wrapper className).
  </action>
  <verify>
    <automated>cd /Users/danielos/dev/window-ai && npx nx typecheck chat && npx nx build chat</automated>
  </verify>
  <done>
- The outer `<div>` className in `AgentDrawer.tsx` is `bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 h-full min-h-[60vh] lg:min-h-[600px] flex flex-col` (verified via Read).
- The inner `<div>` className adds `min-h-0`.
- No other lines in `AgentDrawer.tsx` changed (`git diff chat/src/app/components/RecipeWorkbench/AgentDrawer.tsx` shows only those two className lines).
- `npx nx typecheck chat` exits 0.
- `npx nx build chat` produces a successful production bundle (exit 0).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    - `/webmcp` workbench tab now uses a two-column grid on lg+ viewports.
    - LEFT column (narrower, ~33%): RecipePicker on top, IngredientsList directly below it, StepsList below ingredients.
    - RIGHT column (wider, ~67%): RecipeHeader (compact) on top, AgentDrawer chat panel filling the rest of the column height.
    - On mobile (<lg): single-column stack with usable chat height.
    - AgentDrawer behavior is unchanged (chat still works, tools still dispatch, indicators still render).
  </what-built>
  <how-to-verify>
1. Run `npx nx serve chat` and open `http://localhost:4300/webmcp`.
2. **Desktop check (lg+ viewport, e.g. 1440px wide):**
   - Confirm the workbench tab now has a clear two-column layout.
   - LEFT column shows, top-to-bottom: Recipes (picker) → Ingredients → Steps.
   - RIGHT column shows: a compact recipe header (title + "Serves N") on top, then the chat panel filling the rest of the vertical space.
   - The chat panel is visibly the dominant element — much taller and wider than before. Not a thin bottom drawer anymore.
   - Tool list panel (collapsible) is still inside the chat panel (clickable, expands).
3. **Dark-mode check:** Click the theme toggle (top-right). Every panel — picker, ingredients, steps, header, chat — should switch to dark mode cleanly. No light-mode-only backgrounds remaining.
4. **Mobile check (resize browser to <1024px wide, or DevTools mobile emulation):**
   - Layout collapses to a single column.
   - Order: picker → ingredients → steps → header → chat.
   - Chat is still tall enough to type in (≥ 60vh).
5. **Behavior smoke test (the part that MUST NOT regress):**
   - Type "scale to 6 servings" in the chat input and press send.
   - Confirm: a User bubble appears, then ToolCallIndicator(s) appear, then a Bot reply appears, and the Ingredients quantities update live in the LEFT column.
   - This proves AgentDrawer's dispatch loop, recipe-context injection, and tool execution all still work after the layout change.
6. **Console check:** Open DevTools console, confirm no new errors or warnings introduced by the layout change (the existing Chrome 147 warnings are fine).
  </how-to-verify>
  <resume-signal>Type "approved" if layout matches the description and chat behavior is intact, or describe any visual/behavioral issues to fix.</resume-signal>
</task>

</tasks>

<verification>
- `npx nx typecheck chat` passes after both edits (Task 1 + Task 2).
- `npx nx build chat` produces a successful production bundle.
- Visual check on `/webmcp`: two-column layout on lg+, single-column on <lg, chat is the dominant area.
- Dark-mode parity preserved (theme toggle flips every panel cleanly).
- AgentDrawer chat behavior unchanged (send a message, watch tools dispatch, see ingredients update).
- Diff is localized to two files: `RecipeWorkbenchPage.tsx` (WorkbenchPanel + workbench tab content) and `AgentDrawer.tsx` (outer wrapper className only).
</verification>

<success_criteria>
- LEFT column on lg+ contains, in order: RecipePicker, IngredientsList, StepsList.
- RIGHT column on lg+ contains, in order: RecipeHeader, AgentDrawer (filling remaining height).
- Chat panel is visibly the dominant element (no longer a thin bottom drawer).
- Mobile collapses to a single column with chat ≥ 60vh tall.
- Dark-mode classes remain aligned (no broken dark variants).
- `npx nx typecheck chat` and `npx nx build chat` both green.
- AgentDrawer's session creation, dispatch loop, recipe-context injection, and tool wiring are byte-for-byte identical to before — layout-only changes touched only sizing/positioning classes on the outermost wrapper.
- No other files modified beyond `RecipeWorkbenchPage.tsx` and `RecipeWorkbench/AgentDrawer.tsx`.
</success_criteria>

<output>
After completion, no SUMMARY required (quick-mode plan). The committed diff in the two listed files is the artifact.
</output>
