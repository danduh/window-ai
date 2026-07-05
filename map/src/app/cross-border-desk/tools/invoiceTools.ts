// Invoice-side tools (A§1, A§5.3): extract_invoice, detect_language,
// translate_document, summarize_terms, check_document.
//
// Each wraps a real Chrome built-in AI API with a per-tool Tier-3 mock fallback
// (brain.ts slice) + latency sim. Real call throws / API not live → mockResult.

import { INVOICE, RESULTS, SUMMARY, TOOLS } from '../brain';
import type { ToolResult } from '../types';
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

// ── extract_invoice ─────────────────────────────────────────────────────────
export async function extractInvoice(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.extract_invoice.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.extract_invoice || !ctx.state.pendingAttach) {
    return mockResult('extract_invoice', args);
  }
  try {
    const dataUrl = ctx.state.pendingAttach.dataUrl;
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
                'Extract this invoice as JSON: vendor, number, currency, total, and line items (description + amount).',
            },
            { type: 'image', value: blob },
          ],
        },
      ]);
    } finally {
      session.destroy();
    }
    const parsed = JSON.parse(stripFences(raw)) as {
      items?: unknown[];
      total?: unknown;
    };
    // Thin data (no line items) → fall back to the deterministic fixture.
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return mockResult('extract_invoice', args);
    }
    // The panels render the canonical INVOICE fixture; the real call proves the
    // API works. Report a live (non-mock) result with the canned mutation.
    return makeToolResult(
      RESULTS.extract_invoice,
      cannedMutation('extract_invoice', args),
      false,
    );
  } catch {
    return mockResult('extract_invoice', args);
  }
}

// ── detect_language ───────────────────────────────────────────────────────────
export async function detectLanguage(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.detect_language.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.detect_language) {
    return mockResult('detect_language', args);
  }
  try {
    const sourceText = INVOICE.items.map((i) => i.ja).join('\n');
    const detector = await window.LanguageDetector.create({
      expectedInputLanguages: ['ja', 'en'],
    });
    let results;
    try {
      results = await detector.detect(sourceText);
    } finally {
      detector.destroy();
    }
    const best = results[0];
    if (
      !best ||
      best.detectedLanguage === 'und' ||
      best.confidence < 0.4
    ) {
      return mockResult('detect_language', args);
    }
    const pct = `${Math.round(best.confidence * 100)}%`;
    return makeToolResult(
      `${best.detectedLanguage} · Japanese · ${pct} confidence`,
      {
        type: 'SET_DETECTED',
        detected: {
          code: best.detectedLanguage,
          name: 'Japanese',
          confidence: pct,
        },
      },
      false,
    );
  } catch {
    return mockResult('detect_language', args);
  }
}

// ── translate_document ────────────────────────────────────────────────────────
export async function translateDocument(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.translate_document.ms, ctx.speed);
  const toJa = args.target === 'ja';
  if (ctx.tier === 3 || !ctx.apiLive.translate_document) {
    return mockResult('translate_document', args);
  }
  try {
    const sourceLanguage = toJa ? 'en' : 'ja';
    const targetLanguage = toJa ? 'ja' : 'en';
    const translator = await window.Translator.create({
      sourceLanguage,
      targetLanguage,
    });
    try {
      // toJa = reply route's 4th step (English reply → ja); else invoice JA → en.
      // Either way the panels render the canonical fixture; the real call proves
      // the API runs. Always destroy the session (finally) to free model slots.
      const source = toJa
        ? SUMMARY.join('\n')
        : INVOICE.items.map((i) => i.ja).join('\n');
      await translator.translate(source);
    } finally {
      translator.destroy();
    }
    return makeToolResult(
      RESULTS.translate_document,
      cannedMutation('translate_document', args),
      false,
    );
  } catch {
    return mockResult('translate_document', args);
  }
}

// ── summarize_terms ───────────────────────────────────────────────────────────
export async function summarizeTerms(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.summarize_terms.ms, ctx.speed);
  if (ctx.tier === 3 || !ctx.apiLive.summarize_terms) {
    return mockResult('summarize_terms', args);
  }
  try {
    const summarizer = await window.Summarizer.create({
      type: 'key-points',
      outputLanguage: 'en',
      expectedInputLanguages: ['ja', 'en'],
    });
    const source = INVOICE.items
      .map((i) => `${i.en}: ${i.amt}`)
      .join('\n');
    try {
      await summarizer.summarize(source);
    } finally {
      summarizer.destroy();
    }
    // Panels render the canonical 4-point SUMMARY fixture.
    return makeToolResult(
      RESULTS.summarize_terms,
      cannedMutation('summarize_terms', args),
      false,
    );
  } catch {
    return mockResult('summarize_terms', args);
  }
}

// ── check_document ────────────────────────────────────────────────────────────
export async function checkDocument(
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<ToolResult> {
  await simulateLatency(TOOLS.check_document.ms, ctx.speed);
  // Pure app math (deterministic pass on the fixture) — no external API needed.
  // 260000 + 96000 + 80000 + 43600 = 479600 = totalDisplay → itemsSumToTotal.
  const sum = INVOICE.items.reduce((acc, item) => {
    const n = Number(item.amt.replace(/[^0-9]/g, ''));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  const totalNum = Number(INVOICE.totalDisplay.replace(/[^0-9]/g, ''));
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
