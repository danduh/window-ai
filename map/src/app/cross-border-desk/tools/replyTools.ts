// Reply-side tools (A§1, A§5.3): draft_reply (Writer), restyle_reply (Rewriter),
// polish_reply (Proofreader).
//
// All three back flag/OT-gated APIs — they gate on availability() (via apiLive)
// and fall back to the canned REPLIES silently so the 5-beat demo never stalls.

import { REPLIES, RESULTS, TOOLS } from '../brain';
import type { ToolResult } from '../types';
import {
  cannedMutation,
  makeToolResult,
  mockResult,
  simulateLatency,
  type ToolCtx,
} from './shared';

// ── draft_reply (Writer) ──────────────────────────────────────────────────────
export async function draftReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.draft_reply.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.draft_reply) {
    return mockResult('draft_reply', args);
  }
  try {
    const intent =
      typeof args.intent === 'string'
        ? args.intent
        : 'confirm receipt; pay within two weeks; ask for PDF';
    const writer = await window.Writer.create({
      tone: 'neutral',
      outputLanguage: 'en',
    });
    try {
      await writer.write(
        `Write a short business email reply to invoice INV-2026-0614. Intent: ${intent}.`,
      );
    } finally {
      writer.destroy();
    }
    // Panels render the canonical draft fixture (REPLIES[0]).
    return makeToolResult(
      RESULTS.draft_reply,
      cannedMutation('draft_reply', args),
      false,
    );
  } catch {
    return mockResult('draft_reply', args);
  }
}

// ── restyle_reply (Rewriter) ───────────────────────────────────────────────────
export async function restyleReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.restyle_reply.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.restyle_reply) {
    return mockResult('restyle_reply', args);
  }
  try {
    const rewriter = await window.Rewriter.create({
      tone: 'more-formal',
      length: 'as-is',
      outputLanguage: 'en',
    });
    // Restyle the draft (REPLIES[0]) into a more-formal variant.
    try {
      await rewriter.rewrite(REPLIES[0].text, {
        context: 'Make this reply more formal while keeping the length.',
      });
    } finally {
      rewriter.destroy();
    }
    // Panels render the canonical formal fixture (REPLIES[1]).
    return makeToolResult(
      RESULTS.restyle_reply,
      cannedMutation('restyle_reply', args),
      false,
    );
  } catch {
    return mockResult('restyle_reply', args);
  }
}

// ── polish_reply (Proofreader) ─────────────────────────────────────────────────
export async function polishReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.polish_reply.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.polish_reply) {
    return mockResult('polish_reply', args);
  }
  try {
    const proofreader = await window.Proofreader.create({
      includeCorrectionTypes: true,
      expectedInputLanguages: ['en'],
    });
    // Proofread the formal variant (REPLIES[1]).
    try {
      await proofreader.proofread(REPLIES[1].text);
    } finally {
      proofreader.destroy();
    }
    // Panels render the canonical polished fixture (REPLIES[2]).
    return makeToolResult(
      RESULTS.polish_reply,
      cannedMutation('polish_reply', args),
      false,
    );
  } catch {
    return mockResult('polish_reply', args);
  }
}
