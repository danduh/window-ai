import React, { useEffect, useRef, useState } from 'react';
import {
  checkTranslationAvailability,
  translate,
} from '../../services/TranslateService';
import AutoScrollFeed from './AutoScrollFeed';

const INTERIM_DEBOUNCE_MS = 300;

export interface TranslationPaneProps {
  /** Identifier used for the React key in the parent — surfaced for debugging only. */
  id: string;
  /** ISO short code for the source language (e.g. 'en'). */
  sourceLang: string;
  /** ISO short code for the target language (e.g. 'es'). Fixed at creation. */
  targetLang: string;
  /** Human-readable target language label, shown in the header. */
  targetLabel: string;
  /**
   * The complete source transcript — accumulating finalized sentences from the
   * page's speech recognizer. Pane translates ANY new entries appended since
   * the last render.
   */
  sourceLines: string[];
  /**
   * Current source interim text (what the user is mid-saying). When
   * `previewInterim` is true the pane debounce-translates this for live
   * preview. Cleared by the parent when a sentence finalizes.
   */
  liveInterim: string;
  /** If true, debounce-translate `liveInterim` into the in-progress slot. */
  previewInterim: boolean;
  /** Called when the user clicks the × button. Page removes this pane. */
  onRemove?: () => void;
}

/**
 * One target-language pane. Self-contained and append-only.
 *
 * Architectural invariants:
 *
 *  1. The pane NEVER overwrites or removes an already-rendered translation.
 *     New source lines are translated and APPENDED. The previous failure mode
 *     (single string slot per pane that got replaced on every new sentence)
 *     is structurally impossible here.
 *
 *  2. Translations are SERIALIZED per pane via a promise chain. The Chrome
 *     Translator API processes calls serially anyway; chaining preserves
 *     source order in the output list and avoids parallel-resolution races.
 *
 *  3. The in-progress slot is the ONLY place subject to overwrite. It holds
 *     the translation of the current (not-yet-finalized) sentence. When the
 *     source finalizes (sourceLines grows), the in-progress slot clears and
 *     a fresh translation of the new finalized line appends to the list.
 *
 *  4. Auto-scroll happens via AutoScrollFeed — keys on lines.length and
 *     inProgress.length so it scrolls on both new lines AND interim growth.
 *
 *  5. Clear behavior: when sourceLines length drops to 0 (parent cleared the
 *     transcript), the pane resets its own state. No prop-driven explicit
 *     clear signal is needed.
 */
