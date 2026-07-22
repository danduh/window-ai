import React, { useEffect, useRef, useState } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import MissingFlagBanner from '../MissingFlagBanner';
import { ToolCallIndicator } from '../RecipeWorkbench/ToolCallIndicator';
import type { ToolCallEvent } from '../../services/toolAdapter';
import type { ChatPanelProps } from './types';
import {
  INTENT_SCHEMA,
  MAX_TOOL_CALLS,
  buildSystemPrompt,
  coerceArgs,
  extractJsonFromResponse,
} from './mcpAgentLoop';

/**
 * Built-in-LLM agent loop for the /mcp-client demo.
 *
 * Cloned from RecipeWorkbench/AgentDrawer.tsx and adapted for a REMOTE MCP
 * server whose tool set is discovered at connect() time. Owns a plain
 * `LanguageModel.create({ responseFormat: INTENT_SCHEMA, outputLanguage: 'en' })`
 * session (NO `tools` array — that codepath is broken on Chrome 147). Tool
 * calls are extracted from the schema-constrained JSON response and dispatched
 * to `props.callTool` (which proxies to McpClientService.callTool), one per
 * prompt turn, capped at MAX_TOOL_CALLS.
 *
 * The system prompt lists the connected server's tools, so the session is
 * RECREATED whenever the tool set changes (keyed on the sorted joined names).
 *
 * Nano availability is guarded HERE, not at the page: connecting and browsing
 * tools works without the Prompt API — only this chat needs Gemini Nano. When
 * LanguageModel is missing or unavailable, a MissingFlagBanner replaces the
 * chat surface.
 */
