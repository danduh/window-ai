# Declarative WebMCP — HTML forms as agent tools

Declarative WebMCP turns an ordinary HTML `<form>` into a tool that an AI agent can discover and call. You add two attributes, `toolname` and `tooldescription`, and the browser does the rest: it registers the tool, builds a JSON Schema from the form's fields, fills the form when an agent calls it, and submits it. There is no `registerTool()` call and no JavaScript is required.

It is the HTML counterpart of the imperative API (`document.modelContext.registerTool()`) documented on the **API Documentation** tab. Both produce the same kind of tool; agents can't tell them apart.

> **Status (October 2026).** Declarative WebMCP ships with WebMCP: an **origin trial from Chrome 149**, or the `chrome://flags/#enable-webmcp-testing` flag for local development. Everything on this page was verified against **Chrome Canary 157**. The spec is a Draft Community Group Report and parts are still marked TBD — see the [declarative API explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md) and [Chrome's declarative API guide](https://developer.chrome.com/docs/ai/webmcp/declarative-api).

## Overview

| | Imperative API | Declarative API |
|---|---|---|
| How you define a tool | `document.modelContext.registerTool({ name, description, inputSchema, execute })` | `<form toolname="…" tooldescription="…">` |
| Input schema | You write the JSON Schema | Chrome generates it from the form fields |
| Who runs the action | Your `execute()` function | The form submission (navigation, or your `submit` handler) |
| Human in the loop | Up to you | Built in: by default the agent only fills the form and the person submits it |
| JavaScript needed | Yes | No (optional, to return a structured result) |

Use the declarative API when the action already exists as a form — search, filters, checkout steps, contact and booking forms. Use the imperative API when the action has no form, or the result needs real computation.

## Enabling it

1. **Local development:** open `chrome://flags/#enable-webmcp-testing`, set it to **Enabled**, and relaunch. This one flag turns on both the imperative and the declarative API.
2. **A deployed site:** register your origin for the WebMCP origin trial (Chrome 149+) and add the token to your pages.
3. **Automation / headless Chrome:** launch with `--enable-features=WebMCP,DeclarativeWebMCP`.

WebMCP only exists in secure contexts (HTTPS or `localhost`). Feature-detect it:

```javascript
if ("modelContext" in document) {
  // WebMCP is available: <form toolname> elements are being registered.
}
```

Pages that don't have WebMCP lose nothing: the attributes are ignored and the forms keep working for people.

## Turning a form into a tool

```html
<form toolname="searchProducts"
      tooldescription="Search the catalog by category and maximum price."
      toolautosubmit
      action="/search">
  <label>Category
    <select name="category" required
            toolparamdescription="Product category. Use 'all' for every category.">
      <option value="all">All categories</option>
      <option value="audio">Audio</option>
      <option value="displays">Displays</option>
    </select>
  </label>
  <label>Max price
    <input type="number" name="maxPrice" min="1" max="2000"
           toolparamdescription="Maximum price in US dollars.">
  </label>
  <button type="submit">Search</button>
</form>
```

The form is registered as soon as it is in the document — including forms inserted later by JavaScript or a framework. Removing the form from the DOM unregisters the tool. Changing `toolname` or `tooldescription` replaces it.

### Form attributes

| Attribute | Required | Meaning |
|---|---|---|
| `toolname` | Yes | The tool's name, as the agent sees it. |
| `tooldescription` | Yes | What the tool does and when to use it. Agents choose tools by this text, so write it for them. |
| `toolautosubmit` | No | A boolean attribute. When present, the agent fills **and submits** the form. When absent, the agent only fills it, and the person reviews and submits. |

A form with only one of `toolname` / `tooldescription` is **not** registered. Chrome reports the mistake as a DevTools Issue (`FormModelContextMissingToolName` or `FormModelContextMissingToolDescription`).

### Field attributes

| Attribute | Meaning |
|---|---|
| `name` | Becomes the property name in the schema. A control without `name` is skipped (Issue: `FormModelContextParameterMissingName`). |
| `toolparamdescription` | Becomes the property's `description`. If it's missing, Chrome uses the control's `<label>` text. With neither, the property has no description (Issue: `FormModelContextParameterMissingTitleAndDescription`). |
| `required`, `min`, `max`, `step`, `pattern` | Carried into the schema as `required`, `minimum`, `maximum`, `multipleOf`, `pattern`. |

## The schema Chrome generates

You never write the schema; you can read it back with `document.modelContext.getTools()`. Chrome Canary 157 maps controls like this:

| Control | JSON Schema |
|---|---|
| `<input type="text">`, `<textarea>` | `{ "type": "string" }` |
| `<input type="number" min max>` | `{ "type": "number", "minimum", "maximum", "multipleOf" }` (`multipleOf` comes from `step`, default `1`) |
| `<input pattern="…">` | `"pattern": "…"` |
| `<input type="checkbox">` | `{ "type": "boolean" }` |
| `<select>` | `{ "type": "string", "anyOf": [{ "const": value, "title": option text }], "enum": [values] }` |
| Radio group (same `name`) | Same as `<select>`; each `title` comes from the radio's label |
| `required` | The property is listed in the top-level `required` array |

For example, this cart form:

```html
<form toolname="addToCart"
      tooldescription="Add a product to the shopping cart by SKU, with a quantity from 1 to 10.">
  <select name="sku" required toolparamdescription="The product to add, identified by its SKU.">
    <option value="hp-100">Studio Headphones — $89</option>
    <option value="kb-310">Mechanical Keyboard — $79</option>
  </select>
  <input type="number" name="quantity" min="1" max="10" value="1" required
         toolparamdescription="How many units to add, from 1 to 10.">
  <button type="submit">Add to cart</button>
</form>
```

becomes this tool input schema:

```json
{
  "type": "object",
  "properties": {
    "sku": {
      "type": "string",
      "anyOf": [
        { "type": "string", "const": "hp-100", "title": "Studio Headphones — $89" },
        { "type": "string", "const": "kb-310", "title": "Mechanical Keyboard — $79" }
      ],
      "enum": ["hp-100", "kb-310"],
      "description": "The product to add, identified by its SKU."
    },
    "quantity": {
      "type": "number",
      "minimum": 1,
      "maximum": 10,
      "multipleOf": 1,
      "description": "How many units to add, from 1 to 10."
    }
  },
  "required": ["sku", "quantity"]
}
```

The option text ends up in `title`, so the agent sees "Studio Headphones — $89" next to `hp-100`. Put the information an agent needs to choose into the option text.

## What happens when an agent calls the tool

1. Chrome fills the form fields with the agent's arguments.
2. The form matches `:tool-form-active` and its submit button matches `:tool-submit-active`, and `toolactivated` fires on `document.modelContext`.
3. **With `toolautosubmit`**, Chrome submits the form right away. **Without it**, the call waits until the person submits the form — this is the human-in-the-loop default.
4. The form submits like any other form, and the agent receives the result (see below).

Fields the agent doesn't pass keep their current values. If a tool should start from a clean state, reset the form or set sensible defaults.

### Validation

Chrome checks the agent's arguments against the form, and the call fails instead of submitting:

- **Values that can't be filled in at all** — an option that isn't in the `<select>`, or the wrong type — fail the call immediately, on any form.
- **Values that break the form's constraints** (`min`/`max`, `required`, `pattern`) fail when the form is submitted. With `toolautosubmit` that is right away. Without it, the value is filled in; when the person presses submit, the browser shows its usual validation message, blocks the submission, and the agent's call fails.

| Agent input | Result |
|---|---|
| Value outside `min`/`max` | Rejected: `Form validation failed: quantity: Value must be less than or equal to 10.` |
| `required` field left empty | Rejected: `Form validation failed: city: Please fill out this field.` |
| Value that fails `pattern` | Rejected: `Form validation failed: code: Please match the requested format.` |
| A `<select>` or radio value that isn't one of the options | Rejected: `Invalid value "zzz" for parameter sku` |
| Wrong type (a word for a number) | Rejected: `Invalid value "seven" for parameter quantity` |

The form's own constraints are your first line of defense. Still validate on the server or in your handler, exactly as you would for a person.

### Returning a result to the agent

What the agent gets back depends on how the form submits:

- **With JavaScript — `SubmitEvent.respondWith()`.** Cancel the navigation and hand the agent a structured result. This is the most useful option and what the live example on this page uses:

  ```javascript
  form.addEventListener("submit", (event) => {
    event.preventDefault();               // stay on the page
    const data = Object.fromEntries(new FormData(event.target));
    const result = { added: data.sku, cartSize: addToCart(data) };

    if (event.agentInvoked) {
      // Must be called synchronously, during the submit event.
      event.respondWith(Promise.resolve(result));
    }
  });
  ```

  The agent receives the result as JSON. `event.agentInvoked` is `true` whenever an agent started the call — even when the person pressed the submit button to confirm it.

- **Without JavaScript — navigation.** The form submits normally. Per the explainer, the response is taken from the first `<script type="application/ld+json">` on the page the form navigates to (or the page content if there is none). This part of the spec is still marked TBD.

- **No navigation and no `respondWith()`** — for example a `method="dialog"` form outside a dialog: the call succeeds and the agent receives `null`. The page may update visibly, but the agent learns nothing. Prefer `respondWith()` or a real navigation.

### Cancelling

Calling `form.reset()` while a call is waiting cancels it; the agent's call fails with `Tool execution cancelled by a form reset`. `toolcancel` fires when the **agent** cancels, not when the page does.

## Styling agent activity

Two pseudo-classes let you show the person what the agent is doing — useful for the default human-in-the-loop flow, where the person must check a pre-filled form:

```css
/* The form an agent is filling or submitting. */
form:tool-form-active {
  outline: 3px solid #6366f1;
  outline-offset: 3px;
}

/* Its submit button. */
form button:tool-submit-active {
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.55);
}
```

Keep these in **separate rules**. A browser that doesn't recognize a pseudo-class drops the whole rule, so combining them with other selectors in one list would break those selectors too. Both pseudo-classes clear after the form is submitted, reset, or cancelled.

## Events

All three fire on `document.modelContext`:

| Event | Fires when |
|---|---|
| `toolchange` | The set of registered tools changes — for example a `<form toolname>` was added or removed. |
| `toolactivated` | An agent has filled a declarative form (before submission). `event.toolName` names the tool. |
| `toolcancel` | The agent cancelled a call. Not fired for page-initiated cancellation such as `reset()`. |

```javascript
document.modelContext.addEventListener("toolactivated", (event) => {
  console.log(`Agent filled ${event.toolName} — waiting for the user to confirm`);
});
```

## Inspecting tools from the console

With WebMCP enabled you can list and run tools from DevTools — the same path an agent uses:

```javascript
// Every tool on the page: declarative forms and registerTool() tools.
const tools = await document.modelContext.getTools();
console.table(tools.map((t) => ({ name: t.name, description: t.description })));
console.log(JSON.stringify(tools[0].inputSchema, null, 2));

// Run one. Pass a plain object (Chrome Canary 157 rejects a JSON string).
const addToCart = tools.find((t) => t.name === "addToCart");
const result = await document.modelContext.executeTool(addToCart, { sku: "kb-310", quantity: 2 });
console.log(result);   // the JSON passed to respondWith(), or null
```

The DevTools **Issues** panel lists the declarative mistakes described above.

## A zero-JavaScript version

The live example on this page is rendered by React, so it uses a small `submit` handler to return results with `respondWith()`. The same two tools also exist as a single HTML file with **no JavaScript at all**: [declarative-webmcp.html](/assets/examples/declarative-webmcp.html).

Without JavaScript you still get registration, schema generation, agent filling, auto-submit and the human-confirm flow. That file filters the product list with CSS (`:has()` reads the selected options) and shows the cart confirmation with `:target`. What you lose is the result: with no `respondWith()` and no navigation, the agent receives `null`. To return data without JavaScript, point the form's `action` at a page that carries a `<script type="application/ld+json">` result.

## Best practices

1. **Write descriptions for an agent.** `tooldescription` decides whether the agent picks the tool; `toolparamdescription` decides whether it fills fields correctly. Say what the tool does, what it returns, and any limits.
2. **Keep `toolautosubmit` for safe actions.** Searching and filtering can auto-submit. Anything that spends money, sends a message or changes data should leave it off, so the person confirms.
3. **Use real constraints.** `required`, `min`, `max`, `pattern` and `<select>` options all reach the schema and are enforced before submission.
4. **Return a result.** Use `respondWith()` (or navigate to a page with JSON-LD) so the agent knows what happened.
5. **Make the agent visible.** Style `:tool-form-active` so the person can see which form the agent filled.
6. **Every field needs a `name`** and either a `toolparamdescription` or a `<label>`.

## Limitations

- The schema-generation rules and the navigation-response rules are still marked TBD in the explainer and may change.
- Behavior can differ between Chrome versions; this page reflects Chrome Canary 157.
- A tool exists only while its form is in the document; it disappears when the form is removed or the page is closed.
- WebMCP is only available in Chromium-based browsers today. Other browsers ignore the attributes and the forms keep working normally.

## References

- Declarative API explainer — https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
- Chrome: declarative API guide — https://developer.chrome.com/docs/ai/webmcp/declarative-api
- WebMCP spec (Draft CG Report) — https://webmachinelearning.github.io/webmcp/
- The imperative API — the **API Documentation** tab on this page
