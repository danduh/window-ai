import React from 'react';
import { type OutputMode } from './ProofreaderOutputModeToggle';

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

  if (mode !== 'plain') {
    return (
      <div className="mt-6 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
        Mode coming in Phase 9 — switch to 'Plain + list' to view this result.
      </div>
    );
  }

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
