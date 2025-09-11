import React, { useState } from 'react';
import { Message } from './ChatBox';
import {
  summarizeText,
  summarizeTextStreaming,
  checkSummaryAvailability,
  type SummaryOptions,
  type AvailabilityStatus
} from '../services/SummaryService';
import { DocsRenderer } from '../tools/DocsRenderer';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';

export function Summary() {
  useSEOData(seoConfigs.summary, '/summary');
  const { trackAIToolUsage, trackUserInteraction, trackError } = useGoogleAnalytics();
  
  const [textArea, setTextArea] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [type, setType] = useState<SummaryOptions['type']>('key-points');
  const [format, setFormat] = useState<SummaryOptions['format']>('markdown');
  const [length, setLength] = useState<SummaryOptions['length']>('medium');
  const [sharedContext, setSharedContext] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilityStatus>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useStreaming, setUseStreaming] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const handleSummarize = async () => {
    if (!textArea.trim()) return;
    
    const startTime = Date.now();
    setIsLoading(true);
    
    // Track summary usage
    trackAIToolUsage('summarizer', 'summarize_start', {
      inputLength: textArea.length,
      type,
      format,
      length,
      useStreaming,
      hasSharedContext: Boolean(sharedContext.trim())
    });
    
    try {
      const options: SummaryOptions = {
        type,
        format,
        length,
        sharedContext: sharedContext.trim() || undefined
      };

      if (useStreaming) {
        const stream = await summarizeTextStreaming(textArea, options);
        const reader = stream.getReader();
        setSummary('');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setSummary(prev => prev + value);
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        const result = await summarizeText(textArea, options);
        setSummary(result);
      }
      
      const processingTime = Date.now() - startTime;
      trackAIToolUsage('summarizer', 'summarize_success', {
        processingTime,
        inputLength: textArea.length,
        type,
        format,
        length,
        useStreaming
      });
      
    } catch (error) {
      console.error('Summarization error:', error);
      trackError('summarization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        inputLength: textArea.length,
        type,
        format,
        length,
        useStreaming
      });
      setSummary('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const options: SummaryOptions = { type, format, length };
      const status = await checkSummaryAvailability(options);
      setAvailability(status);
    } catch (error) {
      console.error('Availability check error:', error);
    }
  };

  const clearSummary = () => {
    setSummary('');
    setTextArea('');
  };

  const typeOptions = [
    { value: 'key-points', label: 'Key Points' },
    { value: 'tl;dr', label: 'TL;DR' },
    { value: 'teaser', label: 'Teaser' },
    { value: 'headline', label: 'Headline' }
  ];

  const formatOptions = [
    { value: 'markdown', label: 'Markdown' },
    { value: 'plain-text', label: 'Plain Text' }
  ];

  const lengthOptions = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Summarizer</h1>
              <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's Summarization API</p>
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
              onClick={clearSummary}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Clear summary"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </header>

        <Tabs 
          defaultTab="docs"
          basePath="/summary"
          tabs={[
            {
              id: 'docs',
              label: 'API Documentation',
              path: '/summary-api-documentation',
              content: (
                <div className="max-w-none">
                  <DocsRenderer docFile="Summary-API.md" initOpen={true} />
                </div>
              )
            },
            {
              id: 'demo',
              label: 'Demo',
              path: '/summary-demo',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Settings Panel */}
                  <div className={`lg:col-span-1 space-y-6 ${showSettings ? 'block' : 'hidden lg:block'}`}>
                    {/* Summary Options */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Summary Options
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Type
                          </label>
                          <select
                            id="type"
                            value={type}
                            onChange={(e) => setType(e.target.value as SummaryOptions['type'])}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {typeOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Format
                          </label>
                          <select
                            id="format"
                            value={format}
                            onChange={(e) => setFormat(e.target.value as SummaryOptions['format'])}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {formatOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="length" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Length
                          </label>
                          <select
                            id="length"
                            value={length}
                            onChange={(e) => setLength(e.target.value as SummaryOptions['length'])}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {lengthOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
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
                        <div>
                          <label htmlFor="sharedContext" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Shared Context (Optional)
                          </label>
                          <textarea
                            id="sharedContext"
                            value={sharedContext}
                            onChange={(e) => setSharedContext(e.target.value)}
                            placeholder="e.g., 'Meeting notes from product team'"
                            rows={2}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
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
                            {availability && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                availability === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                availability === 'downloadable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                availability === 'downloading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                                {availability}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Area */}
                  <div className="lg:col-span-3">
                    <div className="space-y-6">
                      {/* Input Area */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                        <label htmlFor="sourceText" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Text to Summarize
                        </label>
                        <textarea
                          id="sourceText"
                          value={textArea}
                          onChange={(e) => setTextArea(e.target.value)}
                          className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                          placeholder="Paste your article, meeting notes, research paper, or any text you'd like to summarize..."
                        />
                        <button
                          onClick={handleSummarize}
                          disabled={!textArea.trim() || isLoading}
                          className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors duration-200 font-medium disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Summarizing...' : 'Summarize'}
                        </button>
                      </div>

                      {/* Output Area */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[150px] border border-gray-200 dark:border-gray-600">
                          <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                            {summary || "Summary will appear here..."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}

export default Summary;
