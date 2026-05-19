import React from 'react';

export const ChatBubbleContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="rounded-2xl max-w-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm p-2 mt-4 animate-fade-in">
    {children}
  </div>
);
