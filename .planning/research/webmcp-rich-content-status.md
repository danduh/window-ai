# WebMCP Rich Content / UI Resources — Status Report

**Date:** 2026-05-18
**Audience:** Daniel + WebMCP Recipe Workbench dev/agent picking up the demo
**Scope:** What is *natively* in Chrome 146 Canary today vs. what is proposal-only;
how the MCP Apps (SEP-1865) iframe pattern fits on top; and what we should build
for the 90-second conference demo.

---

## TL;DR

1. **WebMCP in Chrome 146** ships only the tool-registration surface
   (`navigator.modelContext.registerTool`) — JSON-in / JSON-out. **There is no
   native rich-content / UI-resource rendering by the browser.** It is behind
   the `enable-webmcp-testing` flag and stays off by default.
2. **`_meta.ui.resourceUri` is an MCP Apps (SEP-1865) field, not a WebMCP
   field.** It went Final in the MCP spec on 2026-01-26. Chrome's WebMCP
   implementation does *not* interpret it — it just passes the tool's return
   value back to whoever called `executeTool` / received the tool result.
3. **The "host" is what renders the UI.** For traditional MCP servers, that
   host is Claude Desktop / VS Code / Goose. For WebMCP, the host is whoever
   bridges the page's `navigator.modelContext` to a model — which can be our
   own in-page chat. This is what `WebMCP-org/mcp-ui-webmcp` already does.
4. **Recommended build path for the conference demo:** Option A — implement
   the **MCP Apps iframe protocol inside our own page**. The same `chat/`
   page is both the WebMCP tool surface (registers `searchRecipes`) and the
   MCP Apps host (renders the `ui://` resource that `searchRecipes` returns
   in a sandboxed iframe, runs the JSON-RPC-over-`postMessage` handshake,
   and forwards tool calls from the iframe back into `navigator.modelContext`).
5. **Do not rely on Claude Desktop to render our tool's UI for a live demo.**
   There are open interop bugs (`anthropics/claude-ai-mcp#165`, `#236`,
   `ext-apps#482`) where the handshake hangs after `resources/read`. And the
   WebMCP→Claude bridges (`webmcp-cdp-bridge`, `@mcp-b/webmcp-local-relay`,
   `webmcp-server`) only forward the *tool list / tool call*; they don't yet
   plumb `_meta.ui.resourceUri` through reliably.

---

## 1. What ships in Chrome 146 Canary today (May 2026)

### 1.1 The surface that *is* native

From the W3C WebMCP draft, the Chrome team's early-preview blog, and Patrick
Brosset's clarification post, the imperative API that Chrome implements is:

```webidl
[Exposed=Window, SecureContext]
interface ModelContext {
  undefined registerTool(ModelContextTool tool);
  undefined unregisterTool(DOMString name);
};
```

Tool descriptors carry `name`, `description`, `inputSchema` (JSON Schema),
and an `execute()` handler that returns `Promise<any>` ([spec draft 2026-04-23]).
The current spec normatively covers only:

- Tool registration / unregistration
- JSON-Schema input validation
- Basic annotations (`readOnlyHint`, `untrustedContentHint`)

It is HTTPS-only, the `ModelContext` instance is a per-Navigator singleton, and
in Chrome 146 it requires the `enable-webmcp-testing` flag (off by default).
Chrome 146 stable shipped on **10 March 2026**. Chrome 149 adds a DevTools
panel behind `--enable-features=WebMCPTesting,DevToolsWebMCPSupport`.

A separate testing variant `navigator.modelContextTesting` exposes
`listTools()` / `executeTool()` and is what the Tool Inspector extension
uses to introspect a page's registered tools.

### 1.2 What the spec explicitly *defers*

The WebMCP draft has an entire normative section (4.3 Declarative WebMCP)
that reads:

