# WebMCP API — Recipe Workbench guide

WebMCP lets a web page expose its own actions as tools that AI agents can discover and call. The page registers each tool with `document.modelContext.registerTool()`; an agent — an in-page `LanguageModel` session, a browser agent, or an extension — sees the tools, calls them, and your `execute` function runs inside the page, with the user's session and DOM.

> **Status (October 2026).** WebMCP is a **Draft Community Group Report** of the W3C Web Machine Learning Community Group (snapshot: **9 October 2026**), not a W3C standard. In Chrome it is in **origin trial from Chrome 149 through 156**, with no stable ship milestone announced, and behind `chrome://flags/#enable-webmcp-testing` for local development. Behavior on this page was verified against **Chrome Canary 157**. Spec: https://webmachinelearning.github.io/webmcp/ · Chrome docs: https://developer.chrome.com/docs/ai/webmcp

> **Declarative WebMCP.** You don't always need `registerTool()`. A plain HTML `<form>` with `toolname` and `tooldescription` attributes becomes a tool too, and Chrome builds its input schema from the form fields. See the **Declarative** tab for a live product-search and add-to-cart example and the full guide.

## Overview

WebMCP is a browser-mediated alternative to running a separate Model Context Protocol (MCP) server: the page itself is the tool surface. Tools are registered against the live document, run with the user's signed-in session and DOM, and disappear when the page goes away.

The whole surface lives on one object, `document.modelContext`:

| Member | What it does |
|---|---|
| `registerTool(tool, options?)` | Registers a tool. Returns a Promise. |
| `getTools(options?)` | Lists the registered tools (imperative and declarative). |
| `executeTool(tool, input?, options?)` | Runs a tool the way an agent does. |
| `toolchange` event | Fires when the set of tools changes. |
| `toolactivated`, `toolcancel` events | Fire for declarative (form) tools — see the **Declarative** tab. |

To unregister a tool, abort the `AbortSignal` you passed to `registerTool()`. There is no `unregisterTool()` or `clearContext()`.

The page is the trust boundary. Anything the page's JavaScript can do — read IndexedDB, change the DOM, call a same-origin API with the user's cookies — a registered tool can do, because `execute` runs in the page. That is the point: an agent drives the page the user is already signed into, with no separate auth handshake.

## Browser Support

- **Chrome 149–156** — public **origin trial**. Register your origin (trial ID `4163014905550602241`) and add the token to your pages.
- **Chrome, local development** — enable `chrome://flags/#enable-webmcp-testing` and relaunch. The same flag enables the declarative API.
- **Microsoft Edge** — available for testing in Edge Canary and Dev behind `edge://flags/#enable-webmcp-testing`, and through Microsoft's own origin trial.

Other browsers don't implement WebMCP. `document.modelContext` only exists in secure contexts (HTTPS or `localhost`), so feature-detect before using it:

```javascript
if ("modelContext" in document) {
  // WebMCP is available.
} else {
  // Show a fallback; the page should keep working for people.
}
```

On this site, the Recipe Workbench shows a yellow banner when WebMCP is missing; the recipe browser itself stays usable.

**Production readiness.** The API is still changing between drafts. Don't ship to production yet.

## API Surface

### `document.modelContext.registerTool(tool, options?)`

Registers a tool. When an agent calls it, the tool's `execute` function runs in the page.

**Parameters:**

- `tool` — the tool descriptor (see "Descriptor shape" below).
- `options.signal` — an `AbortSignal`. Aborting it unregisters the tool. Calls that are already running are not interrupted (Chrome 153+).
- `options.exposedTo` — a list of origins allowed to see the tool from other sites. Tools are private to the page by default (see "Security & Permission Model").

**Returns:** a Promise that resolves (to `undefined`) once the tool is registered. It **rejects** with `InvalidStateError: Duplicate tool name` if a tool with the same `name` is already registered — so `await` it and handle the rejection.

**Lifetime.** A tool stays registered until its `AbortSignal` aborts or the page goes away. One `AbortController` can cover several tools, so one `abort()` removes them all.

### Descriptor shape

```javascript
const tool = {
  name: "scaleRecipe",              // required — what the agent calls
  title: "Scale recipe",            // optional — human-readable label
  description: "…",                 // required — when and why to use the tool
  inputSchema: { type: "object" },  // JSON Schema for the input object
  annotations: {                    // optional hints, all default to false
    readOnlyHint: false,
    untrustedContentHint: false,
    consequentialHint: false,
  },
  async execute(input, { signal }) {
    // input: the agent's arguments, already parsed from JSON
    // signal: aborts if the call is cancelled
    return "a string, or any JSON-serializable value";
  },
};
```

