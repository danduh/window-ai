import React from 'react';

/**
 * Inline yellow banner shown INSIDE the AgentDrawer when
 * LanguageModel.availability() returns anything other than 'available' but
 * navigator.modelContext IS present. (When modelContext is absent the
 * page-level MissingFlagBanner already covers it.)
 *
 * Variants:
 * - `default` — Chrome built-in AI is not available at all (older default).
 * - `tool-use` — Chrome 146 Canary gates tool-use behind a separate feature
 *   flag. When the gate is off, `LanguageModel.create({tools})` throws
 *   "Tool use feature is not enabled". The recipe tools remain registered
 *   with `navigator.modelContext` so the external Tool Inspector still
 *   works; the in-page agent does not.
 *
 * Mirrors MissingFlagBanner styling but:
 * - smaller padding (`p-3` vs `p-4`)
 * - chat-specific heading + body copy (UI-SPEC §5 / §Copywriting)
 * - no flag table (the page-level banner already shows the flag instructions)
 */
export interface LanguageModelUnavailableProps {
  variant?: 'default' | 'tool-use';
}

export const LanguageModelUnavailable: React.FC<LanguageModelUnavailableProps> = ({
  variant = 'default',
}) => {
  const isToolUse = variant === 'tool-use';
  const heading = isToolUse
    ? "Chrome built-in AI tool-use isn't enabled."
    : "Chrome built-in AI isn't available.";
  const body = isToolUse
    ? 'The recipe tools are still registered (try the Tool Inspector). To run the in-page agent, enable the tool-use feature flag in Chrome 146+ Canary (e.g. chrome://flags/#prompt-api-for-gemini-nano with the tool-use sub-option) and relaunch.'
    : 'The recipe tools are still registered (try the Tool Inspector). To run the in-page agent, enable Chrome built-in AI in Chrome 146+ Canary.';
  return (
    <div
      className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
      role="status"
    >
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">{heading}</p>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">{body}</p>
        </div>
      </div>
    </div>
  );
};
