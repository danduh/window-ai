import React from 'react';

export interface MissingFlagBannerProps {
  title?: string;
  body?: string;
  flags?: Array<{ name: string; url: string; note?: string }>;
  browserRequirement?: string;
}

export const MissingFlagBanner: React.FC<MissingFlagBannerProps> = ({
  title = "WebMCP isn't enabled in this browser.",
  body = 'The recipe browser still works. To register tools and run the agent demo, open this page in Chrome 146+ Canary with the WebMCP flag enabled.',
  flags = [{ name: 'WebMCP', url: 'chrome://flags/#WebMCP', note: 'set to "For testing"' }],
  browserRequirement = 'Chrome 146+ Canary',
}) => (
  <div
    className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
    role="status"
  >
    <div className="flex items-start">
      <svg
        className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="text-yellow-800 dark:text-yellow-200 font-medium">{title}</p>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">{body}</p>
        <div className="mt-3 space-y-1 text-sm">
          <div>
            <span className="text-yellow-700 dark:text-yellow-300">Browser:</span>{' '}
            <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">
              {browserRequirement}
            </code>
          </div>
          {flags.map((flag) => (
            <div key={flag.url}>
              <span className="text-yellow-700 dark:text-yellow-300">Flag:</span>{' '}
              <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">
                {flag.url}
              </code>
              {flag.note != null && <>{' '}({flag.note})</>}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default MissingFlagBanner;
