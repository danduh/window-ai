# WebMCP — The Page as a Tool Surface

## What WebMCP is

WebMCP (`document.modelContext`) lets a web page expose its in-page actions as **discoverable, callable tools** that AI agents — both in-page LanguageModel sessions and external browser-resident agents — can invoke.

> **Entry point moved.** As of Chrome 150, `navigator.modelContext` is **deprecated** in favor of `document.modelContext`. Feature-detect both so code keeps working across Chrome 146–150:
> ```js
> const modelContext = document.modelContext ?? navigator.modelContext;
> ```

The pitch: the page is the trust boundary. Anything the page's JS can do (read IndexedDB, mutate DOM, call same-origin APIs with the user's cookies), a registered tool can do, because the tool's `execute` runs in the page's context. Agents drive the page the user is already signed into, with **no separate auth handshake**.

This is the opposite of running a local MCP server. There, the agent talks to a process; here, the agent talks to the page. The page already has the user's session — no auth, no API key, no infrastructure.

### Session inheritance — the key idea

The reason WebMCP is more than a convenience is **session inheritance**: the agent is a *guest in the user's tab*. It reuses the user's existing login, cookies, and permissions. A tool like `purchase()` or `book()` works with no separate auth, no API key, no OAuth dance — because `execute` runs as the logged-in user, same as if they'd clicked the button themselves. The page author decides which actions are exposed; the browser guarantees they run in the user's own session.

## Status — read this before getting excited

- **W3C draft**, still a moving target. **Not** a W3C Recommendation.
- Status has advanced: WebMCP is a public **origin trial from Chrome 149** (it was flag-only back in Chrome 146). For local dev, enable `chrome://flags/#enable-webmcp-testing`; for a deployed origin, register an origin-trial token.
- Entry point changed: `document.modelContext` in Chrome 150; `navigator.modelContext` is deprecated (feature-detect both).
- **Edge 147+** added support in March 2026.
- The API is still evolving. Chrome 150 adds `unregisterTool(name)` and `clearContext()` alongside `registerTool`; `provideContext` replaces the full toolset. The **`AbortSignal` path** (abort to unregister) is portable across Chrome 146–150 and is the recommended pattern.
- **Do not ship to production.** It's a W3C draft that is still moving — build with it to learn; don't bet a product on it yet.

## The whole API surface

One entry point, a small method set, one descriptor shape:

```ts
interface ModelContext {
  // Register a single tool. Abort the signal to unregister it (portable across 146–150).
  registerTool(tool: ModelContextTool, options?: {
    signal?: AbortSignal;
    exposedTo?: unknown;        // optional visibility control
  }): void;

  // Added in Chrome 150 — explicit teardown.
  unregisterTool(name: string): void;
  clearContext(): void;

  // Replaces the full toolset in one call.
  provideContext(tools: ModelContextTool[]): void;
}

interface ModelContextTool {
  name: string;                 // unique within the page
  description: string;          // free-form; agents use this for tool selection
  inputSchema?: object;         // JSON Schema for the input
  annotations?: { readOnlyHint?: boolean };
  execute(input: Record<string, unknown>): Promise<unknown>;
}
```

To unregister a tool you have two options: abort the `AbortSignal` you passed at registration (works everywhere from Chrome 146 on — **prefer this for portability**), or, on Chrome 150+, call `unregisterTool(name)` / `clearContext()`.

## Minimal example

```js
const modelContext = document.modelContext ?? navigator.modelContext;

if (!modelContext) {
  showBanner('Enable chrome://flags/#enable-webmcp-testing to use this feature.');
  return;
}

const controller = new AbortController();

modelContext.registerTool(
  {
    name: 'scaleRecipe',
    description: 'Scale the active recipe to a new servings count. Updates ingredient quantities in place.',
    inputSchema: {
      type: 'object',
      properties: {
        servings: { type: 'integer', minimum: 1, description: 'Target servings' },
      },
      required: ['servings'],
      additionalProperties: false,
    },
    async execute({ servings }) {
      const recipe = await getActiveRecipe();
      const scaled = scaleQuantities(recipe, servings);
      await saveRecipe(scaled);
      return `Scaled "${recipe.name}" to ${servings} servings.`;
    },
  },
  { signal: controller.signal }
);

// On unmount:
controller.abort();
```

## Field-by-field

- **`name`** — `[A-Za-z0-9_\-.]{1,128}`. Agents address tools by this string. Use short camelCase verbs (`scaleRecipe`, `swapIngredient`).
- **`description`** — free-form sentence. This is the *primary* documentation the agent sees. Lead with the verb, call out side effects, mention optional parameters.
- **`inputSchema`** — JSON Schema (use `type: 'object'`, `additionalProperties: false`, explicit `required`). Agents reject mis-shaped inputs before `execute` runs.
- **`annotations.readOnlyHint`** — set `true` for tools that don't mutate state. Agents may reorder or cache the call. Default = mutating.
- **`execute`** — async; receives the input as `Record<string, unknown>` (validate inside), returns `Promise<unknown>` whose value is serialized back to the agent.

