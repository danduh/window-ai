import React from 'react';

interface RecipeHeaderProps {
  title: string;
  servings: number;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ title, servings }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">Serves {servings}</p>
  </div>
);
