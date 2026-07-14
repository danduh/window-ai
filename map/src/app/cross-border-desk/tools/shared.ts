// Shared tool-execution primitives for the Cross-Border Desk (A§1, A§5.3).
//
// Every tool wraps a real Chrome built-in AI API and has a Tier-3 deterministic
// mock fallback so the 5-beat demo runs on any machine. This module holds the
// context type, the latency simulator, the mock-result builder, and the
// makeToolResult helper — shared across invoiceTools / replyTools / payoutTools.

import { fixtureFor, resultLineFor } from '../brain';
import type {
  DeskAction,
  DeskState,
  Lang,
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
  lang?: Lang,
): DeskAction {
  const fx = fixtureFor(lang);
  switch (name) {
    case 'extract_invoice':
      return { type: 'SET_INVOICE', invoice: fx.invoice };
    case 'detect_language':
      return {
        type: 'SET_DETECTED',
        detected: {
          code: fx.invoice.langCode,
          name: fx.invoice.langName,
          confidence: fx.invoice.confidence,
        },
      };
    case 'translate_document':
      // reply route → translate back to native (any non-'en' target);
      // translate route → 'en' sets the translated document.
      if (args.target && args.target !== 'en') {
        return { type: 'SET_REPLY', index: 3, reply: fx.replies[3] };
      }
      return {
        type: 'SET_TRANSLATED',
        translated: { text: fx.summary.join('\n'), items: fx.invoice.items },
      };
    case 'summarize_terms':
      return { type: 'SET_SUMMARY', summary: fx.summary };
    case 'check_document':
      return {
        type: 'SET_INVOICE_CHECK',
        check: { itemsSumToTotal: true, datesOk: true, taxOk: true },
      };
    case 'draft_reply':
      return { type: 'SET_REPLY', index: 0, reply: fx.replies[0] };
    case 'restyle_reply':
      return { type: 'SET_REPLY', index: 1, reply: fx.replies[1] };
    case 'polish_reply':
      return { type: 'SET_REPLY', index: 2, reply: fx.replies[2] };
    case 'queue_payout':
      return { type: 'SET_PAYOUT', payout: fx.payout };
    case 'settle_payout':
      return {
        type: 'SET_SETTLED',
        settled: { payload: pickMinimal(fx.payout), status: '202 Accepted' },
      };
    default:
      // Exhaustiveness guard — every ToolName is handled above.
      return { type: 'SET_BUSY', busy: false };
  }
}

/** Canned Tier-3 result: brain.ts slice + fixture result line + `mocked:true`. */
export function mockResult(
  name: ToolName,
  args: Record<string, unknown> = {},
  lang?: Lang,
): ToolResult {
  return {
    resultLine: resultLineFor(name, fixtureFor(lang)),
    mocked: true,
    mutation: cannedMutation(name, args, lang),
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
