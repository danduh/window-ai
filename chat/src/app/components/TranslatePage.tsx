import React, {useRef, useState} from 'react';
import {
  checkTranslationAvailability, 
  detectPrimaryLanguage, 
  translate,
  translateStreaming,
  AvailabilityStatus
} from '../services/TranslateService';
import {DocsRenderer} from "../tools/DocsRenderer";
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';

const languages = [
  {code: 'en', name: 'English'},
  {code: 'uk', name: 'Ukrainian'},
  {code: 'es', name: 'Spanish'},
  {code: 'ja', name: 'Japanese'},
  {code: 'fr', name: 'French'},
  {code: 'de', name: 'German'},
  {code: 'ru', name: 'Russian'},
  // Add more languages as needed
];


const TranslatePage: React.FC = () => {
  const [sourceText, setSourceText] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('uk');
  const [targetLanguage, setTargetLanguage] = useState<string>('ja');
  const [translationAbility, setTranslationAbility] = useState<AvailabilityStatus>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useStreaming, setUseStreaming] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsLoading(true);
    try {
      if (useStreaming) {
        const stream = await translateStreaming(sourceText, sourceLanguage, targetLanguage);
        const reader = stream.getReader();
        setTranslation('');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setTranslation(prev => prev + value);
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        const response = await translate(sourceText, sourceLanguage, targetLanguage);
        setTranslation(response);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const detectSourceLng = async () => {
    if (!sourceText.trim()) return;
    
    try {
      const detectedLng = await detectPrimaryLanguage(sourceText);
      setSourceLanguage(detectedLng);
    } catch (error) {
      console.error('Language detection error:', error);
    }
  };

  const checkAvailability = async () => {
    try {
      const availability = await checkTranslationAvailability(sourceLanguage, targetLanguage);
      setTranslationAbility(availability);
    } catch (error) {
      console.error('Availability check error:', error);
    }
  };

  const clearTranslation = () => {
    setTranslation('');
    setSourceText('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Translator</h1>
              <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's Translation API</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Settings"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={clearTranslation}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Clear translation"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </header>

        <Tabs 
          defaultTab="demo"
          tabs={[
            {
              id: 'demo',
              label: 'Demo',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Settings Panel */}
                  <div className={`lg:col-span-1 space-y-6 ${showSettings ? 'block' : 'hidden lg:block'}`}>
                    {/* Language Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Languages
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="sourceLanguage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Source Language
                          </label>
                          <select
                            ref={selectRef}
                            id="sourceLanguage"
                            value={sourceLanguage}
                            onChange={e => setSourceLanguage(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {languages.map(lang => (
                              <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Target Language
                          </label>
                          <select
                            id="targetLanguage"
                            value={targetLanguage}
                            onChange={e => setTargetLanguage(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {languages.map(lang => (
                              <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={detectSourceLng}
                          disabled={!sourceText.trim()}
                          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Detect Language
                        </button>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor="streaming" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Stream Response
                          </label>
                          <input
                            id="streaming"
                            type="checkbox"
                            checked={useStreaming}
                            onChange={(e) => setUseStreaming(e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={checkAvailability}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                          >
                            Check Availability
                          </button>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {translationAbility && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                translationAbility === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                translationAbility === 'downloadable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                translationAbility === 'downloading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                                {translationAbility}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Translation Area */}
                  <div className="lg:col-span-3">
                    <div className="space-y-6">
                      {/* Input Area */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                        <label htmlFor="sourceText" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Text to Translate
                        </label>
                        <textarea
                          id="sourceText"
                          value={sourceText}
                          onChange={e => setSourceText(e.target.value)}
                          className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                          placeholder="Enter text to translate..."
                        />
                        <button
                          onClick={handleTranslate}
                          disabled={!sourceText.trim() || isLoading}
                          className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors duration-200 font-medium disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Translating...' : 'Translate'}
                        </button>
                      </div>

                      {/* Output Area */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Translation</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[150px] border border-gray-200 dark:border-gray-600">
                          <pre className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 font-sans">
                            {translation || "Translation will appear here..."}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            },
            {
              id: 'docs',
              label: 'API Documentation',
              content: (
                <div className="max-w-none">
                  <DocsRenderer docFile="Translate-API.md" initOpen={true} />
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default TranslatePage;
