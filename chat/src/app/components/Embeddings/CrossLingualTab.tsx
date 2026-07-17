import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  embedMany,
  embedOne,
  cosineSimilarity,
  getAvailability,
} from '../../services/EmbeddingsService';
import {
  checkLanguageDetectionAvailability,
  detectPrimaryLanguage,
} from '../../services/TranslateService';
import { chunkMarkdown } from './chunkMarkdown';
import { SAMPLE_DOCS, DOC_LANG_LABEL, type DocLang, type SampleDoc } from './sampleDocs';

type Avail = 'checking' | 'available' | 'needs-download' | 'unavailable';

interface Result {
  index: number;
  text: string;
  score: number;
}

const DEFAULT_DOC_ID = 'es-payments';
const DEFAULT_QUERY = 'How do I get a refund?';
const DEBOUNCE_MS = 250;
const MAX_PASSAGES = 24;
const TOP_RESULTS = 5;
const TOP_HIGHLIGHT = 3;

const LANG_FLAG: Record<DocLang, string> = {
  ja: '🇯🇵',
  de: '🇩🇪',
  es: '🇪🇸',
  en: '🇬🇧',
};

const isKnownLang = (code: string): code is DocLang =>
  code === 'ja' || code === 'de' || code === 'es' || code === 'en';

const initialDoc = SAMPLE_DOCS.find((d) => d.id === DEFAULT_DOC_ID) ?? SAMPLE_DOCS[0];

/**
 * Cross-Lingual Document Search.
 *
 * Pick a help-center document written in one language (Spanish / German / Japanese
 * / English) or upload your own .md, then search it with an ENGLISH query. The
 * document's passages are embedded once with taskType 'retrieval-document' (full
 * 768 dims, no truncation); the query is embedded with 'retrieval-query'. Ranking
 * is pure cosine similarity in one shared multilingual vector space — an English
 * question surfaces the right foreign-language passage with NO translation step.
 *
 * The on-device model (~200 MB) downloads on first use. embedMany polls
 * availability() until 'available' before create() and reports the wait via
 * onWaiting, so we just show a "Preparing the on-device model…" state while it
 * fires. When availability() is already 'available' on mount we index the default
 * doc automatically; when it is 'downloadable'/'downloading' we wait for a user
 * gesture (the "Build search index" button) since a downloading create() must run
 * inside a gesture. Selecting a new doc / uploading is itself a gesture, so those
 * re-embed immediately.
 */
