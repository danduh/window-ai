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

const SYSTEM_PROMPT = `You are a recipe assistant for the WebMCP Recipe Workbench. The user is editing a saved recipe. You can call tools that operate on the workbench's IndexedDB-backed recipes. When the user asks for multiple actions in one message (e.g. "scale to 6 and swap milk for oat milk"), call ALL the relevant tools — they can run concurrently. Always confirm what you did in plain language. If a tool returns {"error": "..."}, explain the problem to the user and suggest a fix (e.g. "I couldn't find an ingredient called 'milk' — the recipe has buttermilk; should I swap that?").`;

interface AgentDrawerProps {
  /**
   * Notifies the host page when a tool's lifecycle changes (so the page-level
   * `liveToolName` state — which merges drawer-side AND page-level wrapped
   * tool calls — can drive any header-level highlight).
   *
   * **Contract: Pass a stable callback** (e.g. `setLiveToolName` from
   * `useState`, or a `useCallback`-wrapped function). This callback is
   * captured in the mount-effect closure at session-creation; an unstable
   * inline function would leave the closure holding a stale reference. (W1
   * fix / I1 documentation locks this contract.)
   */
  onLiveToolNameChange?: (name: string | null) => void;
  /** Registration status from the page (controls ToolListPanel header copy). */
  registrationStatus: ToolRegistrationStatus;
  /** Number of tools registered (0..RECIPE_TOOLS.length). */
  registeredCount: number;
  /**
   * Inbound page-level live tool name. The page merges drawer-side (in-page
   * agent) AND page-level (external Tool Inspector / future MCP client) tool
   * calls into one piece of state and passes it back here so the drawer's
   * inner ToolListPanel highlight fires for BOTH paths (AGENT-02: single
   * source, two consumers). When undefined or null, the drawer falls back to
   * its own local `liveToolName` (drawer-side calls only).
   *
   * (W1 fix.)
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
 * In-page chat drawer. Owns the LanguageModel session and routes user
 * messages → session.prompt() → tool calls → transcript rendering.
 *
 * NON-streaming (D-04 fallback): uses session.prompt(text), NOT the
 * streaming variant. See 02-RESEARCH.md §Pitfall #6 — Chrome 146 Canary does
 * not document tool-calling + streaming. Recorded as a deviation.
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
  // Drawer-side fallback for the inner ToolListPanel highlight when the page
  // does NOT pass an inbound `liveToolName` prop. When the page DOES pass it
  // (Plan 02-03 wires this up), `incomingLiveToolName` is the single source
  // of truth merging drawer-side + page-level wrapped tool calls.
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
  // Cancelled-flag pattern from RecipeWorkbenchPage.tsx:60-80.
  useEffect(() => {
    let cancelled = false;
    let createdSession: LanguageModel | null = null;
    (async () => {
      if (typeof LanguageModel === 'undefined') {
        setUnavailable(true);
        return;
      }
      try {
        const adaptedTools = toLanguageModelTools(RECIPE_TOOLS, onToolEvent);
        // Chrome 146 Canary's Prompt API requires `expectedInputs` to include
        // `{type: "tool-response"}` and `expectedOutputs` to include
        // `{type: "tool-call"}` to activate tool-use. Without these, the API
        // rejects with the misleading "Tool use feature is not enabled" — even
        // when the feature flag IS on. Per the W3C Prompt API spec
        // (https://github.com/webmachinelearning/prompt-api §Tool use).
        //
        // Critically: availability() must be called with the SAME tool-use
        // options as create() — Chrome maintains separate availability for
        // plain prompts vs tool-use sessions. Querying plain availability and
        // then creating with tools yields "The device is unable to create a
        // session to run the model. Please check the result of availability()
        // first" because the device-side check rejects the tool-use config.
        const sessionOptions = {
          expectedInputs: [{ type: 'text' as const }, { type: 'tool-response' as const }],
          expectedOutputs: [{ type: 'text' as const }, { type: 'tool-call' as const }],
          tools: adaptedTools,
        };
        const availability = await LanguageModel.availability(sessionOptions);
        if (cancelled) return;
        if (availability !== 'available') {
          setUnavailable(true);
          return;
        }
        const newSession = await LanguageModel.create({
          initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
          ...sessionOptions,
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
    if (sessionInitFailed) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    if (!session) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    setIsLoading(true);
    addMessage(text, 'User');
    try {
      // NON-streaming, per CONTEXT.md D-04 fallback (RESEARCH §Pitfall #6).
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
  // transcript. Simple model: indicators are appended after the latest user
  // message and before the next bot message; for the 2-min demo this is
  // adequate. (UI-SPEC §4 allows merging events into the transcript stream.)
  const indicatorRows = Array.from(toolEvents.entries()).map(([id, event]) => (
    <ToolCallIndicator key={`tool-${id}`} event={event} />
  ));

  // Effective live tool name: prefer the inbound prop (page-level merged
  // state — fires for BOTH drawer-side and external-agent calls) and fall
  // back to local state (drawer-side only) when the host doesn't pass it.
  // Per W1 fix: AGENT-02 single source, two consumers.
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
