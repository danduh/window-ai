/// <reference path="../../types/dom-chromium-ai.d.ts" />

import React, { useEffect, useReducer, useRef, useState } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import { RECIPE_TOOLS } from '../../services/recipeTools';
import { toLanguageModelTools, type ToolCallEvent } from '../../services/toolAdapter';
import { ToolListPanel } from './ToolListPanel';
import { ToolCallIndicator } from './ToolCallIndicator';
import { LanguageModelUnavailable } from './LanguageModelUnavailable';
import type { ToolRegistrationStatus } from './ToolRegistrationPill';

// Chrome 147 Canary's tool-use is activated via `responseFormat: schema` —
// NOT via the W3C `expectedInputs/expectedOutputs` shape, which Chrome 147
// rejects with "device unable to create a session" even when availability()
// reports 'available'. The pattern below mirrors ToolCallingPage.tsx (the
// only known-working tool-calling code in this repo, runtime-verified by
// the user on 2026-04-27).
//
// When the model decides to call a tool:
//   1. Chrome auto-invokes the tool's `execute` handler
//   2. session.prompt() returns the tool's stringified return value
//   3. The user-visible "what fired" feedback comes from ToolCallIndicator
//      events, dispatched via the toLanguageModelTools wrapper
const TOOL_USE_RESPONSE_FORMAT = {
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

// Mirroring ToolCallingPage.tsx's prompt shape: lead with the role, embed
// the tool list inline (the model uses it to choose), then closing guidance.
const SYSTEM_PROMPT = `You are a recipe assistant for the WebMCP Recipe Workbench with access to recipe-editing tools. Use the available tools to help users with their requests. When using tools, explain what you're doing and provide clear, helpful responses based on the tool results.
Available tools:
- listRecipes: List all saved recipes with id, title, and serving count
- getRecipe: Get the full details of a recipe by id
- generateShoppingList: Generate a consolidated shopping list across recipes
- selectRecipe: Make a recipe the currently active one in the workbench
- scaleRecipe: Scale a recipe to a new serving count (proportional ingredient quantities)
- swapIngredient: Replace one ingredient name with another (case-insensitive substring match)
- addIngredient: Add a new ingredient to a recipe
- removeIngredient: Remove an ingredient from a recipe (case-insensitive substring match)
When the user asks for multiple actions in one message (e.g. "scale to 6 and swap milk for oat milk"), call ALL the relevant tools. Always be helpful and use the most appropriate tool for the user's request.`;

interface AgentDrawerProps {
  /**
   * Notifies the host page when a tool's lifecycle changes (so the page-level
   * `liveToolName` state — which merges drawer-side AND page-level wrapped
   * tool calls — can drive any header-level highlight).
   *
   * **Contract: Pass a stable callback** (e.g. `setLiveToolName` from
   * `useState`, or a `useCallback`-wrapped function). This callback is
   * captured in the mount-effect closure at session-creation; an unstable
   * inline function would leave the closure holding a stale reference.
   */
  onLiveToolNameChange?: (name: string | null) => void;
  /** Registration status from the page (controls ToolListPanel header copy). */
  registrationStatus: ToolRegistrationStatus;
  /** Number of tools registered (0..RECIPE_TOOLS.length). */
  registeredCount: number;
  /**
   * Inbound page-level live tool name. The page merges drawer-side (in-page
   * agent) AND page-level (external Tool Inspector) tool calls into one piece
   * of state and passes it back here so the drawer's inner ToolListPanel
   * highlight fires for BOTH paths (AGENT-02: single source, two consumers).
   */
  liveToolName?: string | null;
}

type ToolEventsState = Map<number, ToolCallEvent>;
type ToolEventAction = { type: 'add'; id: number; event: ToolCallEvent } | { type: 'reset' };

const toolEventsReducer = (state: ToolEventsState, action: ToolEventAction): ToolEventsState => {
  if (action.type === 'reset') return new Map();
  const next = new Map(state);
  next.set(action.id, action.event);
  return next;
};

/**
 * In-page chat drawer. Owns a tool-enabled LanguageModel session and routes
 * user messages → session.prompt() → tool calls → transcript rendering.
 * Tools are wired via Chrome 147's `responseFormat: schema` shape (see
 * top-of-file note); when the model invokes a tool, Chrome auto-runs the
 * `execute` handler and returns the tool's result as the prompt() response.
 *
 * NON-streaming (D-04 fallback): uses session.prompt(text), NOT the
 * streaming variant. See 02-RESEARCH.md §Pitfall #6 — Chrome Canary does
 * not document tool-calling + streaming.
 */
export const AgentDrawer: React.FC<AgentDrawerProps> = (props) => {
  const {
    onLiveToolNameChange,
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
  const eventIdCounter = useRef<number>(0);
  const [toolEvents, dispatchToolEvent] = useReducer(toolEventsReducer, new Map<number, ToolCallEvent>());
  const [localLiveToolName, setLocalLiveToolName] = useState<string | null>(null);

  const addMessage = (text: string, sender: string): void => {
    messageIdCounter.current += 1;
    setMessages((prev) => [...prev, { id: messageIdCounter.current, text, sender }]);
  };

  // Track the currently in-flight tool name and forward to host page.
  const onToolEvent = (e: ToolCallEvent): void => {
    eventIdCounter.current += 1;
    dispatchToolEvent({ type: 'add', id: eventIdCounter.current, event: e });
    if (e.kind === 'pending') {
      setLocalLiveToolName(e.toolName);
      onLiveToolNameChange?.(e.toolName);
    } else {
      setLocalLiveToolName(null);
      onLiveToolNameChange?.(null);
    }
  };

  // Mount-time session creation. Empty deps — RECIPE_TOOLS is module-static.
  useEffect(() => {
    let cancelled = false;
    let createdSession: LanguageModel | null = null;
    (async () => {
      if (typeof LanguageModel === 'undefined') {
        setUnavailable(true);
        return;
      }
      try {
        // Mirror ToolCallingPage.tsx — call create() directly without a
        // pre-create availability() check. The pre-check fingerprints a
        // plain (no-tools) LanguageModel session and Chrome 147 then refuses
        // to upgrade the next create() to tool-use mode (returns "Tool use
        // feature is not enabled"). Dropping the check fixes this.
        const adaptedTools = toLanguageModelTools(RECIPE_TOOLS, onToolEvent);
        const newSession = await LanguageModel.create({
          responseFormat: TOOL_USE_RESPONSE_FORMAT,
          initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
          tools: adaptedTools,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Render the indicator events as pseudo-rows interleaved at the end of the
  // transcript. Indicators are appended after the latest user message and
  // before the next bot message.
  const indicatorRows = Array.from(toolEvents.entries()).map(([id, event]) => (
    <ToolCallIndicator key={`tool-${id}`} event={event} />
  ));

  // Effective live tool name: prefer the inbound prop (page-level merged
  // state — fires for BOTH drawer-side and external-agent calls) and fall
  // back to local state (drawer-side only) when the host doesn't pass it.
  const effectiveLiveToolName: string | null = incomingLiveToolName ?? localLiveToolName;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 mt-6 h-72 lg:h-72 max-lg:h-[60vh] max-lg:max-h-96">
      <div className="flex flex-col gap-3 h-full">
        <ToolListPanel status={registrationStatus} registeredCount={registeredCount} liveToolName={effectiveLiveToolName} />
        <div className="flex-1 min-h-0 overflow-hidden [&>div:first-child]:h-full [&>div:first-child]:mb-0">
          <ChatBox messages={messages} />
        </div>
        {indicatorRows.length > 0 && (
          <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-1">
            {indicatorRows}
          </div>
        )}
        {unavailable && <LanguageModelUnavailable />}
        <ChatInput onSend={handleUserMessage} disabled={isLoading || unavailable || (!session && !sessionInitFailed)} />
      </div>
    </div>
  );
};