### Field-by-field

- **`name`** (required) — the identifier agents call. Short, descriptive camelCase reads best (`scaleRecipe`, `swapIngredient`). Chrome recommends staying under 30 characters.
- **`title`** (optional) — a human-readable label shown by tools such as inspectors.
- **`description`** (required) — the agent's main documentation for the tool, and how it decides *when* to call it. Lead with the verb ("Scale a recipe to…"), spell out side effects, and mention optional parameters. Chrome recommends at most 500 characters.
- **`inputSchema`** — JSON Schema for the input. Use `type: "object"` with `properties`, list `required` fields, and set `additionalProperties: false`. Give each property a `description` (Chrome recommends at most 150 characters).
- **`annotations`** (optional) — hints for the agent and browser:
  - `readOnlyHint` — the tool doesn't change state, so it can be called with less caution.
  - `consequentialHint` — the action has real consequences (money, messages, deleting data); the agent or browser may ask the user to confirm first.
  - `untrustedContentHint` — the result contains user-generated or external content, which the agent should treat with extra suspicion.
  - `debugging` — marks a tool meant for debugging (Chrome 156+).
- **`execute(input, { signal })`** (required) — the handler. It receives the parsed input object and an options object with an `AbortSignal`, and returns (or resolves to) the result.

**What the agent receives.** A string result is passed through unchanged. Any other value is serialized to JSON. Chrome recommends keeping tool output under about 1,500 characters.

### Input schema example

```json
{
  "type": "object",
  "properties": {
    "servings": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "description": "Target number of servings"
    }
  },
  "required": ["servings"],
  "additionalProperties": false
}
```

Use plain JSON Schema types (`string`, `number`, `integer`, `boolean`, `array`, `object`, `null`). Agents do better with flat inputs than with deeply nested objects.

**Chrome does not validate the input against `inputSchema`.** In Chrome Canary 157 a string passed for an `integer` property, and a call with a `required` field missing, both reached `execute`. The schema tells the agent what to send; your handler must still check what it got.

### Events

`document.modelContext` is an `EventTarget`. The `toolchange` event fires whenever the set of registered tools changes:

```javascript
document.modelContext.addEventListener("toolchange", async () => {
  const tools = await document.modelContext.getTools();
  console.log("Tools now:", tools.map((t) => t.name));
});
```

`toolactivated` and `toolcancel` belong to declarative form tools and are covered on the **Declarative** tab.

### Lifecycle, in summary

1. **Register** — on page load, create an `AbortController` and `await registerTool()` for each tool.
2. **Discover** — agents list the tools (the same data `getTools()` returns).
3. **Invoke** — the agent calls a tool with an input object; the browser runs your `execute`.
4. **Result** — `execute` resolves; the agent receives the string, or the value as JSON. If `execute` throws, the call fails.
5. **Unregister** — call `controller.abort()`, or let the page close.

There is no separate connect or handshake step: registering is the handshake.

### Inspecting and testing tools

You can list and run tools from the DevTools console — the same path an agent takes:

```javascript
// Every tool on the page: registerTool() tools and declarative form tools.
const tools = await document.modelContext.getTools();
console.table(tools.map((t) => ({ name: t.name, title: t.title, description: t.description })));

// Run one with a plain object as input. Resolves to a string.
const scale = tools.find((t) => t.name === "scaleRecipe");
const result = await document.modelContext.executeTool(scale, { servings: 4 });
console.log(result);   // '{"ok":true,"oldServings":2,"newServings":4}'
```

Each entry from `getTools()` has `name`, `title`, `description`, `inputSchema`, `annotations`, `origin` and `window`. Pass `executeTool()` an object, not a JSON string; it resolves to `null` if the call ends in a navigation.

Other tools:

- **Model Context Tool Inspector** (Chrome Web Store) — lists a page's tools and calls them.
- **Example Agentic Chrome Extension** (`GoogleChromeLabs/webmcp-extension` on GitHub) — drives the tools with natural-language prompts.
- **Chrome DevTools** — includes WebMCP support for checking how your tools and schemas are parsed.

### Errors