## The lifecycle

1. **Mount** — page loads. A React effect (or DOMContentLoaded handler) creates an `AbortController` and calls `registerTool` per tool.
2. **Visibility** — agents (in-page or external) discover tools via `document.modelContext` (or `navigator.modelContext` on older builds). Chrome ships a "WebMCP Tool Inspector" extension that surfaces them in DevTools.
3. **Invocation** — agent calls a tool by name with JSON-schema-shaped input. Browser routes to the descriptor's `execute`.
4. **Result** — `execute` resolves; browser serializes the value back. Errors thrown reject the call.
5. **Unmount** — page navigates away (implicit), or component cleanup calls `controller.abort()` (explicit). All registrations under that controller are torn down.

There is **no connect / handshake** step. Registration IS the handshake.

## Why this is interesting

For 25 years, "automation of a web app" meant:

- Build a public API + auth flow
- OR a Selenium/Playwright script that pretends to be a user
- OR a screen-scraper

WebMCP makes a *fourth* option: the page declares its actions, and any agent — including the LanguageModel sitting in the same tab — can invoke them. The user's session is reused, no API keys are issued, no separate auth flow exists, and the page author chose which actions are exposed.

For internal tools, dashboards, and complex web apps with deep state, this is a fundamentally new affordance.

## Two real-world patterns

### Pattern 1 — In-page agent driving the same page

```js
// Page registers its tools
const modelContext = document.modelContext ?? navigator.modelContext;
modelContext.registerTool(searchRecipesTool, { signal });
modelContext.registerTool(scaleRecipeTool, { signal });
modelContext.registerTool(generateShoppingListTool, { signal });

// Page also opens an in-page LanguageModel session that sees those tools
const session = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'You are a sous chef. Use the page tools to help the user.' }],
  // The tools registered via modelContext are visible automatically
});

// User: "Scale the chocolate cake to 12 servings and show me what I need to buy"
// Session: invokes scaleRecipe({ servings: 12 }), then generateShoppingList()
```

### Pattern 2 — External agent driving the page

A browser extension (e.g., Chrome's Tool Inspector or a Claude/Gemini browser agent) sees the registered tools and calls them on the user's behalf. The page doesn't need to know who's calling — the API is the same.

This is the pattern that makes "AI agent does my work" feel less science-fiction. The agent runs in the user's browser, in the user's session, with only the tools the page chose to expose.

## Why structured tools beat pixel-peeping

The status-quo "agent" reads a screenshot of the page, guesses where to click, clicks, re-screenshots, repeats. WebMCP replaces that with structured tool calls. The efficiency difference is large:

- **~98% task accuracy** — the agent calls a named tool with a validated schema instead of guessing at coordinates.
- **~89% fewer tokens** — no page images to feed through the model.
- **~68% less overhead** — fewer round-trips, no vision pipeline.

Structured tools beat pixel-peeping. When the page tells the agent exactly what it can do, the agent stops hallucinating a UI it has to reverse-engineer from pixels.

## Who's already experimenting

WebMCP isn't purely academic. Real adopters are already prototyping against it: **Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, and Redfin**. These are exactly the "deep-state, transactional web app" cases where session inheritance pays off — booking, checkout, filing, listing.

Google has also shipped a **demo suite** to show the API off end-to-end:

- A **maze** you escape by prompting an agent to drive the page.
- **CineFlow** — a movie-ticket booking app.
- **L'Atelier** — a hotel booking app.
- A **smart-home** control demo.

## What NOT to expose

Treat `inputSchema` and `description` as the contract — every field is callable by an agent that hallucinates plausible inputs. So:

- **Never expose a tool that takes free-form SQL, shell, or eval.** Yes, an agent will try.
- **Validate inputs inside `execute`.** The JSON schema check happens before, but be defensive.
- **Don't expose destructive actions without a confirmation step.** `deleteAccount` should not be one tool call. Make it a two-step flow.
- **Don't expose tools that bypass user-visible UI.** If the user can't see what the agent did, you've built an undetectable autopilot.

The threat model: agents will compose tool calls in ways you didn't anticipate. The page author is responsible for ensuring no composition is harmful.

## The interesting design question for product teams

If you accept that AI agents will eventually drive complex web apps on the user's behalf, **the surface area you expose via WebMCP is your product's agent interface**. It's a new UI layer, with its own design language — tool naming, descriptions, error messages, confirmation steps.

The teams that take this seriously in 2026 will have a head start when WebMCP stabilizes (target: late 2026). The teams that wait will retrofit it later.

## Why it's NOT in production for this project

The window-ai showcase site exposes a Recipe Workbench at `/webmcp` that uses this API. It's gated behind:

- Feature detection (`document.modelContext ?? navigator.modelContext`)
- A `MissingFlagBanner` for browsers without the flag / origin-trial token

The page works read-only for everyone; agentic features only light up when the flag is on. That's the right pattern for shipping anything that depends on a draft API — make the page useful without the feature, light up the feature when it's there.
