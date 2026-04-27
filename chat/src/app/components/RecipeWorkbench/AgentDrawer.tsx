/// <reference path="../../types/dom-chromium-ai.d.ts" />

import React, { useEffect, useRef, useState } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import { ToolListPanel } from './ToolListPanel';
import { LanguageModelUnavailable } from './LanguageModelUnavailable';
import type { ToolRegistrationStatus } from './ToolRegistrationPill';

// Plain LanguageModel (no tools). Chrome 146 Canary's
// `LanguageModel.create({ tools, expectedInputs, expectedOutputs })` API is
// unstable on current Canary builds — even with all flags on it rejects with
// "The device is unable to create a session to run the model" after
// availability() reports 'available'. Per the canonical webmcp-tools demos
// (e.g. demos/webmcp-maze/src/webmcp/ToolRegistry.ts) the WebMCP design is
// "page registers tools via navigator.modelContext, EXTERNAL agent consumes
// them" — there is no in-page LanguageModel session in any of the canonical
// demos. The recipe tools remain registered with navigator.modelContext, so
// Chrome's built-in AI sidebar / Tool Inspector / extensions can still drive
// them; this drawer just provides a conversational layer.
const SYSTEM_PROMPT = `You are a recipe assistant for the WebMCP Recipe Workbench. The user is editing a saved recipe (e.g. buttermilk pancakes, tomato pasta) and may ask you about scaling, ingredient substitutions, shopping lists, or cooking technique. Be conversational and concise. You cannot directly modify recipes from this chat — when the user wants to scale, swap ingredients, or generate a shopping list, point them at the WebMCP Tool Inspector (the Chrome extension) which can invoke the registered tools (listRecipes, getRecipe, scaleRecipe, swapIngredient, addIngredient, removeIngredient, generateShoppingList).`;

interface AgentDrawerProps {
  /**
   * Notifies the host page when a tool's lifecycle changes. Currently unused
   * (in-page tool calls are disabled — see file-top comment); retained for
   * forward compatibility with future Chrome builds that ship stable tool-use.
   */
  onLiveToolNameChange?: (name: string | null) => void;
  /** Registration status from the page (controls ToolListPanel header copy). */
  registrationStatus: ToolRegistrationStatus;
  /** Number of tools registered (0..RECIPE_TOOLS.length). */
  registeredCount: number;
  /**
   * Inbound page-level live tool name from external-agent calls (Tool
   * Inspector → wrapToolsWithEvents on navigator.modelContext). Drives the
   * inner ToolListPanel highlight when an external agent invokes a tool.
   */
  liveToolName?: string | null;
}

/**
 * In-page chat drawer. Owns a plain LanguageModel session (no tools) and
 * routes user messages → session.prompt() → transcript rendering. Recipe
 * tool execution flows through the WebMCP path (navigator.modelContext +
 * external Tool Inspector) — the inner ToolListPanel still highlights when
 * an external agent fires a tool, via the `liveToolName` prop the page passes.
 */
export const AgentDrawer: React.FC<AgentDrawerProps> = (props) => {
  const {
    registrationStatus,
    registeredCount,
    liveToolName: incomingLiveToolName,
  } = props;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<LanguageModel | null>(null);
  const [unavailable, setUnavailable] = useState<boolean>(false);
  const [sessionInitFailed, setSessionInitFailed] = useState<boolean>(false);
  const messageIdCounter = useRef<number>(0);

  const addMessage = (text: string, sender: string): void => {
    messageIdCounter.current += 1;
    setMessages((prev) => [...prev, { id: messageIdCounter.current, text, sender }]);
  };

  // Mount-time session creation. Plain LanguageModel — no tools, matches the
  // /chat page's working pattern on the user's Canary.
  useEffect(() => {
    let cancelled = false;
    let createdSession: LanguageModel | null = null;
    (async () => {
      if (typeof LanguageModel === 'undefined') {
        setUnavailable(true);
        return;
      }
      try {
        const availability = await LanguageModel.availability();
        if (cancelled) return;
        if (availability !== 'available') {
          setUnavailable(true);
          return;
        }
        const newSession = await LanguageModel.create({
          initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
        });
        if (cancelled) {
          newSession.destroy();
          return;
        }
        createdSession = newSession;
        setSession(newSession);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.error('[AgentDrawer] Failed to create LanguageModel session:', message);
        if (!cancelled) {
          setSessionInitFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      createdSession?.destroy();
    };
  }, []);

  // Per RESEARCH §Pitfall 10: ChatInput's onSend has signature (message, action).
  // We accept both args and ignore `_action` — do NOT modify ChatInput.
  const handleUserMessage = async (text: string, _action: 'Prompt' | 'Translate'): Promise<void> => {
    void _action;
    if (sessionInitFailed || !session) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    setIsLoading(true);
    addMessage(text, 'User');
    try {
      const response = await session.prompt(text);
      addMessage(
        response || "Sorry, I couldn't generate a response. Try rephrasing your request.",
        'Bot',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[AgentDrawer] Error getting AI response:', message);
      addMessage("Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96">
      <div className="flex flex-col gap-3 h-full">
        <ToolListPanel status={registrationStatus} registeredCount={registeredCount} liveToolName={incomingLiveToolName ?? null} />
        <div className="flex-1 min-h-0 overflow-hidden [&>div:first-child]:h-full [&>div:first-child]:mb-0">
          <ChatBox messages={messages} />
        </div>
        {unavailable && <LanguageModelUnavailable />}
        <ChatInput onSend={handleUserMessage} disabled={isLoading || unavailable || (!session && !sessionInitFailed)} />
      </div>
    </div>
  );
};
