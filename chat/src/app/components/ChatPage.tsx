/// <reference path="../types/dom-chromium-ai.d.ts" />

import React, {useEffect, useState, useRef} from 'react';
import ChatBox from './ChatBox';
import ChatInput from './ChatInput';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import {getModelCapabilities, zeroShot} from '../services/ChatAIService';
import {DocsRenderer} from "../tools/DocsRenderer";
import {isChromeCanary} from "../tools/isCanary";

interface Message {
  id: number;
  text: string;
  sender: string;
}

const isCanary = isChromeCanary()

const ChatPage: React.FC = () => {
  const [systemMsg, setSystemMsg] = useState<string>('');
  const [destroy, setDestroy] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [useStream, setUseStream] = useState<boolean>(true);
  const [temperature, setTemperature] = useState<number>(1);
  const [modelCaps, setModelCaps] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const messageIdCounter = useRef<number>(0);

  useEffect(() => {
    getModelCapabilities().then((resp) => {
      setModelCaps(resp);
    });
  }, []);

  const addMessage = async (response: string | ReadableStream<string>, sender = 'User') => {
    if (typeof response === 'string') {
      messageIdCounter.current += 1;
      const newMessage: Message = {
        id: messageIdCounter.current,
        text: response,
        sender,
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    } else {
      messageIdCounter.current += 1;
      const newMessage: Message = {
        id: messageIdCounter.current,
        text: '',
        sender: 'Bot',
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Handle streaming response
      const reader = response.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          setMessages((prevMessages) => {
            const lastMessage: Message = prevMessages.pop() as Message;
            lastMessage.text = isCanary ? lastMessage.text + value : value;
            prevMessages.push(lastMessage);
            return [...prevMessages];
          });
        }
      } finally {
        reader.releaseLock();
      }
    }
  };

  const handleUserMessage = async (text: string) => {
    setIsLoading(true);
    addMessage(text, 'User');
    
    try {
      const response = await zeroShot(text, useStream, systemMsg, destroy);
      if (response) {
        addMessage(response, 'Bot');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'Bot');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    messageIdCounter.current = 0;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Chat</h1>
              <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's AI API</p>
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
              onClick={clearChat}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Clear chat"
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
                    {/* Model Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Model Stats
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Default TopK:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{modelCaps?.defaultTopK || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Max TopK:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{modelCaps?.maxTopK || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Default Temp:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{modelCaps?.defaultTemperature || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Max Temp:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{modelCaps?.maxTemperature || 'N/A'}</span>
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
                          <label htmlFor="stream" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Stream Response
                          </label>
                          <input
                            id="stream"
                            type="checkbox"
                            checked={useStream}
                            onChange={(e) => setUseStream(e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Temperature: {temperature.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            id="temperature"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label htmlFor="destroy" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Reset Session
                          </label>
                          <input
                            id="destroy"
                            type="checkbox"
                            checked={destroy}
                            onChange={(e) => setDestroy(e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="systemMsg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            System Message
                          </label>
                          <textarea
                            id="systemMsg"
                            value={systemMsg}
                            onChange={(e) => setSystemMsg(e.target.value)}
                            placeholder="Enter system instructions..."
                            rows={3}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="lg:col-span-3">
                    <div className="space-y-6">
                      <ChatBox messages={messages} />
                      <ChatInput onSend={handleUserMessage} disabled={isLoading} />
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
                  <DocsRenderer docFile="Chat-API.md" initOpen={true} />
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default ChatPage;
