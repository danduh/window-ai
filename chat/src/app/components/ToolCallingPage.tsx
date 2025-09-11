import React, { useEffect, useState, useRef } from 'react';
import ChatBox from './ChatBox';
import ChatInput from './ChatInput';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { DocsRenderer } from '../tools/DocsRenderer';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';

interface Message {
  id: number;
  text: string;
  sender: string;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (...args: any[]) => Promise<string>;
  enabled: boolean;
}
const schema = {
    type: 'object',
    required: ['toolName'],
    additionalProperties: false,
    properties: {
      toolName: {
        type: 'string',
        description: 'Name of the tool that should be executed',
      },
    },
  };
const ToolCallingPage: React.FC = () => {
  useSEOData(seoConfigs.toolCalling, '/tool-calling');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<any>(null);
  const messageIdCounter = useRef<number>(0);
  const [availableTools, setAvailableTools] = useState<Tool[]>([
    {
      name: 'getWeather',
      description: 'Get the current weather for a location',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city to check for weather condition',
          },
        },
        required: ['location'],
      },
      async execute({ location }: { location: string }) {
        // Simulate weather API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
        const temps = [15, 20, 25, 30, 35];
        const condition =
          conditions[Math.floor(Math.random() * conditions.length)];
        const temp = temps[Math.floor(Math.random() * temps.length)];

        return JSON.stringify({
          location,
          condition,
          temperature: `${temp}°C`,
          humidity: `${Math.floor(Math.random() * 40 + 30)}%`,
          timestamp: new Date().toISOString(),
        });
      },
      enabled: true,
    },
    {
      name: 'calculateMath',
      description: 'Perform mathematical calculations',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              "Mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)')",
          },
        },
        required: ['expression'],
      },
      async execute({ expression }: { expression: string }) {
        console.log('calculateMath', expression);
        try {
          // Simple math evaluation (in real app, use a proper math library)
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
          const result = eval(sanitized);
          return JSON.stringify({
            expression,
            result: result.toString(),
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return JSON.stringify({
            expression,
            error: 'Invalid mathematical expression',
            timestamp: new Date().toISOString(),
          });
        }
      },
      enabled: true,
    },
    {
      name: 'getCurrentTime',
      description: 'Get the current date and time',
      inputSchema: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone (optional, defaults to local)',
          },
        },
      },
      async execute({ timezone }: { timezone?: string }) {
        const now = new Date();
        return JSON.stringify({
          timestamp: now.toISOString(),
          localTime: now.toLocaleString(),
          timezone:
            timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          unix: Math.floor(now.getTime() / 1000),
        });
      },
      enabled: true,
    },
    {
      name: 'randomNumber',
      description: 'Generate a random number within a specified range',
      inputSchema: {
        type: 'object',
        properties: {
          min: {
            type: 'number',
            description: 'Minimum value (inclusive)',
          },
          max: {
            type: 'number',
            description: 'Maximum value (inclusive)',
          },
        },
        required: ['min', 'max'],
      },
      async execute({ min, max }: { min: number; max: number }) {
        const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        return JSON.stringify({
          min,
          max,
          result: randomNum,
          timestamp: new Date().toISOString(),
        });
      },
      enabled: true,
    },
  ]);

  const initializeSession = async () => {
    try {
      const enabledTools = availableTools.filter((tool) => tool.enabled);

      if (session) {
        session.destroy();
      }

      const newSession = await LanguageModel.create({
        responseFormat: schema,
        initialPrompts: [
          {
            role: 'system',
            content: `You are a helpful assistant with access to various tools. Use the available tools to help users with their requests. When using tools, explain what you're doing and provide clear, helpful responses based on the tool results.
Available tools:${enabledTools
              .map((tool) => `- ${tool.name}: ${tool.description}`)
              .join('\n')}
Always be helpful and use the most appropriate tool for the user's request.`,
          },
        ],
        tools: enabledTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute,
        })),
      });

      setSession(newSession);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      addMessage(
        'Failed to initialize AI session. Please make sure you have Chrome AI available.',
        'System'
      );
    }
  };

  useEffect(() => {
    initializeSession();

    return () => {
      if (session) {
        session.destroy();
      }
    };
  }, [availableTools]);

  const addMessage = (text: string, sender: string = 'User') => {
    messageIdCounter.current += 1;
    const newMessage: Message = {
      id: messageIdCounter.current,
      text,
      sender,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const handleUserMessage = async (text: string) => {
    if (!session) {
      addMessage(
        'AI session not available. Please refresh the page.',
        'System'
      );
      return;
    }

    setIsLoading(true);
    addMessage(text, 'User');
    try {
      const response = await session.prompt(text);
      addMessage(response, 'Bot');
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

  const toggleTool = (toolName: string) => {
    setAvailableTools((prev) =>
      prev.map((tool) =>
        tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool
      )
    );
  };

  const testTool = async (tool: Tool) => {
    try {
      let testParams: any = {};

      // Generate test parameters based on the tool
      switch (tool.name) {
        case 'getWeather':
          testParams = { location: 'San Francisco' };
          break;
        case 'calculateMath':
          testParams = { expression: '2 + 2 * 3' };
          break;
        case 'getCurrentTime':
          testParams = { timezone: 'UTC' };
          break;
        case 'generateRandomNumber':
          testParams = { min: 1, max: 100 };
          break;
      }

      const result = await tool.execute(testParams);
      addMessage(
        `Testing ${tool.name} with params: ${JSON.stringify(testParams)}`,
        'System'
      );
      addMessage(`Result: ${result}`, 'System');
    } catch (error) {
      addMessage(`Error testing ${tool.name}: ${error}`, 'System');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-3 rounded-xl">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tool Calling
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI with external tool capabilities
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={clearChat}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Clear chat"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </header>

        <Tabs
          defaultTab="docs"
          basePath="/tool-calling"
          tabs={[
            {
              id: 'docs',
              label: 'API Documentation',
              path: '/tool-calling-api-documentation',
              content: (
                <div className="max-w-none">
                  <DocsRenderer docFile="Tool-Calling-API.md" initOpen={true} />
                </div>
              ),
            },
            {
              id: 'demo',
              label: 'Demo',
              path: '/tool-calling-demo',
              content: (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Tools Panel */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Available Tools */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                          />
                        </svg>
                        Available Tools
                      </h3>
                      <div className="space-y-3">
                        {availableTools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={tool.enabled}
                                  onChange={() => toggleTool(tool.name)}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {tool.name}
                                </h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {tool.description}
                              </p>
                            </div>
                            <button
                              onClick={() => testTool(tool)}
                              className="ml-2 px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors duration-200"
                            >
                              Test
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Example Prompts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        Try These
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          onClick={() =>
                            handleUserMessage(
                              "What's the weather like in Tokyo?"
                            )
                          }
                        >
                          "What's the weather like in Tokyo?"
                        </div>
                        <div
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          onClick={() =>
                            handleUserMessage('Calculate 15 * 23 + 47')
                          }
                        >
                          "Calculate 15 * 23 + 47"
                        </div>
                        <div
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          onClick={() => handleUserMessage('What time is it?')}
                        >
                          "What time is it?"
                        </div>
                        <div
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          onClick={() =>
                            handleUserMessage(
                              'Give me a random number between 1 and 1000'
                            )
                          }
                        >
                          "Give me a random number between 1 and 1000"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="lg:col-span-3">
                    <div className="space-y-6">
                      <ChatBox messages={messages} />
                      <ChatInput
                        onSend={handleUserMessage}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default ToolCallingPage;
