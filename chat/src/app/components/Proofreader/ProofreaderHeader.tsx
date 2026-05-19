import React from 'react';

export const ProofreaderHeader: React.FC = () => (
  <header className="mb-8">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          Proofreader
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          On-device grammar + spelling correction with Gemini Nano — five languages, three output styles, zero network.
        </p>
      </div>
    </div>
  </header>
);
