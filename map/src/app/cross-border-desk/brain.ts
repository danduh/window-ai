// Tier-3 mock brain for Cross-Border Desk.
// Deterministic keyword router + canned tool outputs.
// Mirrors the real architecture: registry of tools, dispatcher calls them.
//
// Typed 1:1 port of the design prototype's brain.js. Strings are copied
// character-for-character (¥ ≈ … × — “ ” and all Japanese text).

import type {
  Beat,
  ChainStep,
  InvoiceData,
  PayoutData,
  ReplyVariant,
  RouteDef,
  ToolMeta,
  ToolName,
} from './types';

export const TOOLS: Record<ToolName, ToolMeta> = {
  extract_invoice:    { api: 'Prompt API · image → JSON', phase: 'offline', ms: 1500 },
  detect_language:    { api: 'Language Detector',         phase: 'offline', ms: 550  },
  translate_document: { api: 'Translator',                phase: 'offline', ms: 950  },
  summarize_terms:    { api: 'Summarizer',                phase: 'offline', ms: 850  },
  check_document:     { api: 'App logic · math check',    phase: 'offline', ms: 700  },
  draft_reply:        { api: 'Writer',                    phase: 'offline', ms: 1200 },
  restyle_reply:      { api: 'Rewriter',                  phase: 'offline', ms: 850  },
  polish_reply:       { api: 'Proofreader',               phase: 'offline', ms: 650  },
  queue_payout:       { api: 'App logic · sign + stage',  phase: 'offline', ms: 750, confirm: true },
  settle_payout:      { api: 'App logic · mock rail',     phase: 'online',  ms: 1300, confirm: true },
};

export const INVOICE: InvoiceData = {
  file: 'invoice_2026-0614.png',
  vendor: '佐藤デザイン事務所',
  vendorEn: 'Sato Design Studio',
  number: 'INV-2026-0614',
  issued: 'June 14, 2026',
  due: 'July 14, 2026',
  currency: 'JPY',
  totalDisplay: '¥479,600',
  usd: '≈ $2,973.71 USD',
  fx: '1 USD = 161.28 JPY',
  langName: 'Japanese',
  langCode: 'ja',
  confidence: '98%',
  recipientToken: 'rcp_7f3a…9c21',
  items: [
    { ja: 'LPデザイン一式',        en: 'Landing page design (full set)', amt: '¥260,000' },
    { ja: 'バナー制作 8点',        en: 'Banner production × 8',          amt: '¥96,000'  },
    { ja: '修正対応（2ラウンド）', en: 'Revisions (2 rounds)',           amt: '¥80,000'  },
    { ja: '消費税 10%',            en: 'Consumption tax (10%)',          amt: '¥43,600'  },
  ],
};

export const SUMMARY: string[] = [
  'Design work: landing page, 8 banners, 2 revision rounds',
  'Total ¥479,600 (≈ $2,973 USD), incl. 10% consumption tax',
  'Due July 14, 2026 — 30-day terms',
  'Bank transfer to Sato Design Studio; sender pays fees',
];

export const REPLIES: ReplyVariant[] = [
  { label: 'Draft · EN', tool: 'draft_reply',
    text: "Hi Mr. Sato,\n\nThanks for invoice INV-2026-0614 — everything looks good. I'll send payment within two weeks, by July 14.\n\nOne thing: could you send a PDF copy of the invoice for my records?\n\nBest,\nDaniel" },
  { label: 'Formal', tool: 'restyle_reply',
    text: 'Dear Mr. Sato,\n\nThank you for sending invoice INV-2026-0614. I have reviewed the details and confirm that everything is in order. Payment will be issued within two weeks, no later than July 14.\n\nCould I kindly ask you to provide a PDF copy of the invoice for our records?\n\nWith best regards,\nDaniel' },
  { label: 'Polished', tool: 'polish_reply',
    text: 'Dear Mr. Sato,\n\nThank you for sending invoice INV-2026-0614. I have reviewed the details, and everything is in order. Payment will be issued within two weeks — no later than July 14.\n\nWould you kindly provide a PDF copy of the invoice for our records?\n\nWith best regards,\nDaniel' },
  { label: '日本語', tool: 'translate_document',
    text: '佐藤様\n\n請求書INV-2026-0614をお送りいただき、誠にありがとうございます。内容を確認し、問題ないことをお伝えいたします。お支払いは2週間以内、7月14日までに行います。\n\n恐れ入りますが、記録のため請求書のPDFをお送りいただけますでしょうか。\n\n何卒よろしくお願い申し上げます。\nダニエル' },
];

export const PAYOUT: PayoutData = {
  recipient_token: 'rcp_7f3a…9c21',
  amount: '479600',
  currency: 'JPY',
  idempotency_key: 'idk_9f2e41ac-07c2',
  signature: 'sha256:7b3c19…e91f',
  nonce: 'n_58d13a',
};

// Canned result line per tool (what the chip prints when done)
export const RESULTS: Record<ToolName, string> = {
  extract_invoice:    '4 line items · total ¥479,600 · due Jul 14 → invoice card',
  detect_language:    'ja · Japanese · 98% confidence',
  translate_document: 'ja → en · 4 line items + terms translated',
  summarize_terms:    '4 key terms → gist card',
  check_document:     'line items sum to total · dates + tax format OK',
  draft_reply:        '142 words · en → reply card',
  restyle_reply:      'tone: formal · length kept',
  polish_reply:       '2 fixes: comma splice, em-dash spacing',
  queue_payout:       'instruction signed + staged locally · idempotent',
  settle_payout:      '202 Accepted · 4 fields transmitted · 0 documents',
};

