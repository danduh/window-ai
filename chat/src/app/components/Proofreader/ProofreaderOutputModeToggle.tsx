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
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
      {MODES.map(({ value, label }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={[
              'px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200',
              isActive
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
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
