// Browser MCP client over Streamable HTTP.
//
// Phase 0 spike + Phase 1 foundation. Wraps the official @modelcontextprotocol/sdk
// Client with a StreamableHTTPClientTransport so the page can connect to a REMOTE
// MCP server (URL + optional bearer token), list its tools, and call them.
//
// NOTE: browser → remote MCP is subject to CORS — the server must allow this
// origin (and the Authorization / Mcp-Session-Id headers). Servers that don't
// send CORS headers will fail at connect() with a network/TypeError.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpConnection {
  serverName: string;
  serverVersion: string;
  capabilities: string[];
  tools: McpToolInfo[];
}

let client: Client | null = null;

/**
 * Thrown when the server rejects the connection because it needs OAuth
 * (MCP `McpAuthRequiredError`). Carries the authorize URL(s) from the server's
 * response so the UI can offer to open them and complete the flow.
 */
export class McpAuthRequiredError extends Error {
  readonly authorizationUrls: string[];
  constructor(message: string, authorizationUrls: string[]) {
    super(message);
    this.name = 'McpAuthRequiredError';
    this.authorizationUrls = authorizationUrls;
  }
}

/**
 * Pull OAuth authorize URL(s) out of a thrown error whose message embeds the
 * server's JSON body (an MCP `McpAuthRequiredError` carries
 * `authorization_urls`). Returns only http(s) URLs; [] when none/absent.
 */
function extractAuthorizationUrls(err: unknown): string[] {
  const msg = err instanceof Error ? err.message : String(err);
  const braceMatch = msg.match(/\{[\s\S]*\}/);
  if (!braceMatch) return [];
  try {
    const body = JSON.parse(braceMatch[0]) as {
      authorization_urls?: Record<string, unknown>;
    };
    const urls = body.authorization_urls;
    if (urls && typeof urls === 'object') {
      return Object.values(urls).filter(
        (u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u),
      );
    }
  } catch {
    // message wasn't JSON / had no authorization_urls
  }
  return [];
}

/**
 * Connect to a remote MCP server over Streamable HTTP, optionally sending a
 * bearer token. Runs the initialize handshake and returns server info + tools.
 * On an OAuth-required rejection, throws {@link McpAuthRequiredError} with the
 * server's authorize URL(s); otherwise re-throws the underlying network/CORS/
 * protocol error. `client` is only set on full success.
 */
export async function connect(url: string, token?: string): Promise<McpConnection> {
  await disconnect();

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });

  const c = new Client({ name: 'window-ai-mcp-client', version: '0.1.0' });
  try {
    await c.connect(transport);
    const impl = c.getServerVersion();
    const caps = c.getServerCapabilities() ?? {};
    const { tools } = await c.listTools();
    client = c;
    return {
      serverName: impl?.name ?? 'unknown',
      serverVersion: impl?.version ?? '',
      capabilities: Object.keys(caps),
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema as Record<string, unknown>) ?? { type: 'object' },
      })),
    };
  } catch (err) {
    try {
      await c.close();
    } catch {
      // best-effort cleanup of the half-open transport
    }
    const authUrls = extractAuthorizationUrls(err);
    if (authUrls.length > 0) {
      throw new McpAuthRequiredError(
        err instanceof Error ? err.message : String(err),
        authUrls,
      );
    }
    throw err;
  }
}

/**
 * Call an MCP tool and return its result content flattened to a string — the
 * shape the LLM agent loop feeds back into the next prompt.
 */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (!client) throw new Error('Not connected to an MCP server.');
  const res = await client.callTool({ name, arguments: args });
  return contentToString(res.content);
}

/** Close the transport/session. Best-effort; safe to call when not connected. */
export async function disconnect(): Promise<void> {
  if (client) {
    try {
      await client.close();
    } catch {
      // best-effort cleanup
    }
    client = null;
  }
}

export function isConnected(): boolean {
  return client !== null;
}

/** Flatten MCP tool-result content blocks to a single string. */
function contentToString(content: unknown): string {
  if (!Array.isArray(content)) {
    return typeof content === 'string' ? content : JSON.stringify(content);
  }
  return content
    .map((block) => {
      if (block && typeof block === 'object' && 'type' in block) {
        const b = block as { type: string; text?: string };
        if (b.type === 'text' && typeof b.text === 'string') return b.text;
      }
      return JSON.stringify(block);
    })
    .join('\n');
}
