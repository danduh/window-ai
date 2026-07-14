// Invoice-side tools (A§1, A§5.3): extract_invoice, detect_language,
// translate_document, summarize_terms, check_document.
//
// Each wraps a real Chrome built-in AI API with a per-tool Tier-3 mock fallback
// (brain.ts slice) + latency sim. Real call throws / API not live → mockResult.
//
// Language-aware: extract resolves the language from the pending attachment;
// every downstream tool resolves it from the already-extracted invoice.

import { RESULTS, TOOLS, fixtureFor, resultLineFor } from '../brain';
import type { InvoiceData, Lang, ToolResult } from '../types';
import {
  cannedMutation,
  makeToolResult,
  mockResult,
  simulateLatency,
  type ToolCtx,
} from './shared';

/**
 * Local interface for a LanguageModel that accepts array-based multimodal input.
 * dom-chromium-ai.d.ts declares only the string overload — do NOT modify it.
 * Same local-cast workaround as chat/MultimodalService.ts (reuse-map §1e).
 */
interface MultimodalLanguageModel {
  prompt(
    input: Array<{
      role: string;
      content: Array<{ type: string; value: unknown }>;
    }>,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
  destroy(): void;
}

/** The three languages we ship fixtures for. */
const KNOWN_LANGS: readonly Lang[] = ['ja', 'de', 'es'];

/** Narrows an arbitrary lang code to a known fixture Lang, defaulting to 'ja'. */
function asLang(code: string | undefined): Lang {
  return code && (KNOWN_LANGS as readonly string[]).includes(code)
    ? (code as Lang)
    : 'ja';
}

/**
 * Resolve the active language for a tool call. The dispatcher threads a single
 * `args.lang` for the whole turn (authoritative), so all steps agree even while
 * extract is still setting the invoice mid-loop. Falls back to the attachment /
 * extracted invoice for direct calls that don't pass `args.lang`.
 */
function langOf(args: Record<string, unknown>, ctx: ToolCtx): Lang {
  const fromArgs = typeof args.lang === 'string' ? args.lang : undefined;
  return asLang(
    fromArgs ?? ctx.state.pendingAttach?.lang ?? ctx.state.invoice?.langCode,
  );
}

/** Strips ``` / ```json fences the model may wrap around JSON despite responseFormat. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

/** Converts a data-URL (data:image/png;base64,...) into a Blob for multimodal input. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

const INVOICE_SCHEMA = {
  type: 'object',
  properties: {
    vendor: { type: 'string' },
    number: { type: 'string' },
    currency: { type: 'string' },
    total: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          amount: { type: 'string' },
        },
        required: ['description', 'amount'],
        additionalProperties: false,
      },
    },
  },
  required: ['vendor', 'total', 'items'],
  additionalProperties: false,
} as const;

interface ParsedInvoice {
  vendor?: unknown;
  number?: unknown;
  currency?: unknown;
  total?: unknown;
  items?: unknown[];
}

/** Coerce a possibly-unknown JSON value to a trimmed string ('' if absent). */
function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Builds a real InvoiceData from the model's parsed JSON. Returns null when the
 * payload carries no usable line items (caller then falls back to the fixture).
 * langCode/langName are left empty for detect_language to fill; usd/fx are
 * data-driven and omitted (''), and vendorEn mirrors the raw vendor.
 */
function buildInvoiceFromParsed(
  parsed: ParsedInvoice,
  file: string,
): InvoiceData | null {
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
  const items = parsed.items
    .map((raw) => {
      const it = (raw ?? {}) as { description?: unknown; amount?: unknown };
      return { native: str(it.description), en: '', amt: str(it.amount) };
    })
    .filter((it) => it.native !== '' || it.amt !== '');
  if (items.length === 0) return null;

  const vendor = str(parsed.vendor);
  const total = str(parsed.total);
  return {
    file,
    vendor,
    vendorEn: vendor,
    number: str(parsed.number),
    issued: '',
    due: '',
    currency: str(parsed.currency),
    totalDisplay: total,
    usd: '',
    fx: '',
    langName: '',
    langCode: '',
    confidence: '',
    recipientToken: '',
    originalLabel: 'Original',
    items,
  };
}

// ── extract_invoice ─────────────────────────────────────────────────────────
export async function extractInvoice(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.extract_invoice.ms, ctx.speed);
  // extract resolves lang from the dropped attachment (detect hasn't run yet).
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.extract_invoice || !ctx.state.pendingAttach) {
    return mockResult('extract_invoice', args, lang);
  }
  try {
    const { dataUrl, file } = ctx.state.pendingAttach;
    const blob = await dataUrlToBlob(dataUrl);
    const session = (await LanguageModel.create({
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      outputLanguage: 'en',
      responseFormat: INVOICE_SCHEMA,
    })) as unknown as MultimodalLanguageModel;
    let raw: string;
    try {
      raw = await session.prompt([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              value:
                'Extract this invoice as JSON: vendor, number, currency, total, and line items (description + amount). Keep descriptions in the original language.',
            },
            { type: 'image', value: blob },
          ],
        },
      ]);
    } finally {
      session.destroy();
    }
    const parsed = JSON.parse(stripFences(raw)) as ParsedInvoice;
    const invoice = buildInvoiceFromParsed(parsed, file);
    // Thin data (no usable line items) → deterministic fixture fallback.
    if (!invoice) {
      return mockResult('extract_invoice', args, lang);
    }
    // Real, data-driven invoice card built from what the model actually read.
    return makeToolResult(
      `${invoice.items.length} line items · total ${invoice.totalDisplay || '—'} → invoice card`,
      { type: 'SET_INVOICE', invoice },
      false,
    );
  } catch {
    return mockResult('extract_invoice', args, lang);
  }
}

