import React, { useEffect } from 'react';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { seedIfMissing } from '../services/RecipePersistence';
import { SEED_RECIPES } from '../services/recipeSeed';
import { MissingFlagBanner } from './RecipeWorkbench/MissingFlagBanner';
import { GenerativeUIHeader } from './GenerativeUI/GenerativeUIHeader';
import { ChatPlaceholder } from './GenerativeUI/ChatPlaceholder';
import { MealPlanColumn } from './GenerativeUI/MealPlanColumn';
import { registerGenUITools } from '../services/genUITools';

export const GenerativeUIPage: React.FC = () => {
  useSEOData(seoConfigs.generativeUI);

  // Mount-time seed: inserts any recipe not already in IndexedDB.
  // The `cancelled` flag is StrictMode-safe — avoids state updates after unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inserted = await seedIfMissing(SEED_RECIPES);
        if (inserted > 0 && !cancelled) {
          console.log(`[GenerativeUI] seedIfMissing: inserted ${inserted} new recipes`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[GenerativeUI] Failed to seed recipe library:', message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mount-time tool registration: registers commitRecipeToPlan with navigator.modelContext.
  // registerGenUITools() is a no-op (returns null) when navigator.modelContext is undefined.
  useEffect(() => {
    const ctrl = registerGenUITools();
    return () => {
      ctrl?.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      {!navigator.modelContext && <MissingFlagBanner />}
      <GenerativeUIHeader />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <ChatPlaceholder />
        </div>
        <div className="lg:w-80 flex-shrink-0">
          <MealPlanColumn />
        </div>
      </div>
    </div>
  );
};