> "This section is entirely a TODO. For now, refer to the explainer draft
> [PR #76]."

PR #76 (the Declarative API explainer) **was merged on 2026-03-09** — but it
only covers HTML-form-based declarative tools, *not* rich UI returned from
tool calls. The proposal explainer at `webmachinelearning.github.io/webmcp/docs/proposal.html`
makes a single passing reference to multi-modal output ("tool response can
use `img` or `video` elements") but defines no UI-resource mechanism, no
`_meta.ui.*` schema, and no iframe rendering. There is no open W3C PR
adding rich content to WebMCP as of this report.

Article-level reality checks all converge on the same finding:
- Patrick Brosset (2026-02-23): "Non-textual data… current spec focuses on
  JSON responses. Richer media types are an open question."
- bug0 guide: "Tool registration with JSON Schema inputs and JSON responses…
  no UI resources, no `_meta.ui` fields, no iframe rendering."
- Studio Meyer reality check: no mention of SEP-1865 in any browser-level
  artifact.
- Scalekit: "WebMCP currently focuses on tool calling. It does not include
  MCP's concept of resources or prompts, at least in the current draft."

### 1.3 What happens if our handler returns `{ _meta: { 'ui.resourceUri': '…' } }` today

Chrome's WebMCP implementation does **not** recognize, route, or render UI
resources. It serializes the handler's return value (so long as it is
structured-cloneable) and surfaces it to whoever called the tool — the Tool
Inspector, a bridge extension, or any future agent. The `_meta` envelope is
not stripped, but it is also not interpreted. The only entity that can do
anything with `_meta.ui.resourceUri` is the *host* that handles tool
results — i.e., our own chat panel for this demo. **Chrome itself is
"transparent middleware" for this field.**

---

## 2. The MCP Apps split — what SEP-1865 adds on top

### 2.1 What MCP Apps is

MCP Apps (the extension formerly tracked as SEP-1865) reached **Final
status on 2026-01-26** in the modelcontextprotocol spec. Its core idea:

- A tool's descriptor carries `_meta.ui.resourceUri` pointing to a `ui://…`
  resource declared by the same server.
- The host, after the tool returns, calls `resources/read` on that URI,
  receives `text/html;profile=mcp-app`, and renders it in a sandboxed
  iframe.
- The iframe and host speak **MCP JSON-RPC over `postMessage`**: methods
  like `ui/initialize`, `ui/notifications/initialized`, `ui/notifications/tool-input`,
  `ui/notifications/tool-result`, and crucially `tools/call` which the
  host forwards back to the underlying MCP connection so the iframe can
  invoke other tools.

The deprecated flat format `_meta["ui/resourceUri"]` is still accepted; the
nested form `_meta.ui.resourceUri` is preferred. The required MIME type is
`text/html;profile=mcp-app`.

### 2.2 What MCP Apps does *not* say

The MCP Apps spec, the `ext-apps` repo, the official blog post, and the
@modelcontextprotocol/ext-apps SDK contain **zero references to WebMCP or
`navigator.modelContext`**. The architecture diagrams assume a traditional
stdio/HTTP MCP server. The Overview page is unambiguous: tools are declared
"on your server"; UI resources live "server-side."

So MCP Apps is a contract — *anyone* can implement either side. There is
nothing in the spec preventing a browser page from being both ends (the
tool source *and* the host). But there is also no normative path or example
written for that case.

### 2.3 The bridging pattern that already exists

The `WebMCP-org/mcp-ui-webmcp` repo (live at `mcp-ui.mcp-b.ai`, full app at
`beattheclankers.com`) is the reference implementation of exactly the
hybrid pattern we want:

- The chat page acts as a **WebMCP client** (consuming tools registered via
  `navigator.modelContext` from any open page, including embedded iframes).
- The chat page acts as an **MCP Apps host** (renders `_meta.ui.resourceUri`
  resources in iframes via `IframeParentTransport`, runs the postMessage
  bridge).
- Embedded apps inside those iframes use `@mcp-b/global` to register tools
  back through `IframeChildTransport` — which the chat sees as new tools
  to call.

The Tic-Tac-Toe demo in that repo is the closest existing analog to the
Recipe Workbench plan. It validates that the protocol works end-to-end
**without** Chrome rendering anything itself.

---

## 3. Same-window / circular-dependency concern

The question: if our page is *both* the WebMCP tool surface *and* the host
for the iframe that the tool returned, is there a same-window or circular-
dependency issue?

**Answer: no, provided the iframe is properly sandboxed and addressed via a
distinct origin or `srcdoc` / `blob:` URL.**

- The iframe should be sandboxed with `sandbox="allow-scripts"` and
  **without** `allow-same-origin`. Inside, `window.top !== window.self` and
  it cannot reach the page's `navigator.modelContext` directly.
- Communication is via `postMessage` JSON-RPC. The parent intercepts
  messages from `event.source === iframe.contentWindow` and forwards
  `tools/call` / `registerTool` requests into the page's own
  `navigator.modelContext`.
- This is exactly how `mcp-ui-webmcp` does it. There is no recursion: the
  iframe never directly enters `navigator.modelContext`; it only sends
  messages to the parent, which decides what to do.

For our demo, the iframe HTML can ship as a `blob:` URL or `srcdoc` to avoid
hosting requirements (the handoff doc and CLAUDE.md both call out "no
backend"). A `blob:` URL gets a unique opaque origin, which keeps the
sandbox strong.

---

## 4. Recommendation for the 90-second demo

### Build path: MCP Apps protocol, implemented in our own page

**Do this:**

1. `searchRecipes` execute handler returns the MCP Apps-shape result:
   ```ts
   return {
     content: [{ type: 'text', text: `Found ${recipes.length} recipes.` }],
     _meta: { ui: { resourceUri: `ui://recipes/${id}` } },
   };
   ```
   Use the **nested** form `_meta.ui.resourceUri` (preferred per spec; the
   flat `_meta["ui/resourceUri"]` is deprecated).
2. The page (chat panel) has a small **UIResourceProtocol** module that:
   - Maintains a map `ui://…` → HTML string (blob URL).
   - On receiving a tool result with `_meta.ui.resourceUri`, fetches that
     resource locally and renders it in `UIResourceFrame` (a sandboxed
     iframe).
   - Runs the MCP Apps handshake: respond to `ui/initialize`, deliver
     `ui/notifications/tool-input` and `ui/notifications/tool-result`,
     accept `tools/call` from the iframe and forward into
     `navigator.modelContext`.
3. The iframe's "Pick" button calls `tools/call` over postMessage with a
   special host-only method, *or* (simpler for the demo) the iframe calls
   `navigator.modelContext.registerTool` via the parent bridge to add
   `commitRecipeToPlan` dynamically — exactly the Tic-Tac-Toe pattern.
4. The agent driving the chat (Option B from the handoff: in-page
   `LanguageModel.create({ tools: [...] })`) sees the freshly registered
   tool on its next turn and calls it.

**This avoids every fragile dependency:**
- No reliance on Claude Desktop's MCP Apps renderer (currently buggy per
  `ext-apps#482` and `claude-ai-mcp#165/#236`).
