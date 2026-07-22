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
// Colors are taken verbatim from the Home Redesign mock and are intentionally
// theme-independent (they read well on both the dark and light surfaces).
const STATUS: Record<
  Avail | 'checking',
  { label: string; dot: string; bg: string; fg: string; pulse?: boolean }
> = {
  checking: {
    label: 'Checking…',
    dot: '#94a3b8',
    bg: 'rgba(148,163,184,.15)',
    fg: '#cbd5e1',
    pulse: true,
  },
  available: {
    label: 'Ready',
    dot: '#22c55e',
    bg: 'rgba(34,197,94,.15)',
    fg: '#4ade80',
  },
  downloadable: {
    label: 'Downloads on first use',
    dot: '#3b82f6',
    bg: 'rgba(59,130,246,.15)',
    fg: '#60a5fa',
  },
  downloading: {
    label: 'Downloading',
    dot: '#f59e0b',
    bg: 'rgba(245,158,11,.15)',
    fg: '#fbbf24',
    pulse: true,
  },
  unavailable: {
    label: 'Unavailable here',
    dot: '#94a3b8',
    bg: 'rgba(148,163,184,.15)',
    fg: '#cbd5e1',
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
  const s = STATUS[state];
  return (
    <span
      className="font-mono-code"
      title="Live availability in this browser"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.4em',
        whiteSpace: 'nowrap',
        borderRadius: '99px',
        padding: '.25em .6em',
        fontSize: '.68em',
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
      }}
    >
      <span
        style={{
          width: '.5em',
          height: '.5em',
          borderRadius: '99px',
          background: s.dot,
          animation: s.pulse ? 'pulseDot 1.4s infinite' : undefined,
        }}
      />
      {s.label}
    </span>
  );
};

type Stability = 'stable' | 'origin-trial' | 'flag';
const STABILITY: Record<
  Stability,
  { label: string; bg: string; fg: string; border: string }
> = {
  stable: {
    label: 'Stable',
    bg: 'rgba(34,197,94,.12)',
    fg: '#4ade80',
    border: 'rgba(34,197,94,.3)',
  },
  'origin-trial': {
    label: 'Origin trial',
    bg: 'rgba(59,130,246,.12)',
    fg: '#60a5fa',
    border: 'rgba(59,130,246,.3)',
  },
  flag: {
    label: 'Behind a flag',
    bg: 'rgba(245,158,11,.12)',
    fg: '#fbbf24',
    border: 'rgba(245,158,11,.3)',
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

// ── Reusable presentational bits ─────────────────────────────────────────────
const MONO_LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '.66em',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: 'var(--fg3, #64748b)',
  marginBottom: '.35em',
};

const FlagPill: React.FC<{ flag: string }> = ({ flag }) => (
  <code
    style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: '.72em',
      wordBreak: 'break-all',
      padding: '.35em .5em',
      borderRadius: '.4em',
      background: 'var(--surface2, rgba(148,163,184,.08))',
      color: 'var(--fg2, #cbd5e1)',
    }}
  >
    {flag}
  </code>
);

const ApiCard: React.FC<{ api: ApiEntry }> = ({ api }) => {
  const [hover, setHover] = useState(false);
  const s = STABILITY[api.stability];
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '.9em',
        border: `1px solid ${hover ? 'rgba(59,130,246,.5)' : 'var(--border, #1e293b)'}`,
        background: 'var(--surface, #131c2b)',
        padding: '1.15em',
        transition: 'border-color .15s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '.6em',
          marginBottom: '.7em',
        }}
      >
        <h3
          className="font-display"
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: '1.08em',
            lineHeight: 1.2,
            color: 'var(--fg, #f8fafc)',
          }}
        >
          {api.name}
        </h3>
        <StatusBadge check={api.check} />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '.5em',
          marginBottom: '.8em',
        }}
      >
        <span
          style={{
            fontSize: '.68em',
            fontWeight: 600,
            padding: '.2em .55em',
            borderRadius: '99px',
            border: `1px solid ${s.border}`,
            background: s.bg,
            color: s.fg,
          }}
        >
          {s.label}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '.72em',
            color: 'var(--fg3, #64748b)',
          }}
        >
          {api.since}
        </span>
      </div>

      <p
        style={{
          margin: '0 0 1em',
          fontSize: '.84em',
          lineHeight: 1.5,
          color: 'var(--fg2, #cbd5e1)',
        }}
      >
        {api.blurb}
      </p>

      <div style={{ marginBottom: '.8em' }}>
        <div style={MONO_LABEL}>How to enable</div>
        <p
          style={{
            margin: '0 0 .5em',
            fontSize: '.8em',
            lineHeight: 1.45,
            color: 'var(--fg3, #94a3b8)',
          }}
        >
          {api.enable}
        </p>
        {api.flags && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3em' }}>
            {api.flags.map((f) => (
              <FlagPill key={f} flag={f} />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1em' }}>
        <div style={MONO_LABEL}>Check availability</div>
        <code
          style={{
            display: 'block',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '.72em',
            wordBreak: 'break-all',
            padding: '.55em .6em',
            borderRadius: '.45em',
            background: 'var(--codebg, #060a12)',
            color: 'var(--codefg, #e2e8f0)',
          }}
        >
          {api.verify}
        </code>
      </div>

      {api.tryTo && (
        <Link
          to={api.tryTo.href}
          style={{
            marginTop: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4em',
            fontSize: '.85em',
            fontWeight: 600,
            color: hover ? '#93c5fd' : '#60a5fa',
          }}
        >
          Try it: {api.tryTo.label}
          <svg
            width=".9em"
            height=".9em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
};

/** Grid of live API-status cards. */
export const ApiStatusGrid: React.FC = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
      gap: '1em',
    }}
  >
    {CATALOG.map((api) => (
      <ApiCard key={api.name} api={api} />
    ))}
  </div>
);
