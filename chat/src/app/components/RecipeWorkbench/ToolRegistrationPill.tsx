import React from 'react';

export type ToolRegistrationStatus =
  | 'idle'
  | 'success'
  | 'partial'
  | 'error'
  | 'unavailable';

interface ToolRegistrationPillProps {
  status: ToolRegistrationStatus;
  /** How many of the registered tools succeeded (0..totalCount). */
  registeredCount: number;
  /** Always 8 in v1; passed in for testability + future-proofing. */
  totalCount: number;
}

/**
 * Header status pill bound to navigator.modelContext.registerTool outcomes.
 * Renders one of five visual variants per UI-SPEC §1; hidden when `unavailable`
 * (the page-level MissingFlagBanner already carries that message).
 */
export const ToolRegistrationPill: React.FC<ToolRegistrationPillProps> = ({
  status,
  registeredCount,
  totalCount,
}) => {
  if (status === 'unavailable') return null;

  const stateClasses: Record<Exclude<ToolRegistrationStatus, 'unavailable'>, string> = {
    idle:    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    partial: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
    error:   'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
  };

  let glyph = '';
  let copy = '';
  if (status === 'idle') {
    glyph = '⏳';
    copy = 'Registering tools…';
  } else if (status === 'success') {
    glyph = '✓';
    copy = `✓ ${registeredCount} tools registered`;
  } else if (status === 'partial') {
    glyph = '⚠';
    copy = `⚠ ${registeredCount} of ${totalCount} tools registered`;
  } else {
    // error
    glyph = '⚠';
    copy = '⚠ 0 tools registered';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium animate-fade-in ${stateClasses[status]}`}
    >
      <span aria-hidden="true">{glyph}</span>
      <span>{copy}</span>
    </div>
  );
};
