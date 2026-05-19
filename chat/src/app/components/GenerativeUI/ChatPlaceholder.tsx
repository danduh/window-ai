import React, { useState } from 'react';
import { getRecipes } from '../../services/RecipePersistence';
import { renderCarouselHTML } from './iframe/carouselTemplate';
import { ChatBubbleContainer } from './ChatBubbleContainer';
import { UIResourceFrame } from './UIResourceFrame';

export const ChatPlaceholder: React.FC = () => {
  const [showFrame, setShowFrame] = useState(false);
  const [carouselHTML, setCarouselHTML] = useState<string | null>(null);

  const handleShowCarousel = async () => {
    try {
      const recipes = await getRecipes();
      const html = renderCarouselHTML(recipes);
      setCarouselHTML(html);
      setShowFrame(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GenUI] Failed to render carousel:', message);
    }
  };

  return (
    <>
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
        <button
          onClick={handleShowCarousel}
          disabled={showFrame}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Show demo carousel
        </button>
      </div>
      {showFrame && carouselHTML && (
        <ChatBubbleContainer>
          <UIResourceFrame html={carouselHTML} />
        </ChatBubbleContainer>
      )}
    </>
  );
};