const TranslationPane: React.FC<TranslationPaneProps> = ({
  id: _id,
  sourceLang,
  targetLang,
  targetLabel,
  sourceLines,
  liveInterim,
  previewInterim,
  onRemove,
}) => {
  const [translatedLines, setTranslatedLines] = useState<string[]>([]);
  const [currentTranslation, setCurrentTranslation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // How many source lines we've already translated. Index into sourceLines.
  const lastSourceLenRef = useRef<number>(0);
  // Serializes translations so they append in source order.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Cancels any in-flight interim translation when a newer one supersedes it.
  const interimAbortRef = useRef<AbortController | null>(null);
  // Debounce timer id for interim translations.
  const debounceTimerRef = useRef<number | null>(null);
  // Monotonic id for the in-progress translation — last-write-wins guard so
  // a slow stale translation can't overwrite a fresh one.
  const interimReqIdRef = useRef<number>(0);

  // ── Effect 1: translate newly-finalized source lines, append to list ──────
  // Also handles the "source was cleared" case (sourceLines length dropped).
  useEffect(() => {
    if (sourceLines.length < lastSourceLenRef.current) {
      // Parent cleared the transcript — reset this pane.
      lastSourceLenRef.current = 0;
      setTranslatedLines([]);
      setCurrentTranslation('');
      setError(null);
      queueRef.current = Promise.resolve();
      interimAbortRef.current?.abort();
      interimAbortRef.current = null;
      return;
    }
    if (sourceLines.length === lastSourceLenRef.current) {
      return;
    }

    const startIdx = lastSourceLenRef.current;
    const newLines = sourceLines.slice(startIdx);
    lastSourceLenRef.current = sourceLines.length;

    // A finalized source line means the current interim translation (if any)
    // is stale relative to what's about to be appended. Clear it AND cancel
    // any in-flight interim translate. We rely on the finalized append to
    // make the pane non-empty again.
    setCurrentTranslation('');
    interimAbortRef.current?.abort();
    interimAbortRef.current = null;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Chain each new line onto the serial queue. Each link awaits the
    // translation and appends to the list when it resolves. Order preserved.
    queueRef.current = queueRef.current.then(async () => {
      for (const line of newLines) {
        if (!line.trim()) continue;
        try {
          if (sourceLang === targetLang) {
            // Passthrough — no API call needed.
            setTranslatedLines((prev) => [...prev, line]);
            continue;
          }
          const avail = await checkTranslationAvailability(sourceLang, targetLang);
          if (avail === 'unavailable') {
            setError(`${sourceLang}->${targetLang} unavailable on this Chrome build`);
            continue;
          }
          const out = await translate(line, sourceLang, targetLang);
          if (out && out.trim().length > 0) {
            setTranslatedLines((prev) => [...prev, out]);
            setError(null);
          }
        } catch (e) {
          const msg = (e as Error).message ?? '';
          if (msg.toLowerCase().includes('aborted')) continue;
          setError(msg || 'Translation failed');
        }
      }
    });
  }, [sourceLines, sourceLang, targetLang]);

  // ── Effect 2: debounce-translate the live interim into the in-progress slot ──
  // Only runs when previewInterim is true (rolling-interim mode).
  useEffect(() => {
    if (!previewInterim) return;
    if (liveInterim.trim().length === 0) return;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      // Capture the text snapshot AT THE TIME the debounce fires.
      const snapshot = liveInterim;
      if (!snapshot.trim()) return;

      const myId = ++interimReqIdRef.current;
      interimAbortRef.current?.abort();
      const ctrl = new AbortController();
      interimAbortRef.current = ctrl;

      try {
        if (sourceLang === targetLang) {
          if (myId === interimReqIdRef.current) setCurrentTranslation(snapshot);
          return;
        }
        const avail = await checkTranslationAvailability(sourceLang, targetLang);
        if (myId !== interimReqIdRef.current) return;
        if (avail === 'unavailable') return;
        const out = await translate(snapshot, sourceLang, targetLang, { signal: ctrl.signal });
        if (myId !== interimReqIdRef.current) return;
        // Sticky-write: only update when we have actual content. Translator can
        // briefly return "" for transient text; we never want to flash empty.
        if (out && out.trim().length > 0) {
          setCurrentTranslation(out);
        }
      } catch (e) {
        const msg = (e as Error).message ?? '';
        if (msg.toLowerCase().includes('aborted')) return;
        // Don't surface interim translation errors — they're noisy and
        // transient. The next debounce or the finalized translation
        // will recover.
      }
    }, INTERIM_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [liveInterim, previewInterim, sourceLang, targetLang]);

  // ── Effect 3: when previewInterim turns off, clear the in-progress slot ──
  useEffect(() => {
    if (!previewInterim) {
      setCurrentTranslation('');
      interimAbortRef.current?.abort();
      interimAbortRef.current = null;
    }
  }, [previewInterim]);

  // ── Effect 4: cleanup on unmount ──
  useEffect(() => {
    return () => {
      interimAbortRef.current?.abort();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Translation
          </span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {targetLabel}
          </h3>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={`Remove ${targetLabel} pane`}
            title={`Remove ${targetLabel}`}
          >
            ×
          </button>
        )}
      </div>
      <AutoScrollFeed
        lines={translatedLines}
        inProgress={previewInterim ? currentTranslation : ''}
        placeholder="Translation will appear here..."
        error={error}
      />
    </div>
  );
};

export default TranslationPane;