// Router: first match wins. Order matters (settle before queue before generic).
export const ROUTES: RouteDef[] = [
  { id: 'settle', test: /settle|transmit|send (the )?money|release/i,
    chain: ['settle_payout'], needs: 'payout',
    reply: "Settled. Here's everything that crossed the network — four fields, no documents, no PII. Everything that understood this invoice ran with the cable pulled." },
  { id: 'queue', test: /queue|stage|prepare|payout|pay (him|it|them)/i,
    chain: ['queue_payout'], needs: 'invoice',
    reply: "Payout staged — signed and idempotent, sitting locally. Nothing has touched the network. Flip it on when you're ready to settle." },
  { id: 'reply', test: /draft|reply|respond|write.*(back|him|mail)/i,
    chain: ['draft_reply', 'restyle_reply', 'polish_reply', 'translate_document'], needs: 'invoice',
    reply: 'Drafted, restyled formal, proofread, and translated to Japanese. All four versions are in the reply card — the 日本語 tab is ready to send.' },
  { id: 'translate', test: /translat|gist|summar|understand|mean/i,
    chain: ['translate_document', 'summarize_terms'], needs: 'invoice',
    reply: 'Translated to English and boiled down to four points. Design work, ¥479,600 all-in, due July 14, bank transfer with fees on you.' },
  { id: 'read', test: /read|extract|scan|look|what.*(is|say)|open/i,
    chain: ['extract_invoice', 'detect_language'], needsAttach: true,
    reply: 'Got it. A Japanese invoice from Sato Design Studio — ¥479,600, due July 14. The full breakdown is in the invoice card. Want the English version and the gist?' },
];

export const FALLBACK =
  'I can read a dropped invoice, translate it, summarize the terms, draft and polish a reply, and stage or settle a payout. Try: “Read it” after dropping an invoice.';

export const NEEDS_INVOICE =
  "I don't have an invoice yet. Drop one into the chat (or use the paperclip) and say “read it”.";

export const NEEDS_PAYOUT =
  "Nothing is staged yet. Say “queue the payout” first — I'll sign and stage the instruction locally.";

export const OFFLINE_BLOCK =
  "settle_payout needs the network, and it's off. That's the point — everything so far ran on-device. Flip the network on and ask again.";

// The five scripted beats (presenter rail)
export const BEATS: Beat[] = [
  { n: 1, label: 'Drop invoice · read it',  msg: 'Read it.', attach: true },
  { n: 2, label: 'Translate + gist',        msg: 'Translate it and give me the gist.' },
  { n: 3, label: 'Draft reply · 4 tools',   msg: "Draft a reply: I'll pay in two weeks, ask for a PDF. Formal, proofread, then in Japanese." },
  { n: 4, label: 'Queue payout (offline)',  msg: 'Queue the payout.' },
  { n: 5, label: 'Network on · settle',     msg: 'Settle it.', goOnline: true },
];

// ── UI strings (not in brain.js) ────────────────────────────────────────
export const SEED_ASSISTANT =
  "Offline and ready. Drop an invoice — I'll read it, translate it, draft the reply, and stage the payout, all on this device.";

export const NET_ON_MSG = 'Network on — one beat, settlement only';
export const NET_OFF_MSG = 'Network off — airplane mode';

// ── Derived helpers ───────────────────────────────────────────────────────

/**
 * Tier-1 continuation map derived from ROUTES chains (A§3.4). When Nano routes
 * to an entering tool, the dispatcher expands it with these follow-on tools.
 */
export const CHAINS: Partial<Record<ToolName, ToolName[]>> = {
  translate_document: ['summarize_terms'],
  draft_reply: ['restyle_reply', 'polish_reply', 'translate_document'],
  extract_invoice: ['detect_language'],
};

/** Per-tool args used to expand a route's `chain` into `ChainStep[]` (§4.7). */
function argsForTool(tool: ToolName, route: RouteDef): Record<string, unknown> {
  switch (tool) {
    case 'translate_document':
      // translate route → en; the reply route's translate step → ja.
      return { target: route.id === 'reply' ? 'ja' : 'en' };
    case 'draft_reply':
      return { intent: 'confirm receipt; pay within two weeks; ask for PDF', tone: 'neutral' };
    case 'restyle_reply':
      return { tone: 'more-formal', length: 'as-is' };
    case 'polish_reply':
      return {};
    case 'queue_payout':
      return {
        recipient_token: PAYOUT.recipient_token,
        amount: PAYOUT.amount,
        currency: PAYOUT.currency,
      };
    case 'settle_payout':
      return { idempotency_key: PAYOUT.idempotency_key };
    default:
      return {};
  }
}

/**
 * Deterministic keyword router (Tier 3). First route whose `test` matches wins.
 * Expands the route's `chain` into resolved `ChainStep[]`. Returns `null` when
 * no route matches (dispatcher shows FALLBACK).
 */
export function keywordChain(
  msg: string,
): { route: RouteDef; steps: ChainStep[] } | null {
  const route = ROUTES.find((r) => r.test.test(msg));
  if (!route) return null;
  const steps: ChainStep[] = route.chain.map((tool) => ({
    tool,
    args: argsForTool(tool, route),
  }));
  return { route, steps };
}

/** Returns the route's closing assistant reply for a given route id. */
export function routeReplyFor(routeId: string): string {
  const route = ROUTES.find((r) => r.id === routeId);
  return route ? route.reply : FALLBACK;
}
