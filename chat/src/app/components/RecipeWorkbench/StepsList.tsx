import React from 'react';

interface StepsListProps {
  steps: string[];
}

export const StepsList: React.FC<StepsListProps> = ({ steps }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Steps</h3>
    {steps.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 italic">No steps listed.</p>
    ) : (
      <ol className="space-y-3 list-decimal list-inside">
        {steps.map((step, idx) => (
          <li key={idx} className="text-gray-900 dark:text-gray-100 leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
    )}
  </div>
);
