import React, { useState } from 'react';
import { LANGUAGE_OPTIONS, type ProofreaderLanguageCode } from '../../services/ProofreaderService';

interface ProofreaderFormProps {
  defaultText: string;
  defaultLanguage: ProofreaderLanguageCode;
  disabled: boolean;
  isSubmitting: boolean;
  onProofread: (text: string, language: ProofreaderLanguageCode) => void;
  onLanguageChange: (lang: ProofreaderLanguageCode) => void;
}

export const ProofreaderForm: React.FC<ProofreaderFormProps> = ({
  defaultText,
  defaultLanguage,
  disabled,
  isSubmitting,
  onProofread,
  onLanguageChange,
}) => {
  const [text, setText] = useState(defaultText);
  const [language, setLanguage] = useState<ProofreaderLanguageCode>(defaultLanguage);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as ProofreaderLanguageCode;
    setLanguage(lang);
    onLanguageChange(lang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProofread(text, language);
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Paste or type some text to proofread…"
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="proofreaderLanguage" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Language
        </label>
        <select
          id="proofreaderLanguage"
          value={language}
          onChange={handleLanguageChange}
          disabled={disabled}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !text.trim()}
          className="ml-auto bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? 'Proofreading...' : 'Proofread'}
        </button>
      </div>
    </form>
  );
};
