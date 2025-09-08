import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const APISection = ({ 
  title, 
  children, 
  icon 
}: { 
  title: string; 
  children: React.ReactNode;
  icon: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <div className="flex items-center mb-4">
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl mr-4">
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
    {children}
  </div>
);

const FlagInstruction = ({ flag, description }: { flag: string; description: string }) => (
  <li className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <span className="font-semibold text-primary-600 dark:text-primary-400">{flag}:</span>
    <span className="ml-2 text-gray-700 dark:text-gray-300">{description}</span>
  </li>
);

const CodeSnippet = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">
    {children}
  </code>
);

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chrome AI APIs</h1>
              <p className="text-gray-600 dark:text-gray-400">Built-in AI capabilities for modern web applications</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Introduction */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
            Chrome now offers a comprehensive set of experimental AI capabilities through built-in APIs. 
            These cutting-edge features provide on-device AI processing for chat, summarization, translation, 
            and writing assistance. Below you'll find setup instructions and examples for each API.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">Experimental Features</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  These APIs are experimental and require Chrome Canary with specific flags enabled. 
                  Features may change or be removed in future versions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Sections */}
        <div className="space-y-8">
          <APISection 
            title="Prompt API (Chat)"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          >
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Interactive conversational AI powered by Gemini Nano. Perfect for chatbots, virtual assistants, 
              and interactive help systems with streaming responses and session management.
            </p>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Setup Instructions:</h3>
            <ol className="space-y-2 mb-6">
          <FlagInstruction
            flag="Enable Gemini Nano"
            description='Navigate to chrome://flags/#optimization-guide-on-device-model and enable "BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Prompt API"
            description='Navigate to chrome://flags/#prompt-api-for-gemini-nano and enable it'
          />
        </ol>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verify availability in Chrome DevTools:</p>
              <CodeSnippet>(await ai.languageModel.capabilities()).available</CodeSnippet>
            </div>
      </APISection>

          <APISection 
            title="Summarization API"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Intelligent text summarization with multiple formats (key-points, TL;DR, headlines, teasers) 
              and customizable length options. Ideal for content curation and information processing.
            </p>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Setup Instructions:</h3>
            <ol className="space-y-2 mb-6">
          <FlagInstruction
            flag="Enable Gemini Nano"
            description='Navigate to chrome://flags/#optimization-guide-on-device-model and enable "BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Summarization API"
            description='Navigate to chrome://flags/#summarization-api-for-gemini-nano and enable it'
          />
        </ol>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verify setup in Chrome DevTools:</p>
              <CodeSnippet>await Summarizer.availability()</CodeSnippet>
            </div>
      </APISection>

          <APISection 
            title="Translation & Language Detection APIs"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            }
          >
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              On-device language detection and translation between multiple language pairs. 
              Features automatic language detection, streaming translation, and downloadable language packs.
            </p>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Setup Instructions:</h3>
            <ol className="space-y-2 mb-6">
          <FlagInstruction
            flag="Enable Language Detection API"
            description='Navigate to chrome://flags/#language-detection-api and enable it'
          />
          <FlagInstruction
            flag="Enable Translation API"
                description='Navigate to chrome://flags/#translation-api and enable it (or "without language pack limit" for more languages)'
          />
        </ol>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verify availability:</p>
                <CodeSnippet>await Translator.availability({`{sourceLanguage: "en", targetLanguage: "es"}`})</CodeSnippet>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Manage language packs:</p>
                <CodeSnippet>chrome://on-device-translation-internals/</CodeSnippet>
              </div>
            </div>
      </APISection>

          <APISection 
            title="Writer & Rewriter APIs"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            }
          >
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              AI-powered content creation and enhancement. Writer creates new content from prompts, 
              while Rewriter transforms existing text with tone, format, and length adjustments.
            </p>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Setup Instructions:</h3>
            <ol className="space-y-2 mb-6">
          <FlagInstruction
            flag="Enable Gemini Nano"
                description='Navigate to chrome://flags/#optimization-guide-on-device-model and enable "BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Writer API"
                description='Navigate to chrome://flags/#writer-api-for-gemini-nano and enable it'
          />
          <FlagInstruction
            flag="Enable Rewriter API"
                description='Navigate to chrome://flags/#rewriter-api-for-gemini-nano and enable it'
          />
        </ol>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verify setup in Chrome DevTools:</p>
              <CodeSnippet>await Writer.availability() && await Rewriter.availability()</CodeSnippet>
            </div>
      </APISection>
        </div>

        {/* Try the APIs Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-3 rounded-xl mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Try the APIs</h2>
          </div>
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            Ready to explore? Try out each API in our interactive demo application:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/chat" 
              className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">Chat with AI</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Interactive conversations with Gemini Nano</p>
              </div>
            </Link>

            <Link 
              to="/summary" 
              className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-300">Summarize Text</h3>
                <p className="text-sm text-green-700 dark:text-green-300">Intelligent content summarization</p>
              </div>
            </Link>

            <Link 
              to="/translate" 
              className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 dark:group-hover:text-purple-300">Translate Languages</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">Multi-language translation & detection</p>
              </div>
            </Link>

            <Link 
              to="/writer" 
              className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-8 h-8 text-orange-600 dark:text-orange-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 group-hover:text-orange-700 dark:group-hover:text-orange-300">Write & Rewrite</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">AI-powered content creation & enhancement</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            These APIs require Chrome 129+ with experimental flags enabled. 
            Features are subject to change as they're still in development.
          </p>
        </div>
      </div>
    </div>
  );
};