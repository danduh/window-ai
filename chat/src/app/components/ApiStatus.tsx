import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkSummaryAvailability } from '../services/SummaryService';
import {
  checkTranslationAvailability,
  checkLanguageDetectionAvailability,
} from '../services/TranslateService';
import {
  checkWriterAvailability,
  checkRewriterAvailability,
} from '../services/WriterService';
import { getAvailability as getProofreaderAvailability } from '../services/ProofreaderService';
import { getAvailability as getMultimodalAvailability } from '../services/MultimodalService';
import { isModelContextAvailable } from '../services/modelContext';

// The four states Chrome's availability() returns, plus our in-flight sentinel.
type Avail = 'available' | 'downloadable' | 'downloading' | 'unavailable';

/** Every check is wrapped so a missing global / thrown error → 'unavailable'. */
async function safe(fn: () => Promise<string>): Promise<Avail> {
  try {
    const a = (await fn()) as Avail;
    return a === 'available' || a === 'downloadable' || a === 'downloading'
      ? a
      : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

async function promptCheck(): Promise<Avail> {
  if (typeof LanguageModel === 'undefined') return 'unavailable';
  return safe(() => LanguageModel.availability({ outputLanguage: 'en' }));
}

// Embedding API is EPP-only (Chrome 152 Canary) and not in the shared window.ai
// typings yet, so read the bare global off globalThis rather than referencing it.
async function embeddingsCheck(): Promise<Avail> {
  const embedder = (
    globalThis as { SemanticEmbedder?: { availability(): Promise<string> } }
  ).SemanticEmbedder;
  if (!embedder) return 'unavailable';
  return safe(() => embedder.availability());
}

// ── Status badge (live, per browser) ────────────────────────────────────────
const BADGE: Record<
  Avail | 'checking',
  { label: string; cls: string; dot: string }
> = {
  checking: {
    label: 'Checking…',
    cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    dot: 'bg-gray-400 animate-pulse',
  },
  available: {
    label: 'Ready',
    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    dot: 'bg-green-500',
  },
  downloadable: {
    label: 'Ready · downloads on first use',
    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  downloading: {
    label: 'Downloading…',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    dot: 'bg-amber-500 animate-pulse',
  },
  unavailable: {
    label: 'Unavailable here',
    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
};

const StatusBadge: React.FC<{ check: () => Promise<Avail> }> = ({ check }) => {
  const [state, setState] = useState<Avail | 'checking'>('checking');
  useEffect(() => {
    let alive = true;
    check().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [check]);
  const b = BADGE[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${b.cls}`}
      title="Live availability in this browser"
    >
      <span className={`w-2 h-2 rounded-full ${b.dot}`} />
      {b.label}
    </span>
  );
};

type Stability = 'stable' | 'origin-trial' | 'flag';
const STABILITY: Record<Stability, { label: string; cls: string }> = {
  stable: {
    label: 'Stable',
    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  },
  'origin-trial': {
    label: 'Origin trial',
    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  },
  flag: {
    label: 'Behind a flag',
    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  },
};

interface ApiEntry {
  name: string;
  blurb: string;
  stability: Stability;
  since: string;
  enable: string;
  flags?: string[];
  verify: string;
  tryTo?: { href: string; label: string };
  check: () => Promise<Avail>;
}

// ── The catalog (verified against Chrome docs, July 2026 / Chrome 150) ───────
const CATALOG: ApiEntry[] = [
  {
    name: 'Prompt API — LanguageModel',
    blurb:
      'General on-device chat against Gemini Nano: streaming, conversation state, system prompts, structured output and tool calling.',
    stability: 'stable',
    since: 'Chrome 148 (web)',
    enable:
      'No flag on Chrome 148+ — the model downloads on first use. For localhost dev or older channels, enable the two flags below.',
    flags: [
      'chrome://flags/#prompt-api-for-gemini-nano',
      'chrome://flags/#optimization-guide-on-device-model',
    ],
    verify: "await LanguageModel.availability({ outputLanguage: 'en' })",
    tryTo: { href: '/chat', label: 'Chat' },
    check: () => promptCheck(),
  },
  {
    name: 'Prompt API — Tool calling',
    blurb:
      'Constrain the model to valid JSON (responseConstraint / responseFormat) or expose tools it can call — reliable classification, extraction and agents.',
    stability: 'stable',
    since: 'Chrome 148 (web)',
    enable: 'Part of the Prompt API — same availability, no extra flag.',
    verify: "await LanguageModel.availability({ outputLanguage: 'en' })",
    tryTo: { href: '/tool-calling', label: 'Tool calling' },
    check: () => promptCheck(),
  },
  {
    name: 'Prompt API — Multimodal (image)',
    blurb:
      'Add image (and audio) input to a prompt with one option — “what is in this picture?”, document scanning, live webcam analysis.',
    stability: 'stable',
    since: 'Chrome 148 (web)',
    enable: 'Part of the Prompt API — opt in with expectedInputs. No extra flag.',
    verify: "await LanguageModel.availability({ expectedInputs: [{ type: 'image' }] })",
    tryTo: { href: '/multimodal', label: 'Multimodal' },
    check: () => safe(() => getMultimodalAvailability()),
  },
  {
    name: 'Summarizer',
    blurb:
      'Key-points, TL;DR, headline and teaser summaries, steered per domain with sharedContext.',
    stability: 'stable',
    since: 'Chrome 138',
    enable: 'Stable — no flag needed. Language packs / model download on first use.',
    verify: 'await Summarizer.availability()',
    tryTo: { href: '/summary', label: 'Summarize' },
    check: () => safe(() => checkSummaryAvailability()),
  },
  {
    name: 'Translator',
    blurb:
      'On-device translation between language pairs; per-pair language packs download on first use.',
    stability: 'stable',
    since: 'Chrome 138',
    enable:
      'Stable — no flag. Manage downloaded packs at chrome://on-device-translation-internals.',
    verify:
      "await Translator.availability({ sourceLanguage: 'en', targetLanguage: 'es' })",
    tryTo: { href: '/translate', label: 'Translate' },
    check: () => safe(() => checkTranslationAvailability('en', 'es')),
  },
  {
    name: 'Language Detector',
    blurb:
      'Detects the language of a piece of text with confidence scores — pairs with the Translator.',
    stability: 'stable',
    since: 'Chrome 138',
    enable: 'Stable — no flag needed.',
    verify: 'await LanguageDetector.availability()',
    tryTo: { href: '/live-translate', label: 'Live translate' },
    check: () => safe(() => checkLanguageDetectionAvailability()),
  },
  {
    name: 'Writer',
    blurb: 'Generates new text from a short brief — release notes, replies, descriptions.',
    stability: 'flag',
    since: 'Origin trial (137→148, lapsed)',
    enable:
      'Not stable as of Chrome 150. Enable on localhost via the flag below (+ the on-device model flag).',
    flags: [
      'chrome://flags/#writer-api-for-gemini-nano',
      'chrome://flags/#optimization-guide-on-device-model',
    ],
    verify: 'await Writer.availability()',
    tryTo: { href: '/writer', label: 'Write & Rewrite' },
    check: () => safe(() => checkWriterAvailability()),
  },
  {
    name: 'Rewriter',
    blurb: 'Transforms existing text — change tone, length or formality.',
    stability: 'flag',
    since: 'Origin trial (137→148, lapsed)',
    enable: 'Not stable as of Chrome 150. Enable on localhost via the flag below.',
    flags: ['chrome://flags/#rewriter-api-for-gemini-nano'],
    verify: 'await Rewriter.availability()',
    tryTo: { href: '/writer', label: 'Write & Rewrite' },
    check: () => safe(() => checkRewriterAvailability()),
  },
  {
    name: 'Proofreader',
    blurb:
      'Grammar and spelling corrections returned as positioned suggestions — the basis for inline, Grammarly-style UIs.',
    stability: 'flag',
    since: 'Origin trial (141→145, lapsed)',
    enable: 'Not stable as of Chrome 150. Enable on localhost via the flag below.',
    flags: ['chrome://flags/#proofreader-api'],
    verify: "await Proofreader.availability({ expectedInputLanguages: ['en'] })",
    tryTo: { href: '/proofreader', label: 'Proofread' },
    check: () => safe(() => getProofreaderAvailability('en')),
  },
  {
    name: 'WebMCP — document.modelContext',
    blurb:
      'A page exposes its actions as callable tools for an AI agent. Also powers the Generative-UI demo. (navigator.modelContext is deprecated in Chrome 150.)',
    stability: 'origin-trial',
    since: 'Origin trial from Chrome 149',
    enable:
      'Enable on localhost via the flag below, or register an origin-trial token for a deployed origin. Still a moving W3C draft — do not ship to production.',
    flags: ['chrome://flags/#enable-webmcp-testing'],
    verify: "'modelContext' in document || 'modelContext' in navigator",
    tryTo: { href: '/webmcp', label: 'WebMCP' },
    check: async () => (isModelContextAvailable() ? 'available' : 'unavailable'),
  },
  {
    name: 'Embeddings — SemanticEmbedder',
    blurb:
      'Turns text into on-device semantic vectors (embeddinggemma-300m) — the basis for similarity search, “find similar”, clustering and on-device RAG, with no backend.',
    stability: 'flag',
    since: 'EPP · Chrome 152 Canary',
    enable:
      'Early Preview Program — Chrome Canary 152+ on desktop (Linux/macOS/Windows) only. Enable the flag below (+ the on-device model flag) and relaunch.',
    flags: [
      'chrome://flags/#semantic-embedder-api',
      'chrome://flags/#optimization-guide-on-device-model',
    ],
    verify: 'await SemanticEmbedder.availability()',
    tryTo: { href: '/embeddings', label: 'Embeddings' },
    check: () => embeddingsCheck(),
  },
];

const FlagPill: React.FC<{ flag: string }> = ({ flag }) => (
  <code className="block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-xs break-all">
    {flag}
  </code>
);

const ApiCard: React.FC<{ api: ApiEntry }> = ({ api }) => {
  const s = STABILITY[api.stability];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-5 flex flex-col transition-colors duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
          {api.name}
        </h3>
        <StatusBadge check={api.check} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
          {s.label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{api.since}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{api.blurb}</p>

      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
          How to enable
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{api.enable}</p>
        {api.flags && (
          <div className="space-y-1">
            {api.flags.map((f) => (
              <FlagPill key={f} flag={f} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Check availability
        </p>
        <code className="block bg-gray-900 text-gray-100 dark:bg-gray-950 px-3 py-2 rounded font-mono text-xs break-all">
          {api.verify}
        </code>
      </div>

      {api.tryTo && (
        <Link
          to={api.tryTo.href}
          className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          Try it: {api.tryTo.label}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      )}
    </div>
  );
};

/** Grid of live API-status cards. */
export const ApiStatusGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    {CATALOG.map((api) => (
      <ApiCard key={api.name} api={api} />
    ))}
  </div>
);
