import React, { useMemo } from 'react';
import { type OutputMode } from './ProofreaderOutputModeToggle';
import { buildDiffSegments, type DiffSegment } from './diffSegments';

interface ProofreaderResultPanelProps {
  result: ProofreadResult | null;
  mode: OutputMode;
  originalText: string;
  error: string | null;
  onRetry: () => void;
}

export const ProofreaderResultPanel: React.FC<ProofreaderResultPanelProps> = ({
  result,
  mode,
  originalText,
  error,
  onRetry,
}) => {
  const segments = useMemo(
    () =>
      result !== null ? buildDiffSegments(originalText, result.corrections) : [],
    [originalText, result],
  );

  if (error !== null) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-6">
        <p className="text-red-800 dark:text-red-200 font-medium">Proofreading failed</p>
        <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
        Results will appear here.
      </div>
    );
  }

  if (mode === 'side-by-side') {
    return (
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Original
            </h4>
            <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
              {segments.map((seg: DiffSegment, i: number) => {
                if (seg.type === 'unchanged') {
                  return <span key={i}>{seg.text}</span>;
                }
                if (seg.type === 'removed') {
                  return (
                    <mark
                      key={i}
                      className="bg-red-100 dark:bg-red-900/30 rounded px-0.5"
                    >
                      {seg.text}
                    </mark>
                  );
                }
                // inserted segments are skipped in the left (original) column
                return null;
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Corrected
            </h4>
            <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
              {segments.map((seg: DiffSegment, i: number) => {
                if (seg.type === 'unchanged') {
                  return <span key={i}>{seg.text}</span>;
                }
                if (seg.type === 'inserted') {
                  return (
                    <mark
                      key={i}
                      className="bg-green-100 dark:bg-green-900/30 rounded px-0.5"
                    >
                      {seg.text}
                    </mark>
                  );
                }
                // removed segments are skipped in the right (corrected) column
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'inline-strikethrough') {
    return (
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
          {segments.map((seg: DiffSegment, i: number) => {
            if (seg.type === 'unchanged') {
              return <span key={i}>{seg.text}</span>;
            }
            if (seg.type === 'removed') {
              if (seg.text === '') return null;
              return (
                <del
                  key={i}
                  className="text-red-600 dark:text-red-400 line-through opacity-70"
                >
                  {seg.text}
                </del>
              );
            }
            // inserted
            if (seg.text === '') return null;
            return (
              <ins
                key={i}
                className="text-green-700 dark:text-green-400 font-semibold no-underline"
                style={{ textDecoration: 'none' }}
              >
                {seg.text}
              </ins>
            );
          })}
        </div>
      </div>
    );
  }

  // 'plain' branch — unchanged from Phase 8
  return (
    <div className="mt-6 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Corrected text</h3>
        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{result.correctedInput}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Suggestions</h3>
        {result.corrections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No corrections found.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 dark:text-gray-200">
            {result.corrections.map((c: ProofreaderCorrection, i: number) => {
              const original = originalText.slice(c.startIndex, c.endIndex);
              const detail = c.explanation
                ? `because ${c.explanation}`
                : c.types && c.types.length > 0
                  ? `[${c.types.join(', ')}]`
                  : '';
              return (
                <li key={i}>
                  changed &ldquo;{original}&rdquo; &rarr; &ldquo;{c.correction}&rdquo;{detail ? ` ${detail}` : ''}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
