import React from 'react';

export const GenerativeUIHeader: React.FC = () => (
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
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          Generative UI
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          On-device recipes, generated and picked right in the chat — no server, no network.
        </p>
      </div>
    </div>
  </header>
);
