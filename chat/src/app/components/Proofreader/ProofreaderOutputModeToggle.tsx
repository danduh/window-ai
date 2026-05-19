import React from 'react';

export type OutputMode = 'plain' | 'side-by-side' | 'inline-strikethrough';

interface ProofreaderOutputModeToggleProps {
  mode: OutputMode;
  onChange: (m: OutputMode) => void;
}

const MODES: Array<{ value: OutputMode; label: string }> = [
  { value: 'plain', label: 'Plain + list' },
  { value: 'side-by-side', label: 'Side-by-side' },
  { value: 'inline-strikethrough', label: 'Inline strikethrough' },
];

export const ProofreaderOutputModeToggle: React.FC<ProofreaderOutputModeToggleProps> = ({
  mode,
  onChange,
}) => {
  // Phase 8: coerce any unsupported mode to 'plain' defensively
  const activeMode: OutputMode = mode === 'plain' ? 'plain' : 'plain';

  return (
    <div role="tablist" className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
      {MODES.map(({ value, label }) => {
        const isEnabled = value === 'plain';
        const isActive = activeMode === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            disabled={!isEnabled}
            title={!isEnabled ? 'Coming in Phase 9' : undefined}
            onClick={() => isEnabled && onChange(value)}
            className={[
              'px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200',
              isActive
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
              !isEnabled ? 'opacity-50 cursor-not-allowed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
