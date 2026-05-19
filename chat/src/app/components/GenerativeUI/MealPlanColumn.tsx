import React, { useCallback, useEffect, useState } from 'react';
import { useMealPlan } from '../../hooks/useMealPlan';
import { getRecipe } from '../../services/RecipePersistence';
import { clearPlan } from '../../services/MealPlanStore';

export const MealPlanColumn: React.FC = () => {
  const { plan, loading } = useMealPlan();
  const [titles, setTitles] = useState<Record<string, string>>({});

  // Resolve recipe titles from IDB whenever the plan changes.
  // Uses a cancelled flag pattern (mirrors seedIfMissing effect in GenerativeUIPage.tsx)
  // so React StrictMode double-mount does not double-fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Find unique recipeIds that we don't have a title for yet
      const ids = [...new Set(plan.map((e) => e.recipeId))];
      const missing = ids.filter((id) => titles[id] === undefined);
      if (missing.length === 0) return;

      const resolved: Record<string, string> = {};
      for (const id of missing) {
        const recipe = await getRecipe(id);
        resolved[id] = recipe?.title ?? id;
      }
      if (!cancelled) {
        setTitles((prev) => ({ ...prev, ...resolved }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const handleClear = useCallback(async () => {
    await clearPlan();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Meal Plan</h2>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading plan…</p>
      ) : plan.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-3 text-base font-bold text-gray-800 dark:text-gray-100">
            Your meal plan is empty
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Recipes you pick from the chat will appear here. Come back once chat is wired up.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            {plan.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                type="button"
              >
                Clear plan
              </button>
            )}
          </div>
          <ul>
            {plan.map((entry) => (
              <li
                key={entry.id}
                className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-sm text-gray-700 dark:text-gray-300"
              >
                <div className="font-medium">{titles[entry.recipeId] ?? entry.recipeId}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{entry.recipeId}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(entry.addedAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
