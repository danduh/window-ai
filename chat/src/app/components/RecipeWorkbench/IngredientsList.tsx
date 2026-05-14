import React from 'react';
import type { Ingredient } from '../../services/RecipePersistence';

interface IngredientsListProps {
  ingredients: Ingredient[];
}

export const IngredientsList: React.FC<IngredientsListProps> = ({ ingredients }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ingredients</h3>
    {ingredients.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 italic">No ingredients listed.</p>
    ) : (
      <ul className="space-y-2">
        {ingredients.map((ing, idx) => (
          <li key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
            <span className="font-medium">{ing.quantity} {ing.unit}</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{ing.name}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
