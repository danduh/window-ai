// WebMCP registration (reuse-map §6, A§7).
//
// buildToolDefs() → ModelContextTool[] (10 entries) bound to a live ToolCtx.
// registerDeskTools() is the StrictMode-hardened registration loop mirroring
// RecipeWorkbenchPage.tsx:166-231 — a module-scope AbortController pre-aborts a
// stale controller, a fresh one governs this mount, and a duplicate-name guard
// swallows the benign StrictMode double-register error. makeCallTool() is the
// lookup shim the dispatcher uses so document.modelContext stays the single
// source of truth for tool invocation.

import { getModelContext } from './modelContext';
import type { ToolName, ToolResult } from './types';
import type { ToolCtx } from './tools/shared';
import {
  checkDocument,
  detectLanguage,
  extractInvoice,
  summarizeTerms,
  translateDocument,
} from './tools/invoiceTools';
import { draftReply, polishReply, restyleReply } from './tools/replyTools';
import { queuePayout, settlePayout } from './tools/payoutTools';

/** A tool's implementation: (args, live ctx) → ToolResult. */
type ToolImpl = (
  args: Record<string, unknown>,
  ctx: ToolCtx,
) => Promise<ToolResult>;

const IMPLS: Record<ToolName, ToolImpl> = {
  extract_invoice: extractInvoice,
  detect_language: detectLanguage,
  translate_document: translateDocument,
  summarize_terms: summarizeTerms,
  check_document: checkDocument,
  draft_reply: draftReply,
  restyle_reply: restyleReply,
  polish_reply: polishReply,
  queue_payout: queuePayout,
  settle_payout: settlePayout,
};

const DESCRIPTIONS: Record<ToolName, string> = {
  extract_invoice: 'Read a dropped invoice image into structured JSON.',
  detect_language: 'Identify the language of the invoice text.',
  translate_document:
    'Translate the invoice (ja→en) or a reply (en→ja). args.target is "en" or "ja".',
  summarize_terms: 'Summarize the invoice terms into key points.',
  check_document: 'Validate that the invoice line items sum to the total.',
  draft_reply: 'Draft a short business email reply to the invoice.',
  restyle_reply: 'Rewrite a drafted reply to be more formal.',
  polish_reply: 'Proofread a reply for grammar and punctuation.',
  queue_payout: 'Sign and stage the payout instruction locally (offline).',
  settle_payout: 'Transmit the minimal payout payload on the network (online).',
};

const INPUT_SCHEMAS: Record<ToolName, object> = {
  extract_invoice: { type: 'object', properties: {}, additionalProperties: false },
  detect_language: { type: 'object', properties: {}, additionalProperties: false },
  translate_document: {
    type: 'object',
    properties: { target: { type: 'string', enum: ['en', 'ja'] } },
    additionalProperties: false,
  },
  summarize_terms: { type: 'object', properties: {}, additionalProperties: false },
  check_document: { type: 'object', properties: {}, additionalProperties: false },
  draft_reply: {
    type: 'object',
    properties: { intent: { type: 'string' }, tone: { type: 'string' } },
    additionalProperties: false,
  },
  restyle_reply: {
    type: 'object',
    properties: { tone: { type: 'string' }, length: { type: 'string' } },
    additionalProperties: false,
  },
  polish_reply: { type: 'object', properties: {}, additionalProperties: false },
  queue_payout: {
    type: 'object',
    properties: {
      recipient_token: { type: 'string' },
      amount: { type: 'string' },
      currency: { type: 'string' },
    },
    additionalProperties: false,
  },
  settle_payout: {
    type: 'object',
    properties: { idempotency_key: { type: 'string' } },
    additionalProperties: false,
  },
};

const TOOL_ORDER: ToolName[] = [
  'extract_invoice',
  'detect_language',
  'translate_document',
  'summarize_terms',
  'check_document',
  'draft_reply',
  'restyle_reply',
  'polish_reply',
  'queue_payout',
  'settle_payout',
];

