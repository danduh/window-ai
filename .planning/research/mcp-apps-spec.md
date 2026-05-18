# MCP Apps Extension (SEP-1865) — Implementation-Ready Summary

> **Status:** Finalized 2026-01-26 as the first official extension to the Model Context Protocol. Protocol version string: `"2026-01-26"`. Co-authored by Anthropic + OpenAI + the MCP-UI Working Group. Live in Claude (web + desktop), VS Code Copilot (Insiders), Goose, Postman, MCPJam.
>
> **Bottom line for this milestone:** For the WebMCP Recipe Workbench we are building against `navigator.modelContext` directly — **MCP Apps is a server-side / chat-host pattern, not a `navigator.modelContext` feature**. If we want generative UI in the iframe, we either (a) adopt the MCP Apps wire format inside our own host shell, or (b) wait for the WebMCP rich-content proposal to land. See section 7 for the recommendation.

---

## 1. Tool result wire format

Three pieces work together on the server: a **UI resource**, a **tool** that points at it via `_meta.ui.resourceUri`, and (optionally) a **tool result** that the host pushes into the rendered iframe.

### 1a. UI resource declaration (in `resources/list` response)

```json
{
  "uri": "ui://weather-server/dashboard-template",
  "name": "Weather Dashboard",
  "description": "Interactive weather visualization with real-time updates",
  "mimeType": "text/html;profile=mcp-app",
  "_meta": {
    "ui": {
      "csp": {
        "connectDomains": ["https://api.openweathermap.org"],
        "resourceDomains": ["https://cdn.jsdelivr.net"],
        "frameDomains": ["https://www.youtube.com"],
        "baseUriDomains": ["https://cdn.example.com"]
      },
      "permissions": {
        "camera": {},
        "microphone": {},
        "geolocation": {},
        "clipboardWrite": {}
      },
      "domain": "a904794854a047f6.claudemcpcontent.com",
      "prefersBorder": true
    }
  }
}
```

**Key invariants:**
- URI **MUST** use the `ui://` scheme.
- MIME type **MUST** be exactly `text/html;profile=mcp-app`.
- Resource **contents** carry the HTML inline as a `text` field on a `resources/read` reply. The MVP only supports inline `rawHtml`. **External URLs and data/blob URLs were explicitly deferred** because the host needs to review/screenshot the content.

### 1b. Resource contents response (from `resources/read`)

```json
{
  "contents": [
    {
      "uri": "ui://weather-server/dashboard-template",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!DOCTYPE html><html>...</html>",
      "_meta": {
        "ui": {
          "csp": { "connectDomains": ["https://api.openweathermap.org"] },
          "prefersBorder": true
        }
      }
    }
  ]
}
```

### 1c. Tool that triggers the UI (from `tools/list`)

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": { "location": { "type": "string" } }
  },
  "_meta": {
    "ui": {
      "resourceUri": "ui://weather-server/dashboard-template",
      "visibility": ["model", "app"]
    }
  }
}
```

- `visibility: ["model", "app"]` — both LLM and the running iframe can call this tool.
- `visibility: ["app"]` — hidden from the LLM, only callable from inside the iframe (use this for "internal" UI helpers like `refresh_dashboard`).

### 1d. Tool result content (returned from `tools/call`)

The tool itself returns standard MCP content — text, structuredContent, etc. The host then forwards it into the iframe as a `ui/notifications/tool-result` notification (see §2).

---

## 2. postMessage protocol (JSON-RPC 2.0)

Transport is `window.postMessage` between the host page and the iframe `contentWindow`. Methods prefixed `ui/` are app-extension specific. Methods without the prefix (e.g. `tools/call`, `resources/read`, `ping`) reuse the base MCP wire format.

### Handshake — iframe → host

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ui/initialize",
  "params": {
    "protocolVersion": "2026-01-26",
    "clientInfo": { "name": "My UI", "version": "1.0.0" },
    "appCapabilities": {
      "availableDisplayModes": ["inline", "fullscreen"],
      "tools": { "listChanged": true }
    }
  }
}
```