const ChatPanel: React.FC<ChatPanelProps> = ({ tools, callTool, connected }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolCallEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<LanguageModel | null>(null);
  const [unavailable, setUnavailable] = useState<boolean>(false);
  const [sessionInitFailed, setSessionInitFailed] = useState<boolean>(false);

  // Approval gate — OFF by default. When ON, the user must Approve/Skip each
  // tool call before it runs. A promise resolver is stashed in a ref so the
  // async dispatch loop can await the user's inline choice.
  const [approveBeforeRun, setApproveBeforeRun] = useState<boolean>(false);
  const approveRef = useRef<boolean>(false);
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string;
    args: Record<string, unknown>;
  } | null>(null);
  const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null);

  const messageIdCounter = useRef<number>(0);
  // Guards setState after unmount (the dispatch loop is long-lived + async).
  const aliveRef = useRef<boolean>(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // Resolve any dangling approval so an in-flight loop can unwind.
      approvalResolverRef.current?.(false);
      approvalResolverRef.current = null;
    };
  }, []);

  // Keep the ref in sync so the async loop reads the latest checkbox value.
  useEffect(() => {
    approveRef.current = approveBeforeRun;
  }, [approveBeforeRun]);

  const addMessage = (text: string, sender: string): void => {
    if (!aliveRef.current) return;
    messageIdCounter.current += 1;
    setMessages((prev) => [...prev, { id: messageIdCounter.current, text, sender }]);
  };

  const pushToolEvent = (event: ToolCallEvent): void => {
    if (!aliveRef.current) return;
    setToolEvents((prev) => [...prev, event]);
  };

  // ---------------------------------------------------------------------------
  // Session lifecycle. Recreated whenever the enabled tool set changes (the
  // system prompt embeds the tool list). Keyed on the sorted, joined tool names
  // so a mere prop-identity change with the same names does NOT churn the
  // session. The old session is destroyed before a new one is built.
  // ---------------------------------------------------------------------------
  const toolsKey = tools.map((t) => t.name).sort().join(',');

  useEffect(() => {
    let cancelled = false;
    let createdSession: LanguageModel | null = null;

    setSession(null);
    setSessionInitFailed(false);

    (async () => {
      if (typeof LanguageModel === 'undefined') {
        if (!cancelled) setUnavailable(true);
        return;
      }
      try {
        const availability = await LanguageModel.availability();
        if (cancelled) return;
        if (availability !== 'available') {
          setUnavailable(true);
          return;
        }
        setUnavailable(false);
        const newSession = await LanguageModel.create({
          outputLanguage: 'en',
          responseFormat: INTENT_SCHEMA,
          initialPrompts: [{ role: 'system', content: buildSystemPrompt(tools) }],
        });
        if (cancelled) {
          newSession.destroy();
          return;
        }
        createdSession = newSession;
        setSession(newSession);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[ChatPanel] Failed to create LanguageModel session:', message);
        if (!cancelled) setSessionInitFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      createdSession?.destroy();
    };
    // Recreate only when the tool set (by name) changes. `tools` itself is read
    // inside but keying on the derived name string is the intended trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsKey]);

  // Ask the user to Approve/Skip a tool call. Resolves true (run) or false
  // (skip). Bypassed entirely when the checkbox is OFF.
  const requestApproval = (
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      approvalResolverRef.current = resolve;
      setPendingApproval({ toolName, args });
    });

  const resolveApproval = (approved: boolean): void => {
    setPendingApproval(null);
    const resolve = approvalResolverRef.current;
    approvalResolverRef.current = null;
    resolve?.(approved);
  };

  const handleUserMessage = async (
    text: string,
    _action: 'Prompt' | 'Translate',
  ): Promise<void> => {
    void _action;
    if (!connected) return;
    if (sessionInitFailed || !session) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    setIsLoading(true);
    setToolEvents([]);
    addMessage(text, 'User');

    try {
      let promptText = text;
      let callCount = 0;

      // Dispatch loop: prompt → parse → execute tool → feed result → repeat.
      // Exits when the model emits toolName "done" or MAX_TOOL_CALLS is hit.
      while (callCount < MAX_TOOL_CALLS) {
        const rawResponse = await session.prompt(promptText);
        if (!aliveRef.current) return;

        const parsed = extractJsonFromResponse(rawResponse);
        if (!parsed) {
          addMessage(rawResponse || "Sorry, I couldn't generate a response.", 'Bot');
          break;
        }

        const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'done';

        if (toolName === 'done') {
          const reply =
            typeof parsed.reply === 'string' && parsed.reply.length > 0
              ? parsed.reply
              : 'Done. Let me know if there is anything else.';
          addMessage(reply, 'Bot');
          break;
        }

        // Resolve against the SELECTED tool set the agent was told about.
        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          promptText = `Tool "${toolName}" is not available. Valid tool names: ${
            tools.map((t) => t.name).join(', ') || '(none)'
          }. Call a valid tool or emit { "toolName": "done", "reply": "..." }.`;
          callCount++;
          continue;
        }

        const args = coerceArgs(parsed.args);

        // Optional approval gate.
        if (approveRef.current) {
          const approved = await requestApproval(toolName, args);
          if (!aliveRef.current) return;
          if (!approved) {
            promptText = `Tool "${toolName}" was skipped by the user. Decide the next step: call another tool or emit { "toolName": "done", "reply": "..." }.`;
            callCount++;
            continue;
          }
        }

        pushToolEvent({ kind: 'pending', toolName, args });

        let toolResult: string;
        try {
          const result = await callTool(toolName, args);
          if (!aliveRef.current) return;
          toolResult = typeof result === 'string' ? result : JSON.stringify(result);
          pushToolEvent({ kind: 'done', toolName });
        } catch (err) {
          if (!aliveRef.current) return;
          const message = err instanceof Error ? err.message : 'Unknown error';
          pushToolEvent({ kind: 'error', toolName, message });
          toolResult = JSON.stringify({ error: message });
        }

        // Feed the result (or error) back so the model can continue or recover.
        promptText = `Tool "${toolName}" result: ${toolResult}. Now decide: call the next tool (emit the JSON), or if the request is complete emit { "toolName": "done", "reply": "..." }.`;
        callCount++;
      }

      if (callCount >= MAX_TOOL_CALLS) {
        addMessage('Reached the maximum number of tool calls for this request.', 'Bot');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ChatPanel] Error in agent loop:', message);
      addMessage("Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
    } finally {
      if (aliveRef.current) setIsLoading(false);
    }
  };

  // Nano missing/unavailable — the chat can't run, but connection + tools do.
  if (unavailable) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Agent Chat</h2>
        <MissingFlagBanner
          title="Chrome built-in AI (Gemini Nano) isn't available."
          body="The connection and Tool Inspector still work without it. To run the in-page agent chat, enable the Prompt API for Gemini Nano in Chrome 138+ (Canary/Dev)."
          browserRequirement="Chrome 138+ (Prompt API for Gemini Nano)"
          flags={[
            {
              name: 'Prompt API',
              url: 'chrome://flags/#prompt-api-for-gemini-nano',
              note: 'set to "Enabled"',
            },
            {
              name: 'Optimization Guide',
              url: 'chrome://flags/#optimization-guide-on-device-model',
              note: 'set to "Enabled BypassPerfRequirement"',
            },
          ]}
        />
      </div>
    );
  }

  const inputDisabled = isLoading || !connected || (!session && !sessionInitFailed) || pendingApproval !== null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Chat</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={approveBeforeRun}
            onChange={(e) => setApproveBeforeRun(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          Approve before running tools
        </label>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {tools.length} tool{tools.length === 1 ? '' : 's'} enabled. The built-in LLM (Gemini Nano)
        calls them one at a time to answer your request.
      </p>

      <ChatBox messages={messages} />

      {toolEvents.map((event, i) => (
        <ToolCallIndicator key={i} event={event} />
      ))}

      {pendingApproval && (
        <div
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 my-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="alertdialog"
          aria-live="assertive"
        >
          <span className="text-sm text-yellow-800 dark:text-yellow-200 font-mono break-all">
            Run <strong>{pendingApproval.toolName}</strong>({Object.keys(pendingApproval.args).join(', ')})?
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => resolveApproval(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => resolveApproval(false)}
              className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      <ChatInput onSend={handleUserMessage} disabled={inputDisabled} />
    </div>
  );
};

export default ChatPanel;
