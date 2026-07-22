// Pure helpers for the /mcp-client agent loop (ChatPanel.tsx).
//
// Cloned from RecipeWorkbench/AgentDrawer.tsx's responseFormat-based intent
// extraction, adapted for a REMOTE MCP server whose tool set is discovered at
// connect() time (rather than the static RECIPE_TOOLS). No React, no DOM —
// keep this file testable and side-effect-free.
import type { McpToolInfo } from '../../services/McpClientService';

// ---------------------------------------------------------------------------
// responseFormat schema — constrains the model to emit JSON tool calls.
// Mirrors AgentDrawer's INTENT_SCHEMA (the only known-working schema on
// Chrome 147 Canary): a flat object with a required `toolName` field. `args`
// carries the tool parameters; `toolName: "done"` is the sentinel value the
// model emits when it has no more tool calls to make and instead wants to give
// a conversational reply.
// ---------------------------------------------------------------------------
export const INTENT_SCHEMA = {
  type: 'object',
  required: ['toolName'],
  additionalProperties: false,
  properties: {
    toolName: {
      type: 'string',
      description:
        'Name of the tool to call next, or "done" when you are ready to give a plain-text reply.',
    },
    args: {
      type: 'object',
      description: 'Arguments object for the tool (omit or use {} when toolName is "done").',
    },
    reply: {
      type: 'string',
      description:
        'Your conversational reply to the user. Only populated when toolName is "done".',
    },
  },
};

// ---------------------------------------------------------------------------
// extractJsonFromResponse — robustly extracts a JSON object from a model
// response that may be wrapped in markdown code fences or have leading/
// trailing text. Returns null if no valid JSON object is found.
//
// 3-tier strategy (identical to AgentDrawer):
//   1. direct JSON.parse of the trimmed response (happy path)
//   2. strip ```json ... ``` / ``` ... ``` fences, then parse
//   3. brace-extract the first { ... } block, then parse
//
// Chrome 147 Canary's session.prompt() with responseFormat sometimes returns
// the JSON wrapped in fences despite the schema constraint; without this the
// bare JSON.parse throws and the raw response leaks into the chat bubble.
// ---------------------------------------------------------------------------
export function extractJsonFromResponse(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();

  // 1. Try the response as-is first (happy path).
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to fence-stripping
  }

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim()) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to brace extraction
    }
  }

  // 3. Extract the first { ... } block (handles pre/appended prose).
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // extraction failed
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// coerceArgs — normalize the model's `args` field to an object. Small on-device
// models sometimes emit args as a JSON STRING (e.g. "{\"a\":2}") instead of an
// object; parse those so the tool still receives its arguments. Anything else
// (arrays, primitives, unparseable strings) → {}.
// ---------------------------------------------------------------------------
export function coerceArgs(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // not JSON — fall through to {}
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// renderSchemaProperties — compact one-line rendering of an MCP inputSchema's
// top-level properties, e.g. `{ "city": string (required), "days": number }`.
// Falls back to `{}` when the schema declares no properties.
// ---------------------------------------------------------------------------
function renderSchemaProperties(inputSchema: Record<string, unknown>): string {
  const props =
    inputSchema && typeof inputSchema.properties === 'object' && inputSchema.properties !== null
      ? (inputSchema.properties as Record<string, unknown>)
      : {};
  const required = Array.isArray(inputSchema?.required)
    ? (inputSchema.required as unknown[]).filter((r): r is string => typeof r === 'string')
    : [];

  const entries = Object.entries(props);
  if (entries.length === 0) return '{}';

  const rendered = entries
    .map(([key, value]) => {
      const spec = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const type = typeof spec.type === 'string' ? spec.type : 'any';
      const isRequired = required.includes(key);
      return `"${key}": ${type}${isRequired ? ' (required)' : ''}`;
    })
    .join(', ');

  return `{ ${rendered} }`;
}

// ---------------------------------------------------------------------------
// buildSystemPrompt — teaches the model the JSON dispatch protocol and lists
// the connected server's tools (name + description + compact arg schema) so it
// only ever calls a valid tool name. The system prompt depends on `tools`, so
// ChatPanel recreates its session whenever the tool set changes.
// ---------------------------------------------------------------------------
export function buildSystemPrompt(tools: McpToolInfo[]): string {
  const toolLines =
    tools.length === 0
      ? '(no tools are currently enabled — you cannot call any tool; emit { "toolName": "done", "reply": "..." })'
      : tools
          .map((t) => {
            const desc = t.description ? ` — ${t.description}` : '';
            return `- ${t.name}${desc}\n  args: ${renderSchemaProperties(t.inputSchema)}`;
          })
          .join('\n');

  const validNames = tools.map((t) => t.name).join(', ');

  return `You are an assistant that fulfils the user's request by calling tools exposed by a connected Model Context Protocol (MCP) server.

You respond ONLY with a single JSON object — no markdown, no code fences, no extra text.
Format: { "toolName": "<toolName or 'done'>", "args": { ... }, "reply": "<only when done>" }

Available tools (call ONE per turn; the host will execute it and feed you the result):
${toolLines}

Valid tool names: ${validNames || '(none)'}

CRITICAL RULES:
1. Call ONE tool per turn and wait for its result before deciding the next step.
2. Only ever use a tool name from the "Valid tool names" list above.
3. Fill "args" using the argument schema shown for the chosen tool.
4. When all tool calls are complete (or the request needs no tool), emit { "toolName": "done", "reply": "..." } with a concise summary of what you did or the answer.
5. NEVER wrap the JSON in code fences or markdown. Output ONLY the raw JSON object.`;
}

// ---------------------------------------------------------------------------
// Max tool-call iterations per user turn (safety guard against runaway loops).
// ---------------------------------------------------------------------------
export const MAX_TOOL_CALLS = 8;
