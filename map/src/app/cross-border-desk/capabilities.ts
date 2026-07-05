// Tier detection + per-API probe map (A§5.1, A§5.3).
//
// Runs once at mount. Mirrors ChatAIService.getModelCapabilities robustness:
// try/catch every availability() call so a drifted Canary runtime never crashes
// the mount. NEVER call LanguageModel.params() (Canary dropped it; reuse-map §1a).

import type { Tier } from './types';

// The copied ambient d.ts (map/src/app/types/dom-chromium-ai.d.ts) declares
// these globals via a script-mode `declare global` block that the map webpack
// tsconfig does not surface into module scope (chat's tsconfig lists the file
// explicitly; map's globs it but the augmentation does not reach here). We
// re-declare only the minimal surface we call — the same module-scoped
// `declare global` pattern chat's own services (WriterService, SummaryService,
// TranslateService, ProofreaderService) use. Identical declarations merge.
type BuiltinAvailability =
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available';

// Minimal instance shapes we call.
interface DeskLanguageModelSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface DeskTranslator {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface DeskLanguageDetectorSession {
  detect(
    input: string,
    options?: { signal?: AbortSignal },
  ): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  destroy(): void;
}
interface DeskSummarizer {
  summarize(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface DeskWriter {
  write(
    input: string,
    options?: { context?: string; signal?: AbortSignal },
  ): Promise<string>;
  destroy(): void;
}
interface DeskRewriter {
  rewrite(
    input: string,
    options?: { context?: string; signal?: AbortSignal },
  ): Promise<string>;
  destroy(): void;
}
interface DeskProofreader {
  proofread(
    input: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ correctedInput: string }>;
  destroy(): void;
}

declare global {
  var LanguageModel: {
    availability(
      options?: Record<string, unknown>,
    ): Promise<BuiltinAvailability>;
    create(
      options?: Record<string, unknown>,
    ): Promise<DeskLanguageModelSession>;
  };
  interface Window {
    LanguageDetector: {
      availability(options?: {
        expectedInputLanguages?: string[];
      }): Promise<BuiltinAvailability>;
      create(options?: {
        expectedInputLanguages?: string[];
      }): Promise<DeskLanguageDetectorSession>;
    };
    Translator: {
      availability(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<BuiltinAvailability>;
      create(options: {
        sourceLanguage: string;
        targetLanguage: string;
      }): Promise<DeskTranslator>;
    };
    Summarizer: {
      availability(
        options?: Record<string, unknown>,
      ): Promise<BuiltinAvailability>;
      create(options?: Record<string, unknown>): Promise<DeskSummarizer>;
    };
    Writer: {
      availability(
        options?: Record<string, unknown>,
      ): Promise<BuiltinAvailability>;
      create(options?: Record<string, unknown>): Promise<DeskWriter>;
    };
    Rewriter: {
      availability(
        options?: Record<string, unknown>,
      ): Promise<BuiltinAvailability>;
      create(options?: Record<string, unknown>): Promise<DeskRewriter>;
    };
    Proofreader: {
      availability(options?: {
        expectedInputLanguages?: string[];
      }): Promise<BuiltinAvailability>;
      create(options?: Record<string, unknown>): Promise<DeskProofreader>;
    };
  }
}

type AvailabilityFn = () => Promise<string>;

/**
 * True when an availability() result means the API is usable (present or
 * downloadable). Any throw → false.
 */
export async function safeAvailable(fn: AvailabilityFn): Promise<boolean> {
  try {
    const a = await fn();
    return a === 'available' || a === 'downloadable' || a === 'downloading';
  } catch {
    return false;
  }
}

/**
 * Global tier detection:
 *  - LanguageModel undefined or Nano not usable → Tier 3 (mock brain).
 *  - Nano usable → Tier 1 (real on-device APIs).
 *
 * No microphone probe runs here: voice input is not built this milestone, so we
 * must NOT trigger a getUserMedia permission prompt on page load. A "no-mic"
 * Tier 2 would be functionally identical to Tier 1 for routing and tools anyway.
 */
export async function selectTier(): Promise<Tier> {
  if (typeof LanguageModel === 'undefined') return 3;
  const nanoOk = await safeAvailable(() =>
    LanguageModel.availability({ outputLanguage: 'en' }),
  );
  return nanoOk ? 1 : 3;
}

/**
 * Probes each backing built-in AI API independently (try/catch each) so tools
 * can decide their per-API fallback (A§5.3). Keys are ToolMeta-relevant API
 * surfaces; useDesk builds a per-tool `apiLive` map from these.
 */
export async function perApiTier(): Promise<Record<string, boolean>> {
  const multimodalOk = await safeAvailable(() =>
    typeof LanguageModel !== 'undefined'
      ? LanguageModel.availability({
          expectedInputs: [{ type: 'image' }],
          outputLanguage: 'en',
        })
      : Promise.resolve('unavailable'),
  );
  const detectorOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.LanguageDetector
      ? window.LanguageDetector.availability({ expectedInputLanguages: ['ja'] })
      : Promise.resolve('unavailable'),
  );
  const translatorOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.Translator
      ? window.Translator.availability({
          sourceLanguage: 'ja',
          targetLanguage: 'en',
        })
      : Promise.resolve('unavailable'),
  );
  const summarizerOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.Summarizer
      ? window.Summarizer.availability({ outputLanguage: 'en' })
      : Promise.resolve('unavailable'),
  );
  const writerOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.Writer
      ? window.Writer.availability({ outputLanguage: 'en' })
      : Promise.resolve('unavailable'),
  );
  const rewriterOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.Rewriter
      ? window.Rewriter.availability({ outputLanguage: 'en' })
      : Promise.resolve('unavailable'),
  );
  const proofreaderOk = await safeAvailable(() =>
    typeof window !== 'undefined' && window.Proofreader
      ? window.Proofreader.availability({ expectedInputLanguages: ['en'] })
      : Promise.resolve('unavailable'),
  );

  return {
    // Per-tool liveness keyed by ToolName (tools read apiLive[name]).
    extract_invoice: multimodalOk,
    detect_language: detectorOk,
    translate_document: translatorOk,
    summarize_terms: summarizerOk,
    // check_document is pure app math (deterministic) — always live, like the
    // other app-logic tools; its execute() never depends on a backing API.
    check_document: true,
    draft_reply: writerOk,
    restyle_reply: rewriterOk,
    polish_reply: proofreaderOk,
    // App-logic tools have no backing API — always "live".
    queue_payout: true,
    settle_payout: true,
  };
}