/** A registered desk tool: the WebMCP def plus its ToolName for the call shim. */
export interface DeskToolDef {
  name: ToolName;
  tool: ModelContextTool;
  run: (args: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * Builds the 10 WebMCP tool defs, each bound to a LIVE ToolCtx via `getCtx()`
 * so tools always read the latest reducer state / apiLive map at call time.
 * `execute` returns the tool's `resultLine` string (the WebMCP-visible payload);
 * the dispatcher uses the richer `run()` (full ToolResult) via makeCallTool.
 */
export function buildToolDefs(getCtx: () => ToolCtx): DeskToolDef[] {
  return TOOL_ORDER.map((name) => {
    const run = (args: Record<string, unknown>): Promise<ToolResult> =>
      IMPLS[name](args ?? {}, getCtx());
    const tool: ModelContextTool = {
      name,
      description: DESCRIPTIONS[name],
      inputSchema: INPUT_SCHEMAS[name],
      execute: async (input: unknown) => {
        const args =
          input && typeof input === 'object'
            ? (input as Record<string, unknown>)
            : {};
        const result = await run(args);
        return result.resultLine;
      },
    };
    return { name, tool, run };
  });
}

// ── StrictMode-hardened registration (RecipeWorkbenchPage.tsx:166-231) ──────────
let previousDeskRegistrationController: AbortController | null = null;
const DUPLICATE_NAME_PATTERN = /duplicate tool name|already registered/i;

export type RegistrationStatus =
  | 'unavailable'
  | 'success'
  | 'partial'
  | 'error';

/**
 * Registers every desk tool with document.modelContext under a page-unique
 * AbortController. Pre-aborts any stale controller (StrictMode / HMR), swallows
 * the benign duplicate-name error, and returns a cleanup that aborts the whole
 * set atomically. Returns null when WebMCP is unavailable (caller no-ops).
 */
export function registerDeskTools(
  defs: DeskToolDef[],
  onStatus?: (status: RegistrationStatus, count: number) => void,
): (() => void) | null {
  const modelContext = getModelContext();
  if (!modelContext) {
    onStatus?.('unavailable', 0);
    return null;
  }
  // (1) Defensively abort any controller a prior mount cycle left hanging.
  if (
    previousDeskRegistrationController &&
    !previousDeskRegistrationController.signal.aborted
  ) {
    previousDeskRegistrationController.abort();
  }
  const controller = new AbortController();
  previousDeskRegistrationController = controller;

  const registered: string[] = [];
  let fatalError: unknown = null;
  for (const def of defs) {
    try {
      modelContext.registerTool(def.tool, { signal: controller.signal });
      registered.push(def.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (DUPLICATE_NAME_PATTERN.test(message)) {
        // (2) Already registered from a prior synchronous mount that hasn't
        // reconciled yet. Same name → same handler shape (defs are stable).
        registered.push(def.name);
        continue;
      }
      fatalError = err;
      break;
    }
  }
  if (fatalError) {
    onStatus?.(registered.length > 0 ? 'partial' : 'error', registered.length);
  } else {
    onStatus?.('success', registered.length);
  }

  return () => {
    controller.abort();
    if (previousDeskRegistrationController === controller) {
      previousDeskRegistrationController = null;
    }
  };
}

/**
 * Lookup shim: the dispatcher calls tools ONLY through this so the registered
 * set is the single source of truth. Returns the full ToolResult (mutation +
 * mocked flag), unlike the WebMCP `execute` which returns only the result line.
 */
export function makeCallTool(
  defs: DeskToolDef[],
): (name: ToolName, args: Record<string, unknown>) => Promise<ToolResult> {
  const byName = new Map<ToolName, DeskToolDef>(
    defs.map((d) => [d.name, d]),
  );
  return (name, args) => {
    const def = byName.get(name);
    if (!def) {
      return Promise.reject(new Error(`Unknown tool: ${name}`));
    }
    return def.run(args);
  };
}
