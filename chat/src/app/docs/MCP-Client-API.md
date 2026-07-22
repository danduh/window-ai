# MCP Client API — Remote Tool Console guide

The Model Context Protocol (MCP) is an open protocol that lets an AI application (the **client**) discover and call **tools** exposed by an external **server** — a uniform JSON-RPC contract for "here are the actions I can perform, call them with these arguments." This page is an in-browser MCP **client**: you point it at a remote MCP server (a URL plus an optional bearer token), it runs the initialize handshake, lists the server's tools, and then the browser's built-in LLM (`LanguageModel`, aka Chrome's on-device Gemini Nano) drives those tools to answer your prompts.

This is the **inverse of the `/webmcp` demo**. There, the page *is* the server — it calls `registerTool` and exposes its own in-page actions to whatever agent shows up. Here, the page is the *client* — it reaches out over the network to a server someone else runs and consumes *its* tools. Same protocol, opposite ends of the wire.

> **⚠️ Browser → remote MCP is CORS-gated.** Unlike a native desktop MCP client (Claude Desktop, an IDE) that speaks to servers over stdio or from a trusted process, a browser client is bound by the same-origin policy. The server **must** send CORS headers that permit this origin, or `connect()` fails before the handshake completes. See the [CORS](#cors-the-thing-that-will-bite-you) section — it is the single most common reason this demo fails to connect.

## Overview

MCP separates the AI application from the tools it uses. A server advertises a set of tools (each with a `name`, a `description`, and a JSON Schema `inputSchema`); a client connects, lists them, and invokes them by name with a JSON arguments object. The server runs the tool and returns result content. The LLM never touches the network directly — it decides *which* tool to call and *with what arguments*, and the client executes the call.

This demo wires three pieces together:

1. **Transport** — the official `@modelcontextprotocol/sdk` `Client` over a `StreamableHTTPClientTransport`, talking to a remote HTTP MCP endpoint. This is `chat/src/app/services/McpClientService.ts`.
2. **Tool discovery** — after the initialize handshake, `listTools()` returns the server's tool catalog, which the UI renders so you can pick which tools the agent may use.
3. **Agent loop** — the built-in `LanguageModel` runs a `responseFormat`-constrained dispatch loop: it emits a JSON intent naming the next tool to call, the host JS executes it via the client, feeds the result back, and repeats until the model says it's done.

There is no backend in this demo. The client runs entirely in the page; the only network traffic is browser → remote MCP server.

## The connect flow

Connecting is a four-step sequence, all inside `connect(url, token?)`:

1. **Build the transport** with the server URL and, if provided, an `Authorization: Bearer <token>` header.
2. **Initialize** — `client.connect(transport)` performs the MCP `initialize` handshake (protocol version negotiation, capability exchange). The server responds with its name, version, and capabilities.
3. **List tools** — `client.listTools()` returns the tool catalog.
4. **Return** the connection info — server name/version, capability keys, and the normalized tool list — for the UI to render.

Here is the raw shape, framework-agnostic, using `@modelcontextprotocol/sdk` directly:

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// 1. Build a Streamable HTTP transport. The bearer token (if any) rides on
//    every request as an Authorization header.
const transport = new StreamableHTTPClientTransport(new URL('http://localhost:9339/mcp'), {
  requestInit: token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined,
});

// 2. Connect — this runs the MCP initialize handshake.
const client = new Client({ name: 'window-ai-mcp-client', version: '0.1.0' });
await client.connect(transport);

// 3. Read what the server told us during initialize.
const impl = client.getServerVersion();        // { name, version }
const caps = client.getServerCapabilities();    // e.g. { tools: {} }

// 4. List the tools the server exposes.
const { tools } = await client.listTools();
// tools: [{ name, description, inputSchema }, ...]
```

Calling a tool is a single method — the SDK sends a `tools/call` request and the server returns content blocks:

```js
const res = await client.callTool({ name: 'add', arguments: { a: 2, b: 3 } });
// res.content: [{ type: 'text', text: 'The sum of 2 and 3 is 5.' }]
```

In this demo, `McpClientService.callTool(name, args)` wraps that and flattens the content blocks to a single string — the shape the agent loop feeds back into the LLM's next prompt.

`connect()` **throws** on any failure — network unreachable, CORS block (surfaces as a `TypeError`), auth rejection (the server closes the session), or an endpoint that isn't actually MCP. The demo surfaces the thrown message directly so you can tell a CORS failure from a bad token from a wrong URL.

## The agent loop: why not native tool calling?

Chrome's `LanguageModel` (the Prompt API) has a documented `tools` parameter — `LanguageModel.create({ tools: [...] })` — that is *supposed* to let the model call tools natively, with the runtime routing calls to your handlers. **At the time this demo was built (Chrome 147 Canary), that codepath was unreliable** — tool calls were dropped or malformed. So this demo does **not** use native tool calling.

Instead it uses a **`responseFormat` JSON intent loop** (cloned from the Recipe Workbench's `AgentDrawer.tsx`). The idea: constrain the model to emit a single JSON object naming the *next* tool to call, parse it in host JS, dispatch it manually via the MCP client, feed the result back, and repeat.

The session is created with a schema — no `tools` array:

```js
const INTENT_SCHEMA = {
  type: 'object',
  required: ['toolName'],
  additionalProperties: false,
  properties: {
    toolName: { type: 'string', description: 'Tool to call next, or "done" to reply.' },
    args:     { type: 'object', description: 'Arguments for the tool (omit when done).' },
    reply:    { type: 'string', description: 'Conversational reply — only when toolName is "done".' },
  },
};

const session = await LanguageModel.create({
  outputLanguage: 'en',              // required on Chrome 147+ to avoid a warning/throw
  responseFormat: INTENT_SCHEMA,     // constrains output to the JSON intent shape
  initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
});
```

The `SYSTEM_PROMPT` inlines the connected server's tool names and argument shapes (built from the `listTools()` catalog) so the model knows what it can call *without* a native `tools` array. Then the host runs the loop:

```js
const MAX_TOOL_CALLS = 10;   // guard against runaway loops
let turn = userMessage;

for (let i = 0; i < MAX_TOOL_CALLS; i++) {
  const raw = await session.prompt(turn);
  const intent = extractJsonFromResponse(raw);   // strips ```json fences, then parses

  if (!intent || intent.toolName === 'done') {
    // model is finished — show intent.reply as the chat bubble
    break;
  }

  // Dispatch the tool through the MCP client and feed the result back.
  const result = await callTool(intent.toolName, intent.args ?? {});
  turn = `Tool ${intent.toolName} returned:\n${result}`;
}
```

`extractJsonFromResponse` exists because Chrome's `responseFormat` sometimes still wraps the JSON in ```` ```json ```` fences despite the schema constraint; the helper tries a raw `JSON.parse` first, then strips fences, then falls back to extracting the first `{ ... }` block. The loop exits when the model emits `toolName: "done"` (with a `reply`) or when it hits `MAX_TOOL_CALLS`.

> **Note.** The Prompt API's native `tools` parameter is documented and reportedly functional on later Chrome stable builds. If you're on a recent Chrome and want to try native tool calling, that's the cleaner path — but the `responseFormat` loop above works across every build that ships the Prompt API, which is why this demo keeps it.

## CORS: the thing that will bite you

A native MCP client (a desktop app, a CLI) connects to servers over stdio or from a trusted process — no browser, no same-origin policy. **A browser MCP client is different.** Every request from this page to a remote MCP server is a cross-origin `fetch`, and the browser enforces CORS. For `connect()` to succeed, the remote server **must**:

- **Allow this origin** — send `Access-Control-Allow-Origin` matching the page's origin (or `*`). Without it, the browser blocks the response and `connect()` rejects with a `TypeError` (a bare "Failed to fetch" / network error — the browser deliberately hides the details cross-origin).
- **Expose `Mcp-Session-Id`** — the Streamable HTTP transport reads the session id from a response header. The server must list it in `Access-Control-Expose-Headers`, or the client can't pick up the session and follow-up requests fail.
- **Allow `Authorization`** (and `Content-Type`, `Mcp-Session-Id`, `Mcp-Protocol-Version`) in `Access-Control-Allow-Headers`, or the preflight for an authenticated connect is rejected before the real request is sent.
- **Answer the preflight** — permit `POST`, `GET`, `DELETE`, and `OPTIONS`.

A server that speaks perfect MCP but sends no CORS headers **will fail at `connect()`**, and the failure looks like a generic network error rather than a protocol error. If you control the server, the fix is a permissive CORS middleware (see the local test server below). If you don't, the server has to opt your origin in — there is no client-side workaround, because CORS is enforced by the browser, not by your code.

This is the fundamental tradeoff of an in-browser MCP client: it's zero-install and runs in the user's session, but it can only reach servers that have explicitly agreed to be reached from the web.

## Security note

The bearer token you enter is treated as a live credential:

- **In memory only.** The token is held for the duration of the session and passed to `StreamableHTTPClientTransport`. It is **not** written to `localStorage`, `IndexedDB`, cookies, or any persistent store. Reload the page and it's gone.
- **Sent only to the URL you entered.** The token rides as `Authorization: Bearer <token>` on requests to that one endpoint. It is never sent anywhere else, and there is no backend in this demo to forward it to.
- **Never logged.** The token is not written to the console, not included in analytics, not surfaced in error messages. Error handling reports *that* auth failed, not the credential itself.

Still — this is a demo. Use a scoped, revocable, low-privilege token, not a long-lived admin credential. And remember the CORS corollary: any server you connect to sees your origin and whatever the token authorizes.

## Run a local test server

The repo ships a minimal CORS-enabled Streamable HTTP MCP server for exactly this demo: `mcp-spike-server.mjs` at the repo root. It exposes two tools — `add` (sums two numbers) and `echo` (echoes a message) — and sets the CORS headers this browser client needs (`Access-Control-Allow-Origin: *`, `Mcp-Session-Id` exposed, `Authorization` allowed).

From the repo root:

```bash
node ./mcp-spike-server.mjs
# [mcp-spike-server] listening on http://localhost:9339/mcp
```

Then in the demo, connect to:

```
http://localhost:9339/mcp
```

The token field is optional — the spike server logs the `Authorization` header if you send one but doesn't require it. Once connected, you'll see the `add` and `echo` tools; ask the agent something like "what's 21 plus 21?" and watch the loop call `add` and report the result.

The server's tool definitions are plain MCP:

```js
// From mcp-spike-server.mjs — the ListTools response.
{
  name: 'add',
  description: 'Add two numbers and return the sum.',
  inputSchema: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b'],
  },
}
```

Because it's local and permissive, it sidesteps the CORS problem entirely — which makes it the fastest way to see the full connect → list → agent-loop path working end to end.

## Limitations

1. **CORS-bound.** This client can only reach MCP servers that send permissive CORS headers for this origin. Most public MCP servers today assume a native (non-browser) client and send no CORS headers — they won't connect. Use the bundled `mcp-spike-server.mjs` or a server you control.
2. **`responseFormat` loop, not native tools.** The agent uses a JSON intent loop rather than `LanguageModel.create({ tools })`, because native tool calling was unreliable on the Chrome build this was written against. Works everywhere; a little less elegant than native.
3. **Text results only, flattened.** `callTool` flattens MCP content blocks to a string. Non-text content (images, embedded resources) is JSON-stringified rather than rendered.
4. **On-device LLM required for chat.** Connecting and browsing tools works in any browser with `fetch`; the *agent chat* needs Chrome's built-in `LanguageModel` (Gemini Nano). Without it the chat panel shows a fallback.
5. **No streaming tools.** Each `callTool` is a single request/response; long-running server tools block the loop until they resolve.
6. **Token in memory only.** No persistence means you re-enter the token on every reload — deliberate, for safety.

## References

- Model Context Protocol — https://modelcontextprotocol.io
- MCP TypeScript SDK — https://github.com/modelcontextprotocol/typescript-sdk (`@modelcontextprotocol/sdk`)
- Streamable HTTP transport — the `StreamableHTTPClientTransport` / `StreamableHTTPServerTransport` pair used here
- Chrome Prompt API (`LanguageModel`) — https://developer.chrome.com/docs/ai/prompt-api
- The inverse demo — the `/webmcp` Recipe Workbench (this page's mirror: page-as-server instead of page-as-client)
- Client source — `chat/src/app/services/McpClientService.ts`
- Local test server — `mcp-spike-server.mjs` (repo root; `node ./mcp-spike-server.mjs`)
