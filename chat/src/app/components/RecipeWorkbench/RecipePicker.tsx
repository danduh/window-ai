import React from 'react';
import type { Recipe } from '../../services/RecipePersistence';

interface RecipePickerProps {
  recipes: Recipe[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const RecipePicker: React.FC<RecipePickerProps> = ({ recipes, activeId, onSelect }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recipes</h3>
    <div className="flex flex-col gap-2" role="group" aria-label="Active recipe">
      {recipes.map((r) => {
        const isActive = r.id === activeId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            aria-pressed={isActive}
            className={
              isActive
                ? 'w-full text-left px-4 py-3 rounded-lg bg-primary-600 text-white font-medium transition-colors duration-200'
                : 'w-full text-left px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200'
            }
          >
            {r.title}
          </button>
        );
      })}
    </div>
  </div>
);
