# Handoff — WebMCP Recipe Workbench with Generative UI

**For:** the developer/agent picking up the WebMCP demo build
**From:** Daniel (talk speaker)
**Branch:** `feature/mcp-preview`
**Workflow:** GSD (this slots into the WebMCP Recipe Workbench milestone — see `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`)
**Definition of done:** a 2-minute live demo that holds up on stage at a conference.

---

## What this is

The original WebMCP Recipe Workbench plan was "a recipe page exposes typed actions for an agent to call." Functional, but visually flat — the agent talks, the page silently updates.

This handoff upgrades the demo to the **bidirectional generative-UI pattern**: the WebMCP tool returns a UI resource that renders inside the agent's chat bubble, and that UI then registers *more* tools back with the page's WebMCP surface. The agent sees the new tools immediately and can call them. One demo, two surprises:

1. A page tool returns rich, interactive UI rendered inside the AI's chat.
2. That UI grows new tools back to the AI mid-conversation.

This is the segment's "wow" — and it pays off the talk's thesis that web pages and AI agents are now bidirectional peers, not request/response.

## Why this pattern (research summary)

- **MCP Apps (SEP-1865)** became the official MCP extension for tool→UI on **2026-01-26**. Tools return a `_meta.ui.resourceUri`; host fetches `text/html;profile=mcp-app`; renders in sandboxed iframe; bidirectional JSON-RPC over `postMessage`. Spec: https://modelcontextprotocol.io/extensions/apps/overview
- **mcp-ui** is the community project that pioneered the pattern and merged into MCP Apps. Repo: https://github.com/MCP-UI-Org/mcp-ui
- **WebMCP-org/mcp-ui-webmcp** is the reference repo combining MCP Apps with `navigator.modelContext`. The Tic-Tac-Toe demo there does the *exact* pattern we want: a tool returns an iframe game, the iframe registers `tictactoe_move` / `tictactoe_reset` back via `navigator.modelContext.registerTool`, and the agent then plays the game. Repo: https://github.com/WebMCP-org/mcp-ui-webmcp · Live: https://mcp-ui.mcp-b.ai · Apps demo: https://beattheclankers.com
- **WebMCP rich-content proposal** (HTML in tool results) is open at https://webmachinelearning.github.io/webmcp/docs/proposal.html — not yet in Chrome 146 Canary natively, but the MCP-Apps pattern of returning a resource URI works today when the WebMCP page itself acts as host.
- Scaffold for reference: `npx @mcp-b/create-webmcp-app` · Docs: https://docs.mcp-b.ai/building-mcp-ui-apps · Chrome guidance: https://developer.chrome.com/blog/webmcp-mcp-usage

## Target user flow (the on-stage demo)