- **`InvalidStateError: Duplicate tool name`** — `registerTool()` rejects when the name is already taken. In a framework that mounts components twice in development (React StrictMode, hot reload), abort the previous controller before registering again.
- **`TypeError: Cannot read properties of undefined`** — `document.modelContext` doesn't exist: no flag or origin-trial token, or the page isn't a secure context. Feature-detect first.
- **`UnknownError` from a failed call** — if `execute` throws, the agent receives a generic error ("Tool was executed but the invocation failed…") and **does not see your error message**. To let the agent recover, return a structured result instead of throwing, such as `{ ok: false, error: "servings must be at least 1" }`.

The browser doesn't report tool calls to the page. For an audit trail, log inside `execute`, or on your server if the tool calls one.

## Code Sample 1: Single-Tool Registration

A complete, runnable tool. Paste it into the console of any HTTPS page with WebMCP enabled.

```javascript
// The state this tool acts on (a real page would use its own data).
const recipe = {
  title: "Pancakes",
  servings: 2,
  ingredients: [
    { name: "flour", quantity: 200, unit: "g" },
    { name: "milk", quantity: 300, unit: "ml" },
    { name: "eggs", quantity: 2, unit: "" },
  ],
};

const scaleRecipe = {
  name: "scaleRecipe",
  title: "Scale recipe",
  description:
    "Scale the open recipe to a new number of servings. All ingredient quantities change proportionally.",
  inputSchema: {
    type: "object",
    properties: {
      servings: { type: "integer", minimum: 1, maximum: 50, description: "Target number of servings" },
    },
    required: ["servings"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute({ servings }) {
    // Chrome doesn't enforce inputSchema — validate here.
    if (!Number.isInteger(servings) || servings < 1 || servings > 50) {
      return { ok: false, error: "servings must be a whole number from 1 to 50" };
    }
    const oldServings = recipe.servings;
    const factor = servings / oldServings;
    recipe.ingredients = recipe.ingredients.map((i) => ({ ...i, quantity: i.quantity * factor }));
    recipe.servings = servings;
    return { ok: true, oldServings, newServings: servings };
  },
};

const controller = new AbortController();

if ("modelContext" in document) {
  try {
    await document.modelContext.registerTool(scaleRecipe, { signal: controller.signal });
    console.log("scaleRecipe registered");
  } catch (error) {
    console.error("Could not register scaleRecipe:", error); // e.g. a duplicate name
  }
}

// Later — for example when the user leaves this view:
// controller.abort();
```

### What the agent sees

`getTools()` reports the tool roughly like this — your descriptor, plus the `origin` and `window` it belongs to and every annotation filled in:

```json
{
  "name": "scaleRecipe",
  "title": "Scale recipe",
  "description": "Scale the open recipe to a new number of servings. All ingredient quantities change proportionally.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "servings": { "type": "integer", "minimum": 1, "maximum": 50, "description": "Target number of servings" }
    },
    "required": ["servings"],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": false,
    "untrustedContentHint": false,
    "consequentialHint": false,
    "debugging": false
  },
  "origin": "https://example.com"
}
```

When the agent calls it with `{ "servings": 4 }`, it receives the JSON string `{"ok":true,"oldServings":2,"newServings":4}`.

## Code Sample 2: One Definition, Two Consumers

The same tool definitions can serve an external agent (through `document.modelContext`) and an in-page Prompt API agent (through `LanguageModel`). Add a tool once and both consumers get it.

```javascript
// Reuses `recipe` and `scaleRecipe` from Sample 1. Remove Sample 1's
// registration first — registering the same name twice is rejected.
controller.abort();

const listIngredients = {
  name: "listIngredients",
  description: "List the open recipe's ingredients with quantities and units.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    return recipe.ingredients.map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(" ")).join("\n");
  },
};

const tools = [scaleRecipe, listIngredients];

// Consumer 1: agents outside the page (browser agents, extensions).
const toolsController = new AbortController();
for (const tool of tools) {
  await document.modelContext.registerTool(tool, { signal: toolsController.signal });
}

// Consumer 2: an in-page Prompt API session. Its tool `execute` must resolve
// to a string, so turn any other result into JSON.
const session = await LanguageModel.create({
  initialPrompts: [{ role: "system", content: "You are a recipe assistant." }],
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    async execute(input) {
      const result = await t.execute(input, { signal: new AbortController().signal });
      return typeof result === "string" ? result : JSON.stringify(result);
    },
  })),
});

console.log(await session.prompt("Scale the recipe for 6 people, then list the ingredients."));
```

