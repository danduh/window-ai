import React from 'react';
import type { ToolCallEvent } from '../../services/toolAdapter';

interface ToolCallIndicatorProps {
  event: ToolCallEvent;
}

/** Format up to 2 args as `(key: value, key: value)`; otherwise render `(…)`. */
const formatArgs = (args: Record<string, unknown>): string => {
  const entries = Object.entries(args);
  if (entries.length === 0) return '()';
  if (entries.length > 2) return '(…)';
  return (
    '(' +
    entries
      .map(([k, v]) => {
        const rendered = typeof v === 'string' ? `"${v}"` : String(v);
        return `${k}: ${rendered}`;
      })
      .join(', ') +
    ')'
  );
};

/**
 * System-style chat-row showing a tool call's lifecycle. Renders one of three
 * variants driven by the discriminated event prop:
 *   - pending: ⚙ Calling {toolName}({args})…
 *   - done:    ✓ {toolName} done
 *   - error:   ✗ {toolName} failed: {message}
 *
 * UI-SPEC §4: full-width row (NOT max-w-[80%] like ChatBox bubbles), monospace
 * text, accessible via role=status + aria-live=polite + aria-atomic=true so
 * screen readers announce the call as a single update.
 */
export const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({ event }) => {
  let glyph = '';
  let glyphClasses = '';
  let bodyClasses = '';
  let body = '';

  if (event.kind === 'pending') {
    glyph = '⚙';
    glyphClasses = 'text-primary-600 dark:text-primary-400 animate-spin motion-reduce:animate-none text-sm';
    bodyClasses = 'text-sm font-mono text-gray-700 dark:text-gray-300';
    body = `Calling ${event.toolName}${formatArgs(event.args)}…`;
  } else if (event.kind === 'done') {
    glyph = '✓';
    glyphClasses = 'text-green-600 dark:text-green-400 text-sm';
    bodyClasses = 'text-sm font-mono text-gray-600 dark:text-gray-400';
    body = `${event.toolName} done`;
  } else {
    // error
    glyph = '✗';
    glyphClasses = 'text-red-600 dark:text-red-400 text-sm';
    bodyClasses = 'text-sm font-mono text-red-700 dark:text-red-300';
    body = `${event.toolName} failed: ${event.message}`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 my-2 animate-slide-up flex items-start gap-2"
    >
      <span aria-hidden="true" className={glyphClasses}>{glyph}</span>
      <span className={bodyClasses}>{body}</span>
    </div>
  );
};
