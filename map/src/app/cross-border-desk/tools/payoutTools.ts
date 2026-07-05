// Payout-side tools (A§1, A§4.3): queue_payout, settle_payout.
//
// Pure app logic — no external AI API. queue builds the local signed instruction
// (in memory only, no persistence); settle transmits pickMinimal (mock rail, no
// real network call, but gated behind state.online + a human confirm upstream).

import { PAYOUT, RESULTS, TOOLS } from '../brain';
import type { ToolResult } from '../types';
import {
  makeToolResult,
  pickMinimal,
  simulateLatency,
  type ToolCtx,
} from './shared';

// ── queue_payout ──────────────────────────────────────────────────────────────
export async function queuePayout(
  _args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.queue_payout.ms, ctx.speed);
  // Signs + stages the instruction locally (in-memory only, no persistence).
  return makeToolResult(
    RESULTS.queue_payout,
    { type: 'SET_PAYOUT', payout: PAYOUT },
    false,
  );
}

// ── settle_payout ─────────────────────────────────────────────────────────────
export async function settlePayout(
  _args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.settle_payout.ms, ctx.speed);
  // The only phase:'online' tool. The dispatcher already enforced the online
  // guard + confirm before we run. Transmit exactly the four minimal fields
  // (mock rail — no real fetch); PII/docs/signature/nonce never leave the device.
  const payload = pickMinimal(PAYOUT);
  return makeToolResult(
    RESULTS.settle_payout,
    { type: 'SET_SETTLED', settled: { payload, status: '202 Accepted' } },
    false,
  );
}