- No reliance on Chrome implementing rich content (it won't by demo day).
- No reliance on a WebMCP bridge surfacing `_meta.ui` correctly (bridges
  forward tool I/O but their UI plumbing is unproven).
- Works fully offline, native-only, IndexedDB-only — matches CLAUDE.md
  constraints.

### What to *not* do for the live demo

- **Don't pin the demo to Claude Desktop driving the chat.** It still works
  for stdio MCP servers, but the open issues around resource-fetch-without-
  iframe-mount mean a stage failure is plausible. Keep Claude Desktop in
  the recorded backup video, not the live flow.
- **Don't wait for native WebMCP rich content.** There is no PR for it in
  the WebMCP repo as of 2026-05-18; expecting it in Canary before a
  conference talk in the next few months is unrealistic.
- **Don't use `@mcp-b/global` as a runtime dependency** (CLAUDE.md
  constraint: native-only). Read the `mcp-ui-webmcp` repo for the
  protocol shape, but reimplement the small subset we need inline.

### Interop gotchas worth knowing

- **Claude Desktop renders MCP Apps from stdio/HTTP MCP servers, not from
  WebMCP-registered tools.** The two WebMCP→MCP bridges that ship today
  (`webmcp-cdp-bridge`, `webmcp-server`, `@mcp-b/webmcp-local-relay`)
  re-expose `navigator.modelContext` tools over stdio, so *in principle*
  the `_meta.ui.resourceUri` would flow through; but the resource itself
  (`ui://`) would need to be served by the bridge as a virtual resource,
  and none of the bridges document doing that correctly today. So for a
  hardened demo, assume Claude Desktop will *not* see our UI even if it
  can call our tools.
