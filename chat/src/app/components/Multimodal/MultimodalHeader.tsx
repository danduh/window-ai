import React from 'react';

export const MultimodalHeader: React.FC = () => (
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
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          Multimodal
        </h1>
        <p className="mt-2 text-base font-medium text-gray-600 dark:text-gray-400">
          On-device image understanding with Gemini Nano — drag, paste, or capture an image and ask about it. Chrome 148+ stable, zero network.
        </p>
      </div>
    </div>
  </header>
);
