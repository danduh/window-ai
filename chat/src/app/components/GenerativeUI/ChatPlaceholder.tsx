import React from 'react';

export const ChatPlaceholder: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
    <svg
      className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
      Chat coming in a future phase
    </h2>
    <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
      Ask for a recipe here and an interactive card carousel will appear — powered by Chrome&apos;s built-in AI, all on-device.
    </p>
  </div>
);