const CrossLingualTab: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<SampleDoc>(initialDoc);
  const [avail, setAvail] = useState<Avail>('checking');
  const [indexing, setIndexing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [corpusReady, setCorpusReady] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [detectedLang, setDetectedLang] = useState<DocLang | null>(null);

  // Vectors keyed to the doc they belong to, so stale results can be rejected.
  const vectorsRef = useRef<{ docId: string; vectors: Float32Array[] } | null>(null);
  // Bumped on every doc change; the completion of an async index/detect is only
  // honoured when its captured id still matches.
  const docReqRef = useRef(0);
  const mountedRef = useRef(true);
  // Set true by user gestures (pill click / upload) so a doc change embeds even
  // when the model still needs downloading.
  const gestureRef = useRef(false);
  // Latest activeDoc for async callbacks that must compare against "current".
  const activeDocRef = useRef(activeDoc);
  const passageElsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    activeDocRef.current = activeDoc;
  }, [activeDoc]);

  // Passages are derived purely from the doc markdown — shown immediately, no
  // embeddings required. Compute the full list, then cap for display/indexing.
  const allPassages = useMemo(() => chunkMarkdown(activeDoc.markdown), [activeDoc]);
  const passages = useMemo(() => allPassages.slice(0, MAX_PASSAGES), [allPassages]);
  const capped = allPassages.length > passages.length;

  // Mount / unmount lifecycle flag (kept separate from per-doc staleness).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Embed the current doc's passages (retrieval-document, full 768 dims). Called
  // automatically when the model is present and from a gesture on first download.
  const indexDoc = useCallback(async (doc: SampleDoc, docPassages: string[]) => {
    const reqId = docReqRef.current;
    setIndexing(true);
    setPreparing(false);
    setIndexError(null);
    try {
      const vectors = await embedMany(docPassages, {
        taskType: 'retrieval-document',
        onWaiting: () => {
          if (mountedRef.current && docReqRef.current === reqId) setPreparing(true);
        },
      });
      if (!mountedRef.current || docReqRef.current !== reqId) return;
      vectorsRef.current = { docId: doc.id, vectors };
      setCorpusReady(true);
      setAvail('available');
    } catch (err) {
      if (!mountedRef.current || docReqRef.current !== reqId) return;
      setIndexError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current && docReqRef.current === reqId) {
        setIndexing(false);
        setPreparing(false);
      }
    }
  }, []);

  // On mount and whenever the selected doc changes: reset per-doc state, then
  // check availability and (auto or on-gesture) build the index.
  useEffect(() => {
    docReqRef.current += 1;
    const gesture = gestureRef.current;
    gestureRef.current = false;

    vectorsRef.current = null;
    setCorpusReady(false);
    setResults(null);
    setSearchError(null);
    setSearching(false);
    setFocusedIndex(null);
    setDetectedLang(null);
    setIndexError(null);
    setIndexing(false);
    setPreparing(false);

    let cancelled = false;
    (async () => {
      const a = await getAvailability();
      if (cancelled || !mountedRef.current) return;
      if (a === 'unavailable') {
        setAvail('unavailable');
        return;
      }
      if (a === 'available') {
        setAvail('available');
        void indexDoc(activeDoc, passages);
        return;
      }
      // 'downloadable' | 'downloading' — first download needs a user gesture.
      setAvail('needs-download');
      if (gesture) void indexDoc(activeDoc, passages);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDoc, passages, indexDoc]);

  const scrollToPassage = useCallback((index: number) => {
    passageElsRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Debounced query embedding + re-ranking (only once the doc is indexed).
  useEffect(() => {
    if (!corpusReady) return;
    const stored = vectorsRef.current;
    if (!stored || stored.docId !== activeDoc.id) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setFocusedIndex(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const queryVec = await embedOne(trimmed, { taskType: 'retrieval-query' });
        if (!alive) return;
        const scored: Result[] = passages
          .map((text, index) => ({
            index,
            text,
            score: cosineSimilarity(queryVec, stored.vectors[index]),
          }))
          .sort((a, b) => b.score - a.score);
        const top = scored.slice(0, TOP_RESULTS);
        setResults(top);
        setSearchError(null);
        setFocusedIndex(null);
        if (top.length > 0) scrollToPassage(top[0].index);
      } catch (err) {
        if (!alive) return;
        setSearchError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, corpusReady, activeDoc, passages, scrollToPassage]);

  // index → { rank, score } for the top-N highlighted passages in the left pane.
  const highlightInfo = useMemo(() => {
    const map = new Map<number, { rank: number; score: number }>();
    (results ?? []).slice(0, TOP_HIGHLIGHT).forEach((r, i) => {
      map.set(r.index, { rank: i + 1, score: r.score });
    });
    return map;
  }, [results]);

  const onSelectDoc = (doc: SampleDoc) => {
    if (doc.id === activeDoc.id) return;
    gestureRef.current = true;
    setActiveDoc(doc);
  };

  // Non-blocking language detection for uploads — gracefully skipped if the
  // LanguageDetector API is unavailable. Never blocks the search demo.
  const detectUploadedLang = useCallback(async (text: string, docId: string) => {
    try {
      const detectorAvail = await checkLanguageDetectionAvailability();
      if (detectorAvail === 'unavailable') return;
      const code = await detectPrimaryLanguage(text.slice(0, 1000));
      if (!mountedRef.current) return;
      if (activeDocRef.current.id !== docId) return; // user switched away
      if (isKnownLang(code)) setDetectedLang(code);
    } catch {
      // Detection is best-effort; ignore failures.
    }
  }, []);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const doc: SampleDoc = {
        id: `uploaded:${file.name}:${Date.now()}`,
        title: file.name,
        lang: 'en',
        flag: '📄',
        label: 'Upload',
        markdown: text,
      };
      gestureRef.current = true;
      setActiveDoc(doc);
      void detectUploadedLang(text, doc.id);
    };
    reader.readAsText(file);
  };

  const isUploaded = activeDoc.id.startsWith('uploaded:');
  const effLang: DocLang = detectedLang ?? activeDoc.lang;
  const docLangLabel = isUploaded && !detectedLang ? 'Uploaded document' : DOC_LANG_LABEL[effLang];
  const docFlag = isUploaded && !detectedLang ? '📄' : LANG_FLAG[effLang];

  // ── Tab-level guard ─────────────────────────────────────────────────────────
  if (avail === 'unavailable') {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">Cross-Lingual Document Search</p>
        <p className="mt-2 text-sm">
          The Semantic Embedder API isn&apos;t available in this browser. Enable the flags shown
          above and relaunch Chrome Canary.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header + explainer */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Cross-Lingual Document Search
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Search a document written in one language using a query in another. Embeddings map meaning
          into a shared space, so an English question finds the right Spanish, German or Japanese
          passage — with no translation.
        </p>
      </div>

      {/* Source bar: sample-doc pills + upload */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {SAMPLE_DOCS.map((doc) => {
          const selected = !isUploaded && doc.id === activeDoc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDoc(doc)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (selected
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-indigo-400')
              }
            >
              <span aria-hidden="true">{doc.flag}</span>
              {doc.label}
            </button>
          );
        })}

        <label
          className={
            'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium transition-colors ' +
            (isUploaded
              ? 'border-indigo-500 bg-indigo-600 text-white'
              : 'border-gray-400 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300')
          }
        >
          <span aria-hidden="true">📄</span>
          {isUploaded ? activeDoc.title : 'Upload .md'}
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Direction banner */}
      <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200">
        <span className="font-semibold">Query language: English</span> →{' '}
        <span className="font-semibold">
          Document language: {docLangLabel} {docFlag}
        </span>{' '}
        — matched by meaning, not keywords.
      </div>

      {/* First-run download gate — a downloading create() must run from a gesture. */}
      {!corpusReady && avail === 'needs-download' && !indexing && !indexError && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-900/40">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The on-device model (<code className="font-mono">embeddinggemma-300m</code>, ~200&nbsp;MB)
            downloads once. Nothing leaves your device.
          </p>
          <button
            type="button"
            onClick={() => void indexDoc(activeDoc, passages)}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Build search index
          </button>
        </div>
      )}

      {indexing && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
          {preparing
            ? 'Preparing the on-device model (first-run download can take a minute)…'
            : `Embedding ${passages.length} passage${passages.length === 1 ? '' : 's'}…`}
        </div>
      )}

      {indexError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <p>Failed to build the index: {indexError}</p>
          <button
            type="button"
            onClick={() => void indexDoc(activeDoc, passages)}
            className="mt-2 rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
          >
            Try again
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT — source document */}
        <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white">
              {activeDoc.title}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <span aria-hidden="true">{docFlag}</span>
              {docLangLabel}
            </span>
          </div>

          {capped && (
            <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Showing first {passages.length} of {allPassages.length} passages.
            </p>
          )}

          <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
            {passages.map((text, i) => {
              const info = highlightInfo.get(i);
              const isHighlighted = info != null;
              const isFocused = focusedIndex === i;
              return (
                <div
                  key={`${activeDoc.id}-${i}`}
                  ref={(el) => {
                    passageElsRef.current[i] = el;
                  }}
                  className={
                    'rounded-md border px-3 py-2 text-sm transition-colors ' +
                    (isHighlighted
                      ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400 dark:border-indigo-500 dark:bg-indigo-900/30 dark:ring-indigo-500'
                      : isFocused
                        ? 'border-indigo-300 bg-white ring-1 ring-indigo-300 dark:border-indigo-600 dark:bg-gray-800 dark:ring-indigo-600'
                        : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300')
                  }
                >
                  {info && (
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white">
                        {info.rank}
                      </span>
                      <span className="font-mono tabular-nums">{info.score.toFixed(2)}</span>
                    </div>
                  )}
                  <p className={isHighlighted ? 'text-gray-900 dark:text-white' : ''}>{text}</p>
                </div>
              );
            })}
            {passages.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                This document has no searchable passages.
              </p>
            )}
          </div>
        </section>

        {/* RIGHT — search */}
        <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Search</h3>
          </div>
          <div className="p-4">
            <label htmlFor="cross-lingual-query" className="sr-only">
              Search query
            </label>
            <input
              id="cross-lingual-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask in English…"
              disabled={!corpusReady}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />

            {searchError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                Search failed: {searchError}
              </div>
            )}

            <div className="mb-2 mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Top matches</span>
              {searching && <span className="animate-pulse">searching…</span>}
            </div>

            <ul className="space-y-2">
              {(results ?? []).map((row, idx) => {
                const preview = row.text.length > 140 ? `${row.text.slice(0, 140)}…` : row.text;
                const isTop = idx === 0;
                return (
                  <li key={`${activeDoc.id}-r${row.index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedIndex(row.index);
                        scrollToPassage(row.index);
                      }}
                      className={
                        'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ' +
                        (isTop
                          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30'
                          : 'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500')
                      }
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 text-sm text-gray-800 dark:text-gray-200">
                          {preview}
                        </span>
                      </span>
                      <span
                        className={
                          'shrink-0 font-mono text-sm tabular-nums ' +
                          (isTop
                            ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-600 dark:text-gray-400')
                        }
                      >
                        {row.score.toFixed(2)}
                      </span>
                    </button>
                  </li>
                );
              })}

              {corpusReady && results === null && (
                <li className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  Type a query above to rank the document&apos;s passages.
                </li>
              )}
              {!corpusReady && !indexing && (
                <li className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  Build the search index to start searching.
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CrossLingualTab;