### Handshake response — host → iframe

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2026-01-26",
    "hostCapabilities": {
      "openLinks": {},
      "serverTools": { "listChanged": true },
      "serverResources": { "listChanged": true },
      "logging": {},
      "sandbox": {
        "permissions": { "camera": {}, "microphone": {}, "geolocation": {}, "clipboardWrite": {} },
        "csp": { "connectDomains": [...], "resourceDomains": [...], "frameDomains": [...], "baseUriDomains": [...] }
      }
    },
    "hostInfo": { "name": "claude-desktop", "version": "1.0.0" },
    "hostContext": {
      "theme": "dark",
      "styles": { "variables": { "--color-background-primary": "...", "--font-sans": "..." }, "css": { "fonts": "..." } },
      "displayMode": "inline",
      "availableDisplayModes": ["inline", "fullscreen"],
      "containerDimensions": { "width": 400, "maxHeight": 600 },
      "locale": "en-US",
      "timeZone": "America/New_York",
      "userAgent": "claude-desktop/1.0.0",
      "platform": "web",
      "deviceCapabilities": { "touch": false, "hover": true }
    }
  }
}
```

Followed by `ui/notifications/initialized` (iframe → host, no params) to signal ready.

### Host → iframe methods (notifications)

| Method | Purpose |
|---|---|
| `ui/notifications/tool-input` | Final tool arguments (after streaming) |
| `ui/notifications/tool-input-partial` | Streaming partial arguments |
| `ui/notifications/tool-result` | Push tool result content (text + structuredContent + \_meta) |
| `ui/notifications/tool-cancelled` | Tool was cancelled |
| `ui/notifications/host-context-changed` | Theme / displayMode / dimensions changed |
| `ui/resource-teardown` *(request)* | Host asks iframe to clean up before close |

Example tool-result push:

```json
{
  "jsonrpc": "2.0",
  "method": "ui/notifications/tool-result",
  "params": {
    "content": [{ "type": "text", "text": "Current weather: Sunny, 72°F" }],
    "structuredContent": { "temperature": 72, "conditions": "sunny" },
    "_meta": { "timestamp": "2026-01-26T15:30:00Z" }
  }
}
```

### Iframe → host methods (requests)

| Method | Purpose |
|---|---|
| `ui/open-link` | Ask host to open an external URL in user's browser |
| `ui/message` | Inject a chat message (typically `role: "user"`) — kicks off a new model turn |
| `ui/request-display-mode` | Request `inline` / `fullscreen` / `pip` |
| `ui/update-model-context` | Quietly add content to the model's context for the next turn (no UI render) |
| `tools/call` | **Call any server tool the host has access to**, proxied through the host. This is how the iframe "calls more tools." |
| `resources/read`, `resources/list` | Read server resources |
| `ping` | Keepalive |

Example iframe → host tool call (the bidirectional pattern):

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "tools/call",
  "params": {
    "name": "refresh_dashboard",
    "arguments": { "region": "us-west" }
  }
}
```

The host proxies this to the originating MCP server, returns the result inline as the JSON-RPC response, and may also push a new `ui/notifications/tool-result` if it wants to update other views.

### Authentication / origin checks

- The host **MUST** verify `event.origin` on every inbound message against the iframe's expected origin (typically a sandbox proxy origin like `*.claudemcpcontent.com`).
- The iframe **MUST** verify `event.source === window.parent` and ignore messages with mismatched origin.
- No shared secret / token — origin is the only trust boundary because the host owns the iframe creation.
- User consent for sensitive calls (e.g. `ui/open-link`, certain `tools/call`) is gated host-side and may return JSON-RPC error `-32000 "denied by user"`.

---

## 3. Sandboxing recipe

### iframe attributes

The spec leaves implementation choice to hosts but **requires** sandboxing. Real-world hosts (Claude Desktop, ChatGPT Apps) use the **double-iframe** pattern:

1. **Outer iframe** — owned by host, lives on a dedicated content-origin (e.g. `*.claudemcpcontent.com`). Attributes:
   ```html
   <iframe
     src="https://<random>.claudemcpcontent.com/sandbox-proxy.html"
     sandbox="allow-scripts allow-same-origin"
     allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-write 'self'"
     referrerpolicy="no-referrer"
     loading="lazy">
   </iframe>
   ```
   `allow-same-origin` is granted **only because the origin is disposable and unique-per-app**; this preserves isolation while letting the proxy use `localStorage` for its own state.

2. **Inner iframe** (inside the proxy) — hosts the actual server HTML:
   ```html
   <iframe
     sandbox="allow-scripts"
     srcdoc="<!DOCTYPE html>...">
   </iframe>
   ```
   No `allow-same-origin` here — the guest is a true null origin. `allow-scripts` only. `allow-popups`, `allow-top-navigation`, `allow-forms` are **never** granted.

The two layers communicate via `ui/notifications/sandbox-proxy-ready` (proxy → host) and `ui/notifications/sandbox-resource-ready` (host → proxy, includes the HTML, sandbox flags, csp, permissions).

### CSP

**Restrictive default** (when `_meta.ui.csp` is omitted):

```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
media-src 'self' data:;
connect-src 'none';
```

**Constructed from `_meta.ui.csp`:**