- One `toolsController.abort()` removes every WebMCP registration.
- The `LanguageModel` session has its own lifecycle (`session.destroy()`); the two consumers share tool definitions, not a session.
- An error thrown in `execute` reaches the external agent as a generic `UnknownError`, while the in-page session sees whatever your adapter returns — another reason to return structured errors.

> **In this demo.** The Recipe Workbench's in-page agent uses a schema-constrained JSON dispatch loop (a `responseFormat` schema on `LanguageModel.create()`) rather than `LanguageModel.create({ tools })`, because the Prompt API's tool calling was unreliable in early Canary builds. The `tools` option works in current Chrome, so either approach is fine. The same tool definitions drive both the in-page agent and external agents.

## Security & Permission Model

WebMCP's permission model starts with "the user opened this page". There is no OAuth handshake and no permission prompt for registering tools; the page is the trust boundary.

### Who can see the tools

- **The page's own agents, by default.** Tools are private to the document that registered them. Other websites can't list or call them.
- **Other origins only if you say so.** Pass `exposedTo` to share a tool with specific origins:

  ```javascript
  await document.modelContext.registerTool(lookupOrder, {
    exposedTo: ["https://partner.example"],
  });
  ```

  Expose read-only tools only to origins you trust with the data they return, and read-write tools only to origins you trust to act for the user.
- **Cross-origin iframes need permission.** Tool registration is controlled by the `tools` Permissions Policy, allowed for the page itself (`self`) by default. A cross-origin iframe can register tools only if the parent delegates it: `<iframe src="…" allow="tools">`.

### What the agent can do

- **It acts with the user's session.** Tool handlers run with the user's cookies, storage and signed-in identity. The agent never sees those credentials; it sees only what `execute` returns.
- **It works only while the page is open.** Closing the tab or navigating away removes every tool. There is no background or service-worker registration path.

### What the page is responsible for

The browser doesn't validate input against `inputSchema` and doesn't authenticate the agent. That's the page's job:

1. **Validate input in `execute`.** Treat it as untrusted, whatever the schema says.
2. **Mark and confirm consequential actions.** Set `consequentialHint: true` on tools that spend money, send messages or delete data, so the agent or browser can ask the user first — and confirm inside the handler for anything irreversible.
3. **Flag untrusted output.** Set `untrustedContentHint: true` when a tool returns user-generated or third-party content. That content can carry prompt-injection attempts aimed at the agent.
4. **Return only what's needed.** The agent receives whatever `execute` returns; never include tokens, secrets or unnecessary personal data.
5. **Log server-side.** Browser-side logs disappear with the tab; your server's logs are the audit trail.

### Threat model in one paragraph

Prompt injection is the realistic risk: content the agent reads — a review, an email, a web page — tries to steer it into calling tools the user never intended. Chrome's own guidance is that safety inside a language model can't be guaranteed, so defenses belong in the tools: least privilege, the annotations above, confirmation for consequential actions, and validation of every input. Treat an agent on your page as having the user's full authority there. If you wouldn't expose an action as a public API endpoint, don't expose it as a tool.

## Limitations

1. **No schema enforcement.** Chrome passes the agent's input to `execute` without validating it against `inputSchema`.
2. **Error messages don't reach the agent.** A thrown error arrives as a generic `UnknownError`; return structured errors instead.
3. **Non-streaming handlers.** `execute` returns one result; there is no streaming tool output. Show progress for long operations in the page itself.
4. **Page lifetime only.** Tools exist while the document is open. There is no background registration.
5. **No polyfill in this demo.** The site uses native `document.modelContext` only; browsers without WebMCP see the banner.
6. **The spec is moving.** Members have been added and removed between drafts. This guide follows the 9 October 2026 Draft Community Group Report and Chrome Canary 157.

## References

- WebMCP spec (Draft Community Group Report, 9 October 2026) — https://webmachinelearning.github.io/webmcp/
- WebMCP repository and explainers — https://github.com/webmachinelearning/webmcp
- Chrome: WebMCP overview — https://developer.chrome.com/docs/ai/webmcp
- Chrome: imperative API — https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Chrome: declarative API — https://developer.chrome.com/docs/ai/webmcp/declarative-api
- Chrome: securing WebMCP tools — https://developer.chrome.com/docs/ai/webmcp/secure-tools
- Chrome: best practices — https://developer.chrome.com/docs/ai/webmcp/best-practices
- Chrome Status entry — https://chromestatus.com/feature/5117755740913664
- Origin trial registration — https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241
