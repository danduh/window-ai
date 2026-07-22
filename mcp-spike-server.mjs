// Phase 0 spike: a minimal CORS-enabled Streamable HTTP MCP server with two
// tools (add, echo). Uses the SDK's low-level Server + internal schemas (no
// external zod) so there's zero version friction. Run from the repo root so
// node resolves ./node_modules.
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';

function makeServer() {
  const server = new Server(
    { name: 'spike-mcp-server', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'add',
        description: 'Add two numbers and return the sum.',
        inputSchema: {
          type: 'object',
          properties: { a: { type: 'number' }, b: { type: 'number' } },
          required: ['a', 'b'],
        },
      },
      {
        name: 'echo',
        description: 'Echo back a message.',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    if (name === 'add') {
      return { content: [{ type: 'text', text: `The sum of ${args.a} and ${args.b} is ${args.a + args.b}.` }] };
    }
    if (name === 'echo') {
      return { content: [{ type: 'text', text: `Echo: ${args.message}` }] };
    }
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  });

  return server;
}

const app = express();
app.use(
  cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Mcp-Protocol-Version'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json());

const transports = {};

app.post('/mcp', async (req, res) => {
  try {
    console.log('[auth] Authorization header:', req.headers['authorization'] ?? '(none)');
    const sessionId = req.headers['mcp-session-id'];
    let transport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => { transports[sid] = transport; },
      });
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };
      await makeServer().connect(transport);
    } else {
      res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'No valid session ID' }, id: null });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('POST /mcp error:', e);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: String(e) }, id: null });
    }
  }
});

// Spike-only: mimics a server that requires OAuth (MCP McpAuthRequiredError) so the
// client's authorization_urls handling can be verified without a real OAuth server.
app.post('/mcp-auth', (_req, res) => {
  res.status(401).json({
    message: 'MCP server authentication required',
    error: { type: 'McpAuthRequiredError' },
    authorization_urls: {
      demo: 'https://example.com/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fexample.com%2Fsuccess&response_type=code',
    },
  });
});

const handleSession = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
};
app.get('/mcp', handleSession);
app.delete('/mcp', handleSession);

const PORT = 9339;
app.listen(PORT, () => console.log(`[mcp-spike-server] listening on http://localhost:${PORT}/mcp`));
