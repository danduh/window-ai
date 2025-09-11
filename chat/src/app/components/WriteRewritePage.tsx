import React, { useState } from "react";
import {
  writeText,
  writeTextStreaming,
  rewriteText,
  rewriteTextStreaming,
  checkWriterAvailability,
  checkRewriterAvailability,
  type WriterOptions,
  type RewriterOptions,
  type AvailabilityStatus
} from "../services/WriterService";
import { DocsRenderer } from "../tools/DocsRenderer";
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';

export function WriteRewritePage() {
  useSEOData(seoConfigs.writer, '/writer');
  
  // Writer state
  const [writingPrompt, setWritingPrompt] = useState('');
  const [writtenContent, setWrittenContent] = useState<string>('');
  const [writerTone, setWriterTone] = useState<WriterOptions['tone']>('neutral');
  const [writerFormat, setWriterFormat] = useState<WriterOptions['format']>('markdown');
  const [writerLength, setWriterLength] = useState<WriterOptions['length']>('medium');
  const [writerContext, setWriterContext] = useState('');
  const [writerAvailability, setWriterAvailability] = useState<AvailabilityStatus>();
  const [isWriting, setIsWriting] = useState(false);
  const [useWriterStreaming, setUseWriterStreaming] = useState(false);

  // Rewriter state
  const [rewrittenContent, setRewrittenContent] = useState<string>('');
  const [rewriterTone, setRewriterTone] = useState<RewriterOptions['tone']>('as-is');
  const [rewriterFormat, setRewriterFormat] = useState<RewriterOptions['format']>('as-is');
  const [rewriterLength, setRewriterLength] = useState<RewriterOptions['length']>('as-is');
  const [rewriterContext, setRewriterContext] = useState('');
  const [rewriterAvailability, setRewriterAvailability] = useState<AvailabilityStatus>();
  const [isRewriting, setIsRewriting] = useState(false);
  const [useRewriterStreaming, setUseRewriterStreaming] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [activeMode, setActiveMode] = useState<'writer' | 'rewriter'>('writer');

  const handleWrite = async () => {
    if (!writingPrompt.trim()) return;
    
    setIsWriting(true);
    try {
      const options: WriterOptions = {
        tone: writerTone,
        format: writerFormat,
        length: writerLength,
        sharedContext: writerContext.trim() || undefined
      };

      if (useWriterStreaming) {
        const stream = await writeTextStreaming(writingPrompt, options);
        const reader = stream.getReader();
        setWrittenContent('');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setWrittenContent(prev => prev + value);
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        const result = await writeText(writingPrompt, options);
        setWrittenContent(result);
      }
    } catch (error) {
      console.error('Writing error:', error);
      setWrittenContent('Error: ' + (error as Error).message);
    } finally {
      setIsWriting(false);
    }
  };

  const handleRewrite = async () => {
    if (!writtenContent.trim()) return;
    
    setIsRewriting(true);
    try {
      const options: RewriterOptions = {
        tone: rewriterTone,
        format: rewriterFormat,
        length: rewriterLength,
        sharedContext: writerContext.trim() || undefined
      };

      if (useRewriterStreaming) {
        const stream = await rewriteTextStreaming(writtenContent, options, rewriterContext);
        const reader = stream.getReader();
        setRewrittenContent('');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setRewrittenContent(prev => prev + value);
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        const result = await rewriteText(writtenContent, options, rewriterContext);
        setRewrittenContent(result);
      }
    } catch (error) {
      console.error('Rewriting error:', error);
      setRewrittenContent('Error: ' + (error as Error).message);
    } finally {
      setIsRewriting(false);
    }
  };

  const checkWriterAvail = async () => {
    try {
      const availability = await checkWriterAvailability({ 
        tone: writerTone, 
        format: writerFormat, 
        length: writerLength 
      });
      setWriterAvailability(availability);
    } catch (error) {
      console.error('Writer availability check error:', error);
    }
  };

  const checkRewriterAvail = async () => {
    try {
      const availability = await checkRewriterAvailability({ 
        tone: rewriterTone, 
        format: rewriterFormat, 
        length: rewriterLength 
      });
      setRewriterAvailability(availability);
    } catch (error) {
      console.error('Rewriter availability check error:', error);
    }
  };

  const clearContent = () => {
    setWritingPrompt('');
    setWrittenContent('');
    setRewrittenContent('');
  };

  const writerToneOptions = [
    { value: 'formal', label: 'Formal' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'casual', label: 'Casual' }
  ];

  const writerFormatOptions = [
    { value: 'markdown', label: 'Markdown' },
    { value: 'plain-text', label: 'Plain Text' }
  ];

  const writerLengthOptions = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' }
  ];

  const rewriterToneOptions = [
    { value: 'as-is', label: 'As Is' },
    { value: 'more-formal', label: 'More Formal' },
    { value: 'more-casual', label: 'More Casual' }
  ];

  const rewriterFormatOptions = [
    { value: 'as-is', label: 'As Is' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'plain-text', label: 'Plain Text' }
  ];

  const rewriterLengthOptions = [
    { value: 'as-is', label: 'As Is' },
    { value: 'shorter', label: 'Shorter' },
    { value: 'longer', label: 'Longer' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Writer & Rewriter</h1>
              <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's Writing Assistance APIs</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveMode('writer')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeMode === 'writer'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Writer
              </button>
              <button
                onClick={() => setActiveMode('rewriter')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeMode === 'rewriter'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Rewriter
              </button>
            </div>
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
              onClick={clearContent}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Clear content"
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
          basePath="/writer"
          tabs={[
            {
              id: 'docs',
              label: 'API Documentation',
              path: '/writer-api-documentation',
              content: (
                <div className="max-w-none">
                  <DocsRenderer docFile="Writer-ReWriter-API.md" initOpen={true} />
                </div>
              )
            },
            {
              id: 'demo',
              label: 'Demo',
              path: '/writer-demo',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Settings Panel */}
                  <div className={`lg:col-span-1 space-y-6 ${showSettings ? 'block' : 'hidden lg:block'}`}>
                    {activeMode === 'writer' ? (
                      <>
                        {/* Writer Options */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Writer Options
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="writerTone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tone
                              </label>
                              <select
                                id="writerTone"
                                value={writerTone}
                                onChange={(e) => setWriterTone(e.target.value as WriterOptions['tone'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {writerToneOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="writerFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Format
                              </label>
                              <select
                                id="writerFormat"
                                value={writerFormat}
                                onChange={(e) => setWriterFormat(e.target.value as WriterOptions['format'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {writerFormatOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="writerLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Length
                              </label>
                              <select
                                id="writerLength"
                                value={writerLength}
                                onChange={(e) => setWriterLength(e.target.value as WriterOptions['length'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {writerLengthOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Writer Settings */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                            Settings
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label htmlFor="writerStreaming" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stream Response
                              </label>
                              <input
                                id="writerStreaming"
                                type="checkbox"
                                checked={useWriterStreaming}
                                onChange={(e) => setUseWriterStreaming(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                              />
                            </div>
                            <div>
                              <label htmlFor="writerContext" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Shared Context (Optional)
                              </label>
                              <textarea
                                id="writerContext"
                                value={writerContext}
                                onChange={(e) => setWriterContext(e.target.value)}
                                placeholder="e.g., 'Business email communication'"
                                rows={2}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={checkWriterAvail}
                                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                              >
                                Check Availability
                              </button>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {writerAvailability && (
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    writerAvailability === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                    writerAvailability === 'downloadable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                    writerAvailability === 'downloading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                    'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                  }`}>
                                    {writerAvailability}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Rewriter Options */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Rewriter Options
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="rewriterTone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tone
                              </label>
                              <select
                                id="rewriterTone"
                                value={rewriterTone}
                                onChange={(e) => setRewriterTone(e.target.value as RewriterOptions['tone'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {rewriterToneOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="rewriterFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Format
                              </label>
                              <select
                                id="rewriterFormat"
                                value={rewriterFormat}
                                onChange={(e) => setRewriterFormat(e.target.value as RewriterOptions['format'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {rewriterFormatOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="rewriterLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Length
                              </label>
                              <select
                                id="rewriterLength"
                                value={rewriterLength}
                                onChange={(e) => setRewriterLength(e.target.value as RewriterOptions['length'])}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {rewriterLengthOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Rewriter Settings */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                            Settings
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label htmlFor="rewriterStreaming" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stream Response
                              </label>
                              <input
                                id="rewriterStreaming"
                                type="checkbox"
                                checked={useRewriterStreaming}
                                onChange={(e) => setUseRewriterStreaming(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                              />
                            </div>
                            <div>
                              <label htmlFor="rewriterContext" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Context (Optional)
                              </label>
                              <textarea
                                id="rewriterContext"
                                value={rewriterContext}
                                onChange={(e) => setRewriterContext(e.target.value)}
                                placeholder="e.g., 'Make this more professional for a client presentation'"
                                rows={2}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={checkRewriterAvail}
                                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                              >
                                Check Availability
                              </button>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {rewriterAvailability && (
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    rewriterAvailability === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                    rewriterAvailability === 'downloadable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                    rewriterAvailability === 'downloading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                    'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                  }`}>
                                    {rewriterAvailability}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="lg:col-span-3">
                    <div className="space-y-6">
                      {activeMode === 'writer' ? (
                        <>
                          {/* Writing Input */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                            <label htmlFor="writingPrompt" className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Writing Task
                            </label>
                            <textarea
                              id="writingPrompt"
                              value={writingPrompt}
                              onChange={(e) => setWritingPrompt(e.target.value)}
                              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                              placeholder="Describe what you want me to write. For example: 'Write a professional email to request a meeting with a client' or 'Create a product description for a new smartphone'"
                            />
                            <button
                              onClick={handleWrite}
                              disabled={!writingPrompt.trim() || isWriting}
                              className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors duration-200 font-medium disabled:cursor-not-allowed"
                            >
                              {isWriting ? 'Writing...' : 'Write Content'}
                            </button>
                          </div>

                          {/* Written Content Output */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generated Content</h3>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[200px] border border-gray-200 dark:border-gray-600">
                              <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                                {writtenContent || "Generated content will appear here..."}
                              </div>
                            </div>
                            {writtenContent && (
                              <button
                                onClick={() => setActiveMode('rewriter')}
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                              >
                                Switch to Rewriter →
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Content to Rewrite */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content to Rewrite</h3>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[150px] border border-gray-200 dark:border-gray-600">
                              <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                                {writtenContent || "No content available. Switch to Writer mode to generate content first."}
                              </div>
                            </div>
                            <button
                              onClick={handleRewrite}
                              disabled={!writtenContent.trim() || isRewriting}
                              className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors duration-200 font-medium disabled:cursor-not-allowed"
                            >
                              {isRewriting ? 'Rewriting...' : 'Rewrite Content'}
                            </button>
                          </div>

                          {/* Rewritten Content Output */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rewritten Content</h3>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[200px] border border-gray-200 dark:border-gray-600">
                              <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                                {rewrittenContent || "Rewritten content will appear here..."}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
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

export default WriteRewritePage;