- **The Tool Inspector extension does not render UI resources.** It
  generates input forms from the JSON Schema and shows the raw return value
  in a "Tool Results" pane. That's fine for our purposes (we can show the
  inspector's tool list as a stage prop) but don't try to use it to
  visualize the recipe carousel.
- **`ui://` scheme is required by MCP Apps.** Since we're the host, we can
  also accept `blob:` or `data:` for our own internal rendering — but if
  we later want a Claude/VS Code host to render the same resource, we
  must serve `text/html;profile=mcp-app` from a `ui://` URI that resolves
  via the same connection that surfaced the tool.

---

## 5. Sources

- WebMCP spec (current draft): https://webmachinelearning.github.io/webmcp/
- WebMCP proposal explainer: https://webmachinelearning.github.io/webmcp/docs/proposal.html
- WebMCP repo + PRs: https://github.com/webmachinelearning/webmcp
- WebMCP PR #76 (Declarative API, merged 2026-03-09): https://github.com/webmachinelearning/webmcp/pull/76
- Chrome WebMCP early preview blog: https://developer.chrome.com/blog/webmcp-epp
- Chrome "When to use WebMCP and MCP": https://developer.chrome.com/blog/webmcp-mcp-usage
- bug0 Chrome 146 guide: https://bug0.com/blog/webmcp-chrome-146-guide
- Patrick Brosset 2026-02-23 update: https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/
- DEV "WebMCP reality check": https://dev.to/studiomeyer_io/webmcp-reality-check-where-the-spec-actually-stands-4gh1
- WebMCP cheat sheet: https://www.webfuse.com/webmcp-cheat-sheet
- DeepWiki WebMCP tool registration: https://deepwiki.com/webmachinelearning/webmcp/3.2-tool-registration-and-management
- MCP Apps blog (Final, 2026-01-26): https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- MCP Apps overview: https://modelcontextprotocol.io/extensions/apps/overview
- MCP Apps SEP-1865 PR: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865
- MCP Apps ext repo: https://github.com/modelcontextprotocol/ext-apps
- MCP Apps API docs: https://apps.extensions.modelcontextprotocol.io/api/
- MCP Apps `getToolUiResourceUri` helper: https://apps.extensions.modelcontextprotocol.io/api/functions/app-bridge.getToolUiResourceUri.html
- Scalekit "missing bridge" piece: https://www.scalekit.com/blog/webmcp-the-missing-bridge-between-ai-agents-and-the-web
- WebMCP-org reference implementation (Tic-Tac-Toe): https://github.com/WebMCP-org/mcp-ui-webmcp
- mcp-ui-webmcp live demo: https://mcp-ui.mcp-b.ai
- "Beat the Clankers" full app demo: https://beattheclankers.com
- mcp-iframe docs (`<mcp-iframe>` custom element): https://docs.mcp-b.ai/packages/mcp-iframe
- Tool Inspector extension: https://github.com/beaufortfrancois/model-context-tool-inspector
- Tool Inspector on Chrome Web Store: https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd
- GoogleChromeLabs webmcp-tools: https://github.com/GoogleChromeLabs/webmcp-tools
- MCPcat Inspector guide: https://mcpcat.io/guides/test-webmcp-tools-model-context-inspector/
- MCPcat WebMCP→Claude Code bridge: https://mcpcat.io/guides/connect-webmcp-tools-claude-code-bridge-extension/
- webmcp-cdp-bridge: https://github.com/littleplato/webmcp-cdp-bridge
- Claude Desktop MCP Apps interop bug #165: https://github.com/anthropics/claude-ai-mcp/issues/165
- Claude Desktop MCP Apps interop bug #236: https://github.com/anthropics/claude-ai-mcp/issues/236
- ext-apps host runtime bug #482: https://github.com/modelcontextprotocol/ext-apps/issues/482
- Searchengineland WebMCP explainer: https://searchengineland.com/webmcp-explained-inside-chrome-146s-agent-ready-web-preview-470630
