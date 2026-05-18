import React from 'react';
import { useMealPlan } from '../../hooks/useMealPlan';

export const MealPlanColumn: React.FC = () => {
  const { plan, loading } = useMealPlan();

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
        <ul>
          {plan.map((entry) => (
            <li
              key={entry.id}
              className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="font-medium">{entry.recipeId}</span>
              <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">
                {new Date(entry.addedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
