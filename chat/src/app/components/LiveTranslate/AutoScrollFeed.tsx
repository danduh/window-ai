import React from 'react';
import { useAutoScroll } from './useAutoScroll';

interface AutoScrollFeedProps {
  /** Accumulating finalized lines. Rendered top-to-bottom, latest highlighted. */
  lines: string[];
  /** Optional in-progress / interim text rendered italic below the lines. */
  inProgress?: string;
  /** Placeholder text when both `lines` and `inProgress` are empty. */
  placeholder?: string;
  /** Optional error message rendered below the feed. */
  error?: string | null;
  /** Max height before the feed scrolls internally. Tailwind class. */
  maxHeightClass?: string;
}

/**
 * Append-only feed with auto-scroll. Shared between the source pane and each
 * translation pane so they look + behave consistently:
 *
 *  - Finalized sentences as a list (latest highlighted with a subtle bg)
 *  - In-progress text rendered italic below the list (think live caption /
 *    interim transcript / streaming AI completion)
 *  - Auto-scrolls to the bottom whenever lines.length or inProgress changes
 *  - Shows a friendly placeholder when empty
 *
 * Behavioral contract:
 *  - We never mutate the props. The parent owns state and only ever appends to
 *    `lines`. This is the architectural invariant that the previous design
 *    violated by overwriting a single string slot.
 *  - Auto-scroll fires when EITHER lines grow OR in-progress text changes
 *    (live interim grows character-by-character in some modes).
 */
const AutoScrollFeed: React.FC<AutoScrollFeedProps> = ({
  lines,
  inProgress,
  placeholder = 'Waiting...',
  error,
  maxHeightClass = 'max-h-48',
}) => {
  // Re-scroll when either dimension changes. We key on a composite value so a
  // pure interim update (no new line) also triggers a scroll.
  const scrollKey = `${lines.length}:${inProgress?.length ?? 0}`;
  const scrollRef = useAutoScroll(scrollKey);

  const isEmpty = lines.length === 0 && !inProgress;

  return (
    <>
      <div
        ref={scrollRef}
        className={`${maxHeightClass} overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 min-h-[120px]`}
      >
        {isEmpty && (
          <p className="text-gray-500 dark:text-gray-400 italic">{placeholder}</p>
        )}
        {lines.length > 0 && (
          <ul className="space-y-1">
            {lines.map((line, idx) => (
              <li
                key={idx}
                className={
                  idx === lines.length - 1
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100 rounded px-2 py-1 whitespace-pre-wrap break-words'
                    : 'text-gray-800 dark:text-gray-200 px-2 py-1 whitespace-pre-wrap break-words'
                }
              >
                {line}
              </li>
            ))}
          </ul>
        )}
        {inProgress && (
          <p className="italic text-gray-500 dark:text-gray-400 mt-2 px-2 whitespace-pre-wrap break-words">
            {inProgress}
          </p>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </>
  );
};

export default AutoScrollFeed;
