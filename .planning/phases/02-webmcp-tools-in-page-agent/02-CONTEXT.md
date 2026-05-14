---
phase: 02-webmcp-tools-in-page-agent
context_gathered: 2026-04-27
locked_decisions: 7
---

# Phase 2: WebMCP Tools + In-Page Agent — Context

## Domain

Recipe Workbench page registers 8 WebMCP tools via `navigator.modelContext` and runs an in-page `LanguageModel` chat agent that uses those same tools. Single tool definition serves two consumers — the in-page agent and an external Chrome 146 Canary agent (verified via WebMCP Tool Inspector extension).

## Carried-forward decisions (from Phase 1 + PROJECT.md)

These are pre-answered — do not re-decide during planning.

- **Native `navigator.modelContext` only** — no `@mcp-b/global` polyfill (PROJECT.md "Out of Scope")
- **`RecipePersistence` is the single source of recipe state** (DATA-03) — all tool handlers operate via its typed CRUD exports (`getRecipes/getRecipe/saveRecipe/deleteRecipe/seedIfEmpty`)
- **8 tools required** (locked by MCP-03 + ROADMAP success criteria #1): `listRecipes`, `getRecipe`, `selectRecipe`, `scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`, `generateShoppingList`
- **Tools register on mount, unregister on unmount** (MCP-02) — page lifecycle owns tool lifecycle
- **Demo flow scripted**: typing "scale to 6 and swap milk for oat milk" causes the assistant to call `scaleRecipe` and `swapIngredient`, recipe updates live (AGENT-03)
- **Mirror existing `/chat` and `/tool-calling` UI patterns** (AGENT-01) — `ChatBox`, `ChatInput`, `LanguageModel.create({tools})`
- **Brownfield discipline** — don't refactor `/chat`, `/tool-calling`, or other demo pages; don't touch `mcp/`, `mcp-client/`, `devops/awsweb/`
- **Ambient WebMCP types live in `chat/src/app/types/webmcp.d.ts`** (Phase 1) — `ModelContext`, `ModelContextTool`, `ModelContextRegisterToolOptions`, `ModelContextToolAnnotations`, `ModelContextClient`. Use these — don't re-declare.
- **`webmcp.d.ts` ends with `export {}`** — Phase 2 already discovered TS2669 forces it. Leave as-is.

## Implementation Decisions

### Tool architecture

- **D-01: WebMCP-first source of truth, derive for LanguageModel.**
  Build `recipeTools.ts` shaped for `navigator.modelContext.registerTool` (`{name, description, inputSchema, handler, annotations?}`). On mount, register each tool with WebMCP. The chat session derives its `LanguageModel.create({tools: [...]})` array from the same source list (or by reading back from `navigator.modelContext` if the API exposes registered tools — researcher to verify).
  This treats the page exactly like an external agent would — WebMCP is the canonical surface; the in-page agent is just another consumer.
  **Rationale:** the user explicitly wanted to model the spec's intent: WebMCP = canonical, agents = consumers. This is more "true to WebMCP" than defining for LanguageModel and adapting outward.
  **Researcher MUST verify:** does Chrome 146 Canary's `navigator.modelContext` expose a way to enumerate registered tools (e.g., `navigator.modelContext.tools` or `getTools()`)? If yes, derive LanguageModel's tool list from that read. If no, keep an in-module typed array as the local source and convert via a `toLanguageModelTools()` adapter. Either path keeps a single definition site.

### Chat panel UI

- **D-02: Bottom sticky drawer.** Chat input + transcript pinned to the bottom of the viewport (or a fixed-height region at the bottom of `RecipeWorkbenchPage`). Recipe stays full-width above. User can see the recipe update live while typing — this is the headline of the 2-min demo.
  ASCII layout:
  ```
  +--------------------------+
  |  Recipe Workbench [☾]   |
  +--------------------------+
  | [Workbench] [Docs]       |
  +--------------------------+
  |  Picker | Recipe view    |
  |         | (live updates) |
  +--------------------------+
  |  Chat: type a request... |
  |  [send]                  |
  +--------------------------+
  ```
  Mirror `ChatBox`/`ChatInput` styling. Dark-mode classes on every new component.

- **D-03: Inline tool-use indicators.** When the agent invokes a tool, show a system-style chat message: `⚙ Calling scaleRecipe(servings: 6)...` then `✓ done`. Recipe updates live in the workbench panel. Visible enough to demo WebMCP's value without overwhelming the chat (no full args/result dump).

- **D-04: Stream the assistant's text response.** Use `session.promptStreaming(text)` with incremental rendering, mirroring `/chat`'s pattern. **Researcher MUST verify** Chrome 146 Canary's tool-call + streaming behavior — known quirk: tool calls arrive as deltas during streaming, and the UI must distinguish "text token" from "tool-call delta" cleanly. If streaming + tool-calling proves unstable on the target Canary build, fall back to non-streaming (`session.prompt`) for the milestone — record as a deviation.

- **D-05: Compact tool list panel.** Show registered tool names + short descriptions in a collapsible panel above the chat drawer (or a side panel within the chat region). Mirrors `ToolCallingPage`'s tool-list pattern but smaller — purpose is to demonstrate which tools are registered with `navigator.modelContext`. Header binds to live registration state (driven by D-07).

### Failure handling

- **D-06: Graceful inline messages in the chat panel.**
  - `LanguageModel` unavailable (model not downloaded / flag off / unsupported browser) → render a "Chrome built-in AI not available" message inside the chat panel with the same Chrome-flag/Canary instructions styling as Phase 1's `MissingFlagBanner`. Don't replace the page — chat just degrades gracefully while recipe browsing keeps working.
  - Tool handler throws → tool returns the error string (or a JSON `{error: "..."}` payload); the agent sees it and tells the user in plain language.
  - Empty/blocked response → "Sorry, couldn't generate a response." Matches `ToolCallingPage` error handling.
  - No retries, no exponential backoff — DoD is "2-min demo", not production.

### External-agent verification

- **D-07: Registration confirmation pill.** Small status indicator near the page header: `✓ 8 tools registered` (green) when all `navigator.modelContext.registerTool` calls succeed, or `⚠ 0 tools registered` (yellow) on failure. Updates reactively from registration state. Helps both the user and the manual MCP-05 Tool Inspector test confirm tools are live before opening the inspector.

### Claude's Discretion

- **System prompt content** for the in-page agent — no specific user request; planner can author one that matches the existing `ToolCallingPage` style.
- **Tool error message wording** — planner picks something that reads naturally to the model.
- **Exact chat drawer height / breakpoints** — UI-phase or planner decides; Tailwind `h-64` to `h-80` range probably right.
- **Registration confirmation pill placement** — beside ThemeToggle in the header, or near the Tabs bar. Planner picks.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 outputs (concrete API contracts)
- `.planning/phases/01-foundation-skeleton/01-01-SUMMARY.md` — exact exports of `RecipePersistence` + `recipeSeed` + `webmcp.d.ts`
- `.planning/phases/01-foundation-skeleton/01-02-SUMMARY.md` — `RecipeWorkbenchPage` shape; mount-time `seedIfEmpty → getRecipes` pattern; `MissingFlagBanner` styling
- `chat/src/app/services/RecipePersistence.ts` — typed CRUD module the tool handlers consume
- `chat/src/app/services/recipeSeed.ts` — `SEED_RECIPES` and the `Recipe`/`Ingredient` interfaces tools mutate
- `chat/src/app/types/webmcp.d.ts` — ambient `navigator.modelContext` types — DO NOT re-declare these

### Existing patterns to mirror
- `chat/src/app/components/ToolCallingPage.tsx` (lines 162–198) — canonical `LanguageModel.create({tools, initialPrompts, responseFormat})` pattern. Tool shape: `{name, description, inputSchema, execute}`. Session lifecycle: destroy on re-init, destroy on unmount.
- `chat/src/app/components/ChatPage.tsx` — streaming chat pattern (`promptStreaming`); incremental rendering of message text.
- `chat/src/app/components/ChatBox.tsx` + `chat/src/app/components/ChatInput.tsx` — reusable message-list + input components.
- `chat/src/app/services/ChatAIService.ts` — `LanguageModel.availability()`, `LanguageModel.params()`, session helpers.
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — styling reference for the LanguageModel-unavailable message.

### Project + milestone refs
- `.planning/PROJECT.md` — Core Value, Constraints (native-only, no deploy, no backend, brownfield), validated WEBMCP-01/03/04/07
- `.planning/REQUIREMENTS.md` — MCP-02..05, AGENT-01..03 acceptance criteria
- `.planning/ROADMAP.md` (Phase 2 section) — 5 success criteria, requirements list, 2-min demo flow definition
- `.planning/codebase/CONVENTIONS.md` — TS strict, no `as any` at API boundaries, dark-mode pattern
- `.planning/codebase/STRUCTURE.md` — where new components live, services pattern
- `CLAUDE.md` — brownfield discipline, demo page pattern, locked dev port 4300

### External (research targets — not yet read)
- W3C WebMCP Draft: https://webmachinelearning.github.io/webmcp/ — for `navigator.modelContext.registerTool` exact API surface, especially whether registered tools are enumerable
- WebMCP Tool Inspector extension docs (Chrome 146 Canary) — for what MCP-05 verification looks like in practice
- Chrome built-in AI / `LanguageModel` tool-calling docs — for streaming + tool-call delta semantics (D-04 verification)

## Existing Code Insights

### Reusable Assets
- `RecipePersistence` exports — every tool handler is a thin wrapper around these (single source of recipe state — DATA-03 / MCP-04 satisfied automatically)
- `ChatBox.tsx`, `ChatInput.tsx` — reuse as-is for the chat drawer transcript + input
- `ChatAIService.ts` (`zeroShot`, `getModelCapabilities`, `resetModel`) — useful for availability check and session lifecycle, but the actual tool-calling session must be created with `LanguageModel.create({tools})` directly (not via `zeroShot`, which doesn't pass tools)
- `MissingFlagBanner.tsx` styling — copy/clone the visual treatment for the "LanguageModel unavailable" inline state in the chat panel
- `RecipeWorkbenchPage.tsx`'s mount effect pattern (`cancelled` flag, StrictMode-safe) — mirror exactly for tool registration

### Established Patterns
- Page component + dedicated services module pattern (`<Demo>Page.tsx` + `services/<Demo>Service.ts` or inline)
- Tailwind dark-mode coverage on every visible class (every `bg-`/`text-`/`border-` paired with `dark:` variant)
- Service-level session destruction on unmount and re-init
- JSON Schema `inputSchema` for tools (already used in `ToolCallingPage`)

### Integration Points
- `RecipeWorkbenchPage.tsx` — tool registration `useEffect` mounts here; chat drawer renders here; current page already has Tabs + MissingFlagBanner branch from Phase 1
- `RecipePersistence.ts` — every tool handler imports and calls these typed functions; no other consumer needs to change
- The chat session must NOT register its own copy of tools — it derives from the WebMCP-registered set (D-01)

## Specific Ideas

- **Demo phrase:** "scale to 6 and swap milk for oat milk" must work end-to-end (AGENT-03). This drives at least these tools' robustness: `scaleRecipe(servings)`, `swapIngredient(ingredientName, replacement)`. Edge cases the planner should think about:
  - "swap milk for oat milk" — case-insensitive ingredient name matching (or substring match)? What if no recipe ingredient matches "milk"?
  - "scale to 6" — proportional scaling of all ingredient quantities. What about non-numeric quantities like "to taste" or "1 pinch"? (Probably keep them unchanged; only scale numeric values.)
- **8 tools have asymmetric complexity.** `listRecipes` / `getRecipe` / `selectRecipe` are read-only and trivial. `scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient` mutate state. `generateShoppingList` is read-derived (probably aggregates ingredients from selected/all recipes). Planner should split work to land read-only tools first, then mutators, then derived.

## Deferred Ideas

- **V2-08 follow-on tools** (`convertToMetric`, `simplifyInstructions`, `findSubstitute`, `addStep`, `reorderSteps`) — out of v1; tracked in REQUIREMENTS.md.
- **Polished error states / production telemetry** (V2-03) — DoD is "demo-able", not "production".
- **Live deployment of Phase 2** (V2-02) — no deploy this milestone.
- **Tool result streaming / async tool handlers** — explicitly out of scope per REQUIREMENTS.md "Out of Scope" table.
- **Recipe creation from blank state** (V2-07) — defer; tools manipulate seeded recipes only.

---

*Phase: 02-webmcp-tools-in-page-agent*
*Context gathered: 2026-04-27*
