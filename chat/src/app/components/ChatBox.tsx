import React, {useEffect, useState, useRef} from 'react';
import Markdown from "react-markdown";
import { ChatBubbleContainer } from './GenerativeUI/ChatBubbleContainer';
import { UIResourceFrame } from './GenerativeUI/UIResourceFrame';
import { renderCarouselHTML } from './GenerativeUI/iframe/carouselTemplate';
import * as recipeCarouselRegistry from '../services/recipeCarouselRegistry';

export interface Message {
  id: number;
  text: string;
  sender: string;
  /** v1.1 GENUI: when set, the bubble renders <ChatBubbleContainer><UIResourceFrame .../></ChatBubbleContainer>
   *  with `text` shown as a small caption. The URI format is `ui://gen-ui/carousel/<token>`
   *  resolved via `recipeCarouselRegistry.getRecipes(token)`. */
  uiResourceUri?: string;
}

interface ChatBoxProps {
  messages: Message[];
}

/**
 * Resolve a `ui://gen-ui/carousel/<token>` URI to the carousel's srcdoc HTML.
 * Returns null if the token is not in the registry (registry cleared after nav, or forged token).
 * This is synchronous because the registry is in-memory.
 */
function resolveCarouselHTML(uri: string): string | null {
  const token = uri.replace(/^ui:\/\/gen-ui\/carousel\//, '');
  if (!token) return null;
  const recipes = recipeCarouselRegistry.getRecipes(token);
  if (recipes === undefined) return null;
  return renderCarouselHTML(recipes);
}

const ChatBox: React.FC<ChatBoxProps> = ({messages}) => {
  const [initializedMessages, setInitializedMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages) {
      setInitializedMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [initializedMessages]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-96 overflow-y-auto mb-6 transition-colors duration-200">
      <div className="p-4 space-y-4">
        {initializedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Start a conversation with AI</p>
            </div>
          </div>
        ) : (
          initializedMessages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.sender.toLowerCase() === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {message.uiResourceUri ? (
                // v1.1 GENUI: iframe carousel bubble — forces ~600px so the horizontal
                // scroll-snap carousel can show multiple cards at once; falls back to
                // 95% of parent on narrower screens.
                <div
                  className={`w-[600px] max-w-[95%] p-2 rounded-2xl shadow-sm ${
                    message.sender.toLowerCase() === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } break-words`}
                >
                  {(() => {
                    const html = resolveCarouselHTML(message.uiResourceUri);
                    if (html !== null) {
                      return (
                        <div className="flex flex-col gap-2">
                          {message.text && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">{message.text}</p>
                          )}
                          <ChatBubbleContainer>
                            <UIResourceFrame html={html} />
                          </ChatBubbleContainer>
                        </div>
                      );
                    }
                    // Registry miss (cleared after nav or forged token) — fallback to text
                    return (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{message.text || 'Carousel unavailable.'}</Markdown>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // Standard text bubble — pixel-identical to v1.0
                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    message.sender.toLowerCase() === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } break-words`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{message.text}</Markdown>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatBox;