```
default-src 'none';
script-src 'self' 'unsafe-inline' ${resourceDomains};
style-src 'self' 'unsafe-inline' ${resourceDomains};
connect-src 'self' ${connectDomains};
img-src 'self' data: ${resourceDomains};
font-src 'self' ${resourceDomains};
media-src 'self' data: ${resourceDomains};
frame-src ${frameDomains || "'none'"};
object-src 'none';
base-uri ${baseUriDomains || "'self'"};
```

Hosts **MUST NOT** allow undeclared domains, but **MAY** be stricter. Hosts **SHOULD** log CSPs and warn users about external-domain access.

### What `fetch` is allowed

- Same-origin XHR/fetch always.
- Cross-origin only to domains declared in `connectDomains`.
- No access to host cookies, localStorage, or the parent DOM (the null origin enforces this even before CSP).

---

## 4. Tool registration FROM the iframe

**Headline finding:** The 2026-01-26 spec does **not** support an iframe registering brand-new tools at runtime. Tool registration happens **server-side at startup** (e.g. `server.registerAppTool(...)`). The iframe's bidirectional power comes from being able to **call** any already-registered tool via standard `tools/call` over postMessage.

The closest pattern to "iframe-registers-a-tool" is:

1. Server pre-registers helper tools with `_meta.ui.visibility: ["app"]` (hidden from the LLM).
2. Iframe calls them via `tools/call` over postMessage — host proxies to the originating MCP server.
3. Server can use `notifications/tools/list_changed` to advertise new tools mid-session; the host re-fetches `tools/list` and propagates capability changes, but this is server-driven, not iframe-driven.

Common convenience wrapper in guest code (`@modelcontextprotocol/ext-apps`):

```js
const app = new App({ name: 'recipe-workbench', version: '1.0.0' });
await app.initialize();

// Call a tool — host proxies to the server
const result = await app.callServerTool({
  name: 'save_draft',
  arguments: { recipeId, html }
});

// Inject a user message and trigger a new model turn
await app.sendMessage({ role: 'user', content: { type: 'text', text: 'Make it spicier' } });

// Add context silently (no new turn)
await app.updateModelContext({
  content: [{ type: 'text', text: 'User just toggled the metric units' }]
});
```

If we need true "iframe-defined tools that the agent can then pick up," the WebMCP path (`navigator.modelContext.registerTool`) is the right primitive — see §7.

---

## 5. Resize & lifecycle

### Resize (iframe → host)

```json
{
  "jsonrpc": "2.0",
  "method": "ui/notifications/size-changed",
  "params": { "width": 400, "height": 600 }
}
```

The iframe is responsible for measuring its own content (typically via `ResizeObserver` on `document.body`) and notifying the host. The host then resizes the iframe DOM element. Hosts honor a max-height ceiling advertised in `hostContext.containerDimensions.maxHeight`.

### Display mode

```json
{ "method": "ui/request-display-mode", "params": { "mode": "fullscreen" } }
```

Host responds with the granted mode (may be lower than requested).

### Host context change (host → iframe)

```json
{
  "method": "ui/notifications/host-context-changed",
  "params": {
    "theme": "light",
    "displayMode": "fullscreen",
    "containerDimensions": { "width": 800, "height": 600 }
  }
}
```

### Teardown (host → iframe)

```json
{ "id": 5, "method": "ui/resource-teardown", "params": { "reason": "User closed the view" } }
```

The iframe should flush state via `update-model-context` or a `tools/call` to a save endpoint **before** replying with `{ result: {} }`. The host destroys the iframe after the reply (or after a timeout).

There is **no explicit "refresh" method.** Hosts refresh by destroying and recreating the iframe; the iframe re-runs `ui/initialize` and asks the host (or the server via `tools/call`) for the last-saved state.

---

## 6. Capability negotiation

Server advertises support during the standard MCP `initialize` handshake (server→host channel, not the iframe channel):

```json
{
  "capabilities": {
    "extensions": {
      "io.modelcontextprotocol/ui": {
        "mimeTypes": ["text/html;profile=mcp-app"]
      }
    }
  }
}
```

Hosts that don't see this extension fall back to plain text tool results — graceful degradation by design.

---

## 7. Relationship to the WebMCP rich-content proposal

| | **MCP Apps (SEP-1865)** | **WebMCP rich content (`navigator.modelContext`)** |
|---|---|---|
| Where it lives | MCP **server** + chat **host** (Claude Desktop, VS Code, etc.) | The **web page itself**, registered via `navigator.modelContext.registerTool` |
| HTML delivery | Server returns a `ui://` resource; host renders in sandboxed iframe | Tool returns `content: [{ type: 'text' \| 'image' \| ... }]`; rich types like `img`/`video` are mentioned as future ergonomics, **no HTML / iframe rendering specified** |
| Sandboxing | Host-enforced double iframe + CSP | Whatever the agent UI chooses — the tool runs in the page's own JS context |
| Bidirectional | Iframe ↔ host JSON-RPC over postMessage | The page **is** the tool host — no postMessage needed; agent calls `execute()` directly |
| Status | **Finalized 2026-01-26**, shipped | **Draft**, Feb 2026 clarifications only renamed `window.agent` → `navigator.modelContext`. Rich content is intentionally vague. |