1. Daniel opens `/webmcp` in Chrome 146 Canary on a clean profile. The Recipe Workbench loads (existing meal-plan column on the right, empty by default).
2. Daniel opens the side-panel chat. (Either Claude with the WebMCP bridge enabled, or a small in-page chat using `LanguageModel`. Decide based on what's stable — see "Open question" below.)
3. Daniel types: *"Find me a 30-minute chicken recipe and add it to tonight's plan."*
4. The agent calls the WebMCP tool `searchRecipes({ ingredient: "chicken", maxMinutes: 30 })`.
5. The tool returns an **MCP Apps UI resource** — a recipe-card carousel rendered as a sandboxed iframe **inside the chat bubble**. Each card has a "Pick" button.
6. Daniel clicks "Pick" on one card. The iframe calls `navigator.modelContext.registerTool('commitRecipeToPlan', { recipeId })`.
7. The agent discovers the new tool *in the next turn* and calls `commitRecipeToPlan({ recipeId: "..." })`.
8. The page's meal-plan column on the right updates in real time. The chat agent confirms in text.
9. Closing line from Daniel: *"That UI was returned by a tool. That UI registered another tool. Zero DOM scraping. Zero backend."*

The whole thing should run in **under 90 seconds of stage time** with no failed inferences. Pre-warm the recipe data so step 5 is instant.

## Architecture (within existing project conventions)

Follow the existing demo pattern from CLAUDE.md exactly:

```
chat/src/app/webmcp/
  WebMCPPage.tsx                  # /webmcp route, hosts the workbench + chat panel
  components/
    MealPlanColumn.tsx            # right-side meal plan state
    ChatPanel.tsx                 # side-panel chat (renders MCP-Apps UI resources)
    UIResourceFrame.tsx           # sandboxed iframe renderer for tool-returned UI
    RecipeCardCarousel.tsx        # the in-iframe component (lives in a separate bundle / inline HTML)
  services/
    WebMCPService.ts              # registers searchRecipes + commitRecipeToPlan with navigator.modelContext
    RecipeStore.ts                # IndexedDB-backed recipe + plan persistence (constraint from CLAUDE.md)
    UIResourceProtocol.ts         # postMessage RPC, resource fetching, iframe sandboxing
chat/src/app/docs/webmcp.md       # demo page docs (rendered via DocsRenderer)
chat/src/app/AppRouter.tsx        # add /webmcp route
chat/src/app/<Nav>.tsx            # add WebMCP nav link
```

**Why each piece:**

- `WebMCPService.ts` — calls `navigator.modelContext.registerTool` on mount for `searchRecipes`. The `commitRecipeToPlan` tool is registered *dynamically by the iframe* (post step 6 in the user flow). Store the unregister function for cleanup on route change.
- `UIResourceProtocol.ts` — implements the MCP Apps protocol: serve the UI resource (HTML blob URL or data URL is fine for the demo; no need to host externally), wire `postMessage`, expose a typed bridge so the iframe can call back into the page's WebMCP surface.
- `UIResourceFrame.tsx` — sandboxed iframe with `sandbox="allow-scripts"` (no `allow-same-origin`), CSP that denies fetch by default, ResizeObserver to sync height into the chat bubble.
- `RecipeCardCarousel.tsx` — keep it visually polished. This is what the audience stares at. Use the existing Tailwind tokens / dark mode wiring via `ThemeProvider`.

## Key APIs (reference signatures, verify against current Chrome 146 docs)

```ts
// Register a tool on page mount
const handle = await navigator.modelContext.registerTool({
  name: 'searchRecipes',
  description: 'Search recipes by ingredient and max prep time',
  inputSchema: { /* JSON Schema */ },
  async execute({ ingredient, maxMinutes }) {
    const recipes = await RecipeStore.search({ ingredient, maxMinutes });
    const html = renderCarouselHTML(recipes); // string
    const resourceUri = await UIResourceProtocol.createResource(html);
    return {
      content: [{ type: 'text', text: `Found ${recipes.length} recipes.` }],
      _meta: { 'ui.resourceUri': resourceUri },
    };
  },
});

// Inside the iframe (after Pick click)
window.parent.postMessage({
  jsonrpc: '2.0',
  method: 'navigator.modelContext.registerTool',
  params: {
    name: 'commitRecipeToPlan',
    description: 'Commit a selected recipe to tonight’s meal plan',
    inputSchema: { type: 'object', properties: { recipeId: { type: 'string' } }, required: ['recipeId'] },
  },
}, '*');
```

Verify exact shapes against:
- https://docs.mcp-b.ai/building-mcp-ui-apps
- https://github.com/WebMCP-org/mcp-ui-webmcp (the Tic-Tac-Toe handler is the closest analog)
- https://webmachinelearning.github.io/webmcp/docs/proposal.html

## Constraints (from project CLAUDE.md)

- **Native-only** — no `@mcp-b/global` polyfill. If `navigator.modelContext` is undefined, render a banner.
- **No backend.** Recipes seed from a static JSON in the bundle; persistence via IndexedDB only.
- **Don't touch** `mcp/`, `mcp-client/`, `devops/awsweb/`.
- **TypeScript strict** — no `any` at API boundaries. Type `navigator.modelContext` via the existing `chrome-llm-ts` library pattern if needed.
- **Tests** — at least one Vitest spec covering `WebMCPService.registerTool` mount/unmount and the post-message bridge happy path. Don't aim for exhaustive coverage; the milestone is "2-minute demo," not reference quality.
- **GSD** — commit atomically per phase. Run `/gsd-progress` first to see where the current state sits, then plan the next phase before executing.

## Acceptance criteria (the 2-min demo)

1. ✅ `/webmcp` loads in Chrome 146 Canary without errors. Banner appears if `navigator.modelContext` is absent.
2. ✅ Side-panel chat connects to an MCP host (Claude desktop with WebMCP bridge OR an in-page chat using `LanguageModel`). Decide which once.
3. ✅ Calling `searchRecipes` from the chat returns a visible recipe-card carousel rendered inside the chat bubble. Cards are styled, not raw HTML.
4. ✅ Clicking "Pick" on a card registers `commitRecipeToPlan` and the agent calls it within one turn.
5. ✅ The meal-plan column on the right updates without a full page refresh.
6. ✅ The end-to-end demo runs in under 90s on Daniel's laptop, repeatably (test 5 cold runs).
7. ✅ A "kicker" data-attribute or DevTools-friendly marker is present so Daniel can show the Network tab — zero outbound requests during the demo flow.

## Open question for Daniel (decide before phase planning)

**Which agent drives the chat panel?**

- **Option A — Claude desktop + WebMCP bridge.** Most reliable tool-calling; Claude already supports MCP Apps. Cost: requires the bridge extension installed and the audience seeing an external app on screen.
- **Option B — In-page chat using `LanguageModel.create({ tools: [...] })`.** Self-contained, more impressive ("the whole agent is on this laptop"), but Gemini Nano tool-calling is reportedly flaky for multi-step calls.

Recommendation: **Option A for the live demo, Option B as a teaser at the end of the talk** with a closing slide "yes, you can run the agent locally too — repo link."

## Reference checklist for the dev

- [ ] Read `.planning/PROJECT.md` and `.planning/ROADMAP.md` first.
- [ ] Clone `https://github.com/WebMCP-org/mcp-ui-webmcp` and run the Tic-Tac-Toe demo locally — that's the closest working analog.
- [ ] Skim the MCP Apps overview: https://modelcontextprotocol.io/extensions/apps/overview
- [ ] Skim Chrome 146 WebMCP guide: https://developer.chrome.com/blog/webmcp-mcp-usage and https://bug0.com/blog/webmcp-chrome-146-guide
- [ ] Check Patrick Brosset's WebMCP-updates post for any spec drift since: https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/
- [ ] Run `/gsd-progress`, then `/gsd-discuss-phase` for the next planned phase before coding.

## Out of scope (don't do these in this milestone)

- Cross-tab / cross-origin WebMCP. Single page, single origin only.
- Agent fallback for non-Chrome browsers. Banner is fine.
- Production polish — animations, fancy carousels, mobile responsive. The demo runs on a laptop projected to a screen. Optimize for that resolution and that resolution only.
- Recipe data correctness or quantity. 12 seeded recipes is enough.
- Persistence across reloads in a polished way. IndexedDB is enough; resetting on reload is acceptable.
