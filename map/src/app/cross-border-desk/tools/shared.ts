// Shared tool-execution primitives for the Cross-Border Desk (A§1, A§5.3).
//
// Every tool wraps a real Chrome built-in AI API and has a Tier-3 deterministic
// mock fallback so the 5-beat demo runs on any machine. This module holds the
// context type, the latency simulator, the mock-result builder, and the
// makeToolResult helper — shared across invoiceTools / replyTools / payoutTools.

import {
  INVOICE,
  PAYOUT,
  REPLIES,
  RESULTS,
  SUMMARY,
} from '../brain';
import type {
  DeskAction,
  DeskState,
  MinimalPayload,
  PayoutData,
  Tier,
  ToolName,
  ToolResult,
} from '../types';

/**
 * Context threaded into every tool `execute`. Read-only view of the reducer
 * state (via a live ref in useDesk), the demo speed multiplier, the detected
 * global tier, and the per-API liveness map from `perApiTier()`.
 */
export interface ToolCtx {
  state: DeskState;
  speed: number;
  tier: Tier;
  apiLive: Record<string, boolean>;
}

/** Tier-3 & fallback pacing: resolves after `ms / speed` milliseconds. */
export function simulateLatency(ms: number, speed: number): Promise<void> {
  const divisor = speed > 0 ? speed : 1;
  return new Promise((resolve) => setTimeout(resolve, ms / divisor));
}

/** The exactly-four fields that cross the wire on settle (thesis claim 3). */
export function pickMinimal(p: PayoutData): MinimalPayload {
  return {
    recipient_token: p.recipient_token,
    amount: p.amount,
    currency: p.currency,
    idempotency_key: p.idempotency_key,
  };
}

/**
 * Maps each tool to its deterministic brain.ts state slice (the reducer action
 * the dispatcher applies). `args` disambiguates translate_document: the reply
 * route's `target:'ja'` step sets REPLIES[3]; the translate route's `target:'en'`
 * step sets the translated document.
 */
export function cannedMutation(
  name: ToolName,
  args: Record<string, unknown>,
): DeskAction {
  switch (name) {
    case 'extract_invoice':
      return { type: 'SET_INVOICE', invoice: INVOICE };
    case 'detect_language':
      return {
        type: 'SET_DETECTED',
        detected: { code: 'ja', name: 'Japanese', confidence: '98%' },
      };
    case 'translate_document':
      if (args.target === 'ja') {
        return { type: 'SET_REPLY', index: 3, reply: REPLIES[3] };
      }
      return {
        type: 'SET_TRANSLATED',
        translated: { text: SUMMARY.join('\n'), items: INVOICE.items },
      };
    case 'summarize_terms':
      return { type: 'SET_SUMMARY', summary: SUMMARY };
    case 'check_document':
      return {
        type: 'SET_INVOICE_CHECK',
        check: { itemsSumToTotal: true, datesOk: true, taxOk: true },
      };
    case 'draft_reply':
      return { type: 'SET_REPLY', index: 0, reply: REPLIES[0] };
    case 'restyle_reply':
      return { type: 'SET_REPLY', index: 1, reply: REPLIES[1] };
    case 'polish_reply':
      return { type: 'SET_REPLY', index: 2, reply: REPLIES[2] };
    case 'queue_payout':
      return { type: 'SET_PAYOUT', payout: PAYOUT };
    case 'settle_payout':
      return {
        type: 'SET_SETTLED',
        settled: { payload: pickMinimal(PAYOUT), status: '202 Accepted' },
      };
    default:
      // Exhaustiveness guard — every ToolName is handled above.
      return { type: 'SET_BUSY', busy: false };
  }
}

/** Canned Tier-3 result: brain.ts slice + RESULTS line + `mocked:true`. */
export function mockResult(
  name: ToolName,
  args: Record<string, unknown> = {},
): ToolResult {
  return {
    resultLine: RESULTS[name],
    mocked: true,
    mutation: cannedMutation(name, args),
  };
}

/** Builds a live (non-mock) ToolResult from a real API call. */
export function makeToolResult(
  resultLine: string,
  mutation: DeskAction,
  mocked: boolean,
): ToolResult {
  return { resultLine, mutation, mocked };
}