**Recommendation for Chrome 146 Canary + this milestone:**

1. **Primary path: stick with `navigator.modelContext.registerTool` + return plain `content: [{ type: 'text', ... }]` results.** That is what Chrome 146 Canary actually exposes today. The WebMCP rich-content story is still a sketch ("response can use `img` or `video`") with no security/iframe model published.

2. **If we want generative UI right now**, the realistic option is to **render HTML ourselves inside our SPA** — our chat surface is the host. We can either:
   - Build a thin MCP-Apps-style iframe shell inside `chat/`: have a tool return `{ type: 'resource', resource: { uri: 'ui://...', mimeType: 'text/html;profile=mcp-app', text: '...' } }` shaped payload, and have a React component spin up a `sandbox="allow-scripts"` iframe with `srcdoc`. We get postMessage JSON-RPC for free and forward-compatibility with the spec. This is the move that lets us claim a working "WebMCP + MCP Apps" demo.
   - Or use `@mcp-ui/client` if we want to skip writing the host bridge — but it's React-heavy and pulls a lot of weight for a demo.

3. **They are not alternatives in the long run — they compose.** WebMCP defines who declares tools (the page). MCP Apps defines how a tool's UI is rendered (server-pushed iframe). A future Chrome with full WebMCP rich-content support will almost certainly converge on the MCP Apps wire format because it's already the standard.

---

## 8. Known pitfalls / gotchas

1. **`allow-same-origin` is a trap.** Granting it to the inner iframe defeats the entire sandbox — the guest can then break out of CSP, read host cookies on the same registrable domain, and so on. Only the outer **sandbox proxy** gets `allow-same-origin`, and only because its origin is unique and disposable. The guest gets `sandbox="allow-scripts"` and nothing else.

2. **External URL resources are not supported in the MVP.** You can't point `ui://` at `https://my-app.example.com/widget`. The HTML must be inline `text`. This is enforced; hosts will reject anything else. If you have a big bundle, inline-bundle it (esbuild `--bundle --format=iife`) or load deps from CDNs declared in `csp.resourceDomains`.

3. **Origin checks are easy to forget on the iframe side.** Many demos only verify origin on the host side. Real hardening requires the **iframe** to also check `event.source === window.parent` and to ignore `*` origin messages — otherwise a malicious co-resident iframe could spoof host messages.

4. **`ui/message` triggers a new model turn — `ui/update-model-context` does not.** Mixing these up causes either runaway turns (when you wanted silent context) or a UI that feels dead (when you wanted a turn). Pick deliberately per interaction.

5. **Resize loops.** Reporting `size-changed` from inside a `ResizeObserver` that fires on the host's container resize causes a feedback loop. Debounce, and **only report content-driven size changes** (measure your own `<body>` or root component), never reflect the host's container back.

6. **Capability discovery happens once per iframe.** If the server adds a new tool mid-session via `notifications/tools/list_changed`, the iframe doesn't automatically see it — the host re-fetches `tools/list` but the iframe must either re-handshake or listen for a host-pushed list-changed notification (the spec advertises `serverTools.listChanged` capability for exactly this).

---

## Sources

- [MCP Apps Overview — modelcontextprotocol.io](https://modelcontextprotocol.io/extensions/apps/overview)
- [SEP-1865 PR on modelcontextprotocol repo](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865)
- [Official spec — ext-apps/specification/2026-01-26/apps.mdx](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- [Blog: MCP Apps release (2026-01-26)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [Blog: MCP Apps proposal (2025-11-21)](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/)
- [Alpic AI: MCP Apps vs ChatGPT Apps](https://alpic.ai/blog/mcp-apps-how-it-works-and-how-it-compares-to-chatgpt-apps)
- [MCP-UI guide: MCP Apps](https://mcpui.dev/guide/mcp-apps)
- [Mastra Docs: MCP Apps](https://mastra.ai/docs/mcp/mcp-apps)
- [WebMCP proposal](https://webmachinelearning.github.io/webmcp/docs/proposal.html)
- [Patrick Brosset: WebMCP updates, clarifications, next steps (Feb 2026)](https://patrickbrosset.com/articles/2026-02-23-webmcp-updates-clarifications-and-next-steps/)
- [OpenAI Apps SDK build guide](https://developers.openai.com/apps-sdk/build/mcp-server)
