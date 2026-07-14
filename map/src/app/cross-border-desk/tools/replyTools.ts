// Reply-side tools (A§1, A§5.3): draft_reply (Writer), restyle_reply (Rewriter),
// polish_reply (Proofreader).
//
// All three back flag/OT-gated APIs — they gate on availability() (via apiLive)
// and fall back to the canned REPLIES silently so the 5-beat demo never stalls.
//
// Language-aware: the active language is resolved from the extracted invoice
// (ctx.state.invoice?.langCode), defaulting to 'ja'.

import { TOOLS, fixtureFor, resultLineFor } from '../brain';
import type { Lang, ToolResult } from '../types';
import {
  cannedMutation,
  makeToolResult,
  mockResult,
  simulateLatency,
  type ToolCtx,
} from './shared';

const KNOWN_LANGS: readonly Lang[] = ['ja', 'de', 'es'];

/** Resolve the active language: dispatcher-threaded args.lang wins, else the extracted invoice's langCode. */
function langOf(args: Record<string, unknown>, ctx: ToolCtx): Lang {
  const fromArgs = typeof args.lang === 'string' ? args.lang : undefined;
  const code = fromArgs ?? ctx.state.invoice?.langCode;
  return code && (KNOWN_LANGS as readonly string[]).includes(code)
    ? (code as Lang)
    : 'ja';
}

// ── draft_reply (Writer) ──────────────────────────────────────────────────────
export async function draftReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.draft_reply.ms, ctx.speed);
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.draft_reply) {
    return mockResult('draft_reply', args, lang);
  }
  try {
    const intent =
      typeof args.intent === 'string'
        ? args.intent
        : 'confirm receipt; pay within two weeks; ask for PDF';
    const number = ctx.state.invoice?.number ?? fixtureFor(lang).invoice.number;
    const writer = await window.Writer.create({
      tone: 'neutral',
      outputLanguage: 'en',
    });
    try {
      await writer.write(
        `Write a short business email reply to invoice ${number}. Intent: ${intent}.`,
      );
    } finally {
      writer.destroy();
    }
    // Panels render the canonical draft fixture (replies[0]) for this language.
    return makeToolResult(
      resultLineFor('draft_reply', fixtureFor(lang)),
      cannedMutation('draft_reply', args, lang),
      false,
    );
  } catch {
    return mockResult('draft_reply', args, lang);
  }
}

// ── restyle_reply (Rewriter) ───────────────────────────────────────────────────
export async function restyleReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.restyle_reply.ms, ctx.speed);
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.restyle_reply) {
    return mockResult('restyle_reply', args, lang);
  }
  try {
    const draft = ctx.state.replies[0]?.text ?? fixtureFor(lang).replies[0].text;
    const rewriter = await window.Rewriter.create({
      tone: 'more-formal',
      length: 'as-is',
      outputLanguage: 'en',
    });
    // Restyle the current draft into a more-formal variant.
    try {
      await rewriter.rewrite(draft, {
        context: 'Make this reply more formal while keeping the length.',
      });
    } finally {
      rewriter.destroy();
    }
    // Panels render the canonical formal fixture (replies[1]) for this language.
    return makeToolResult(
      resultLineFor('restyle_reply', fixtureFor(lang)),
      cannedMutation('restyle_reply', args, lang),
      false,
    );
  } catch {
    return mockResult('restyle_reply', args, lang);
  }
}

// ── polish_reply (Proofreader) ─────────────────────────────────────────────────
export async function polishReply(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.polish_reply.ms, ctx.speed);
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.polish_reply) {
    return mockResult('polish_reply', args, lang);
  }
  try {
    const formal = ctx.state.replies[1]?.text ?? fixtureFor(lang).replies[1].text;
    const proofreader = await window.Proofreader.create({
      includeCorrectionTypes: true,
      expectedInputLanguages: ['en'],
    });
    // Proofread the current formal variant.
    try {
      await proofreader.proofread(formal);
    } finally {
      proofreader.destroy();
    }
    // Panels render the canonical polished fixture (replies[2]) for this language.
    return makeToolResult(
      resultLineFor('polish_reply', fixtureFor(lang)),
      cannedMutation('polish_reply', args, lang),
      false,
    );
  } catch {
    return mockResult('polish_reply', args, lang);
  }
}