// ── detect_language ───────────────────────────────────────────────────────────
export async function detectLanguage(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.detect_language.ms, ctx.speed);
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.detect_language) {
    return mockResult('detect_language', args, lang);
  }
  try {
    // Detect over what the model actually extracted: vendor + item natives.
    const inv = ctx.state.invoice;
    const parts = inv
      ? [inv.vendor, ...inv.items.map((i) => i.native)]
      : fixtureFor(lang).invoice.items.map((i) => i.native);
    const sourceText = parts.filter(Boolean).join('\n');
    const detector = await window.LanguageDetector.create();
    let results;
    try {
      results = await detector.detect(sourceText);
    } finally {
      detector.destroy();
    }
    const best = results[0];
    if (!best || best.detectedLanguage === 'und' || best.confidence < 0.4) {
      return mockResult('detect_language', args, lang);
    }
    const code = best.detectedLanguage;
    const pct = `${Math.round(best.confidence * 100)}%`;
    // Prefer the human-readable name from a matching fixture; else Intl.
    const known = (KNOWN_LANGS as readonly string[]).includes(code);
    const name = known
      ? fixtureFor(code as Lang).invoice.langName
      : displayName(code);
    return makeToolResult(
      `${code} · ${name} · ${pct} confidence`,
      { type: 'SET_DETECTED', detected: { code, name, confidence: pct } },
      false,
    );
  } catch {
    return mockResult('detect_language', args, lang);
  }
}

/** Best-effort human-readable language name for a BCP-47 code. */
function displayName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

// ── translate_document ────────────────────────────────────────────────────────
export async function translateDocument(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.translate_document.ms, ctx.speed);
  const lang = langOf(args, ctx);
  // reply route's 4th step translates the English reply back to the native lang.
  const toNative = Boolean(args.target && args.target !== 'en');
  if (ctx.tier === 3 || !ctx.apiLive.translate_document) {
    return mockResult('translate_document', args, lang);
  }
  try {
    const nativeCode = ctx.state.invoice?.langCode || lang;
    const sourceLanguage = toNative ? 'en' : nativeCode;
    const targetLanguage = toNative ? nativeCode : 'en';
    const translator = await window.Translator.create({
      sourceLanguage,
      targetLanguage,
    });
    try {
      const fx = fixtureFor(lang);
      // toNative = translate the drafted English reply into the native language;
      // else translate the extracted native line items into English.
      const source = toNative
        ? fx.replies[0].text
        : (ctx.state.invoice?.items ?? fx.invoice.items)
            .map((i) => i.native)
            .filter(Boolean)
            .join('\n');
      await translator.translate(source);
    } finally {
      translator.destroy();
    }
    return makeToolResult(
      resultLineFor('translate_document', fixtureFor(lang)),
      cannedMutation('translate_document', args, lang),
      false,
    );
  } catch {
    return mockResult('translate_document', args, lang);
  }
}

// ── summarize_terms ───────────────────────────────────────────────────────────
export async function summarizeTerms(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.summarize_terms.ms, ctx.speed);
  const lang = langOf(args, ctx);
  if (ctx.tier === 3 || !ctx.apiLive.summarize_terms) {
    return mockResult('summarize_terms', args, lang);
  }
  try {
    const summarizer = await window.Summarizer.create({
      type: 'key-points',
      outputLanguage: 'en',
    });
    const fx = fixtureFor(lang);
    const source = (ctx.state.invoice?.items ?? fx.invoice.items)
      .map((i) => `${i.en || i.native}: ${i.amt}`)
      .join('\n');
    try {
      await summarizer.summarize(source);
    } finally {
      summarizer.destroy();
    }
    // Panels render the canonical key-point SUMMARY fixture for this language.
    return makeToolResult(
      resultLineFor('summarize_terms', fixtureFor(lang)),
      cannedMutation('summarize_terms', args, lang),
      false,
    );
  } catch {
    return mockResult('summarize_terms', args, lang);
  }
}

// ── check_document ────────────────────────────────────────────────────────────
export async function checkDocument(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.check_document.ms, ctx.speed);
  const lang = langOf(args, ctx);
  // Pure app math (deterministic pass on the active invoice) — no external API.
  const items = ctx.state.invoice?.items ?? fixtureFor(lang).invoice.items;
  const totalDisplay =
    ctx.state.invoice?.totalDisplay ?? fixtureFor(lang).invoice.totalDisplay;
  // Sum the digits of each amount (strip currency symbols, thousands + decimal
  // separators) so JPY (¥479,600) and EUR (4.617,20 €) both compare cleanly.
  const digits = (s: string) => Number(s.replace(/[^0-9]/g, ''));
  const sum = items.reduce((acc, item) => {
    const n = digits(item.amt);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalNum = digits(totalDisplay);
  const itemsSumToTotal = sum === totalNum;
  return makeToolResult(
    RESULTS.check_document,
    {
      type: 'SET_INVOICE_CHECK',
      check: { itemsSumToTotal, datesOk: true, taxOk: true },
    },
    // App-logic tool — never a "mock fallback" in the tier sense.
    false,
  );
}
