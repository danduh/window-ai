import React, { useState } from 'react';
import { RECIPE_TOOLS } from '../../services/recipeTools';
import type { ToolRegistrationStatus } from './ToolRegistrationPill';

interface ToolListPanelProps {
  status: ToolRegistrationStatus;
  registeredCount: number;
  /** Tool currently being invoked by the agent (or null). Drives the row highlight. */
  liveToolName: string | null;
}

/**
 * Collapsible panel listing all 8 RECIPE_TOOLS. Header reflects registration
 * state per UI-SPEC §3:
 *   - 'Tools (8)' on success
 *   - 'Tools (registering…)' on idle
 *   - 'Tools ({n} of 8)' on partial
 *   - 'Tools (0 — unavailable)' on unavailable
 *
 * Live-active row gets `bg-primary-50 dark:bg-primary-900/20` highlight while
 * the agent is mid-call.
 */
export const ToolListPanel: React.FC<ToolListPanelProps> = ({ status, registeredCount, liveToolName }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  let header = '';
  if (status === 'unavailable') {
    header = `Tools (0 — unavailable)`;
  } else if (status === 'idle') {
    header = `Tools (registering…)`;
  } else if (status === 'partial') {
    header = `Tools (${registeredCount} of ${RECIPE_TOOLS.length})`;
  } else {
    // success or error fall back to registered count; error → 0
    header = `Tools (${registeredCount})`;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="recipe-tool-list"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white">{header}</span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && status !== 'unavailable' && (
        <ul
          id="recipe-tool-list"
          tabIndex={0}
          className="px-4 py-3 max-h-40 lg:max-h-40 max-lg:max-h-32 overflow-y-auto space-y-1 border-t border-gray-200 dark:border-gray-600"
        >
          {RECIPE_TOOLS.map((tool) => {
            const isLive = liveToolName === tool.name;
            return (
              <li
                key={tool.name}
                className={`flex items-start gap-2 py-1 px-2 rounded ${isLive ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
              >
                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white shrink-0">{tool.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">— {tool.description}</span>
              </li>
            );
          })}
        </ul>
      )}
      {isOpen && status === 'unavailable' && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">WebMCP not enabled in this browser.</p>
        </div>
      )}
    </div>
  );
};
