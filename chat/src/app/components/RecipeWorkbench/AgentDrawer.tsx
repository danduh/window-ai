
import React, { useEffect, useRef, useState } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import { ToolListPanel } from './ToolListPanel';
import { LanguageModelUnavailable } from './LanguageModelUnavailable';
import { ToolCallIndicator } from './ToolCallIndicator';
import type { ToolRegistrationStatus } from './ToolRegistrationPill';
import { RECIPE_TOOLS } from '../../services/recipeTools';
import type { ToolCallEvent } from '../../services/toolAdapter';
import { getActiveRecipeId } from '../../services/recipeStore';
import { getRecipe } from '../../services/RecipePersistence';

// ---------------------------------------------------------------------------
// responseFormat schema — constrains the model to emit JSON tool calls.
// Mirrors the ToolCallingPage.tsx shape (the only known-working schema on
// Chrome 147 Canary): a flat object with a required `toolName` field.
// `args` carries the tool parameters; `toolName: "done"` is the sentinel
// value the model emits when it has no more tool calls to make and instead
// wants to give a conversational reply.
// ---------------------------------------------------------------------------
const INTENT_SCHEMA = {
  type: 'object',
  required: ['toolName'],
  additionalProperties: false,
  properties: {
    toolName: {
      type: 'string',
      description:
        'Name of the tool to call next, or "done" when you are ready to give a plain-text reply.',
    },
    args: {
      type: 'object',
      description: 'Arguments object for the tool (omit or use {} when toolName is "done").',
    },
    reply: {
      type: 'string',
      description:
        'Your conversational reply to the user. Only populated when toolName is "done".',
    },
  },
};

// ---------------------------------------------------------------------------
// SYSTEM_PROMPT — teaches the model the dispatch loop protocol.
// Tool argument shapes are inlined so the model can fill `args` without
// needing LanguageModel.create({ tools }) (the broken Chrome 147 codepath).
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a recipe assistant for the WebMCP Recipe Workbench.

You respond ONLY with a single JSON object — no markdown, no code fences, no extra text.
Format: { "toolName": "<toolName or 'done'>", "args": { ... }, "reply": "<only when done>" }

Available tools (call one per turn; the host JS will execute it and feed you the result):
- listRecipes: args {}
- getRecipe: args { "id": "<recipeId>" }
- selectRecipe: args { "id": "<recipeId>" }
- scaleRecipe: args { "servings": <number> }
- swapIngredient: args { "from": "<ingredient name>", "to": "<new name>" }
- addIngredient: args { "name": "<name>", "quantity": <number>, "unit": "<string>" }
- removeIngredient: args { "name": "<ingredient name>" }
- generateShoppingList: args {}

CRITICAL RULES:
1. NEVER include recipeId in args — the host JS already knows which recipe is active.
2. If the user asks for multiple changes, call ONE tool per turn and wait for the result.
3. After all tools are done, emit { "toolName": "done", "reply": "..." } with a summary.
4. If the request needs no tool, emit { "toolName": "done", "reply": "..." } immediately.
5. NEVER wrap the JSON in code fences or markdown. Output ONLY the raw JSON object.`;

// ---------------------------------------------------------------------------
// Max tool-call iterations per user turn (safety guard against runaway loops).
// ---------------------------------------------------------------------------
const MAX_TOOL_CALLS = 10;

// ---------------------------------------------------------------------------
// extractJsonFromResponse — robustly extracts a JSON object from a model
// response that may be wrapped in markdown code fences or have leading/
// trailing text. Returns null if no valid JSON object is found.
//
// Root cause addressed: Chrome 147 Canary's `session.prompt()` with
// `responseFormat` sometimes returns the JSON wrapped in ```json ... ``` fences
// despite the schema constraint, causing JSON.parse to throw and the entire
// raw response to be displayed as the chat bubble (B1/B4 from UAT-04 debug
// session 2026-04-27). This helper strips fences before parsing.
// ---------------------------------------------------------------------------
function extractJsonFromResponse(raw: string): Record<string, unknown> | null {
  // 1. Try the response as-is first (happy path).
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to fence-stripping
  }

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim()) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to regex extraction
    }
  }

  // 3. Attempt to extract the first { ... } block from the response.
  // This handles cases where the model prepends or appends explanatory text.
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // extraction failed
    }
  }

  return null;
}

interface AgentDrawerProps {
  onLiveToolNameChange?: (name: string | null) => void;
  registrationStatus: ToolRegistrationStatus;
  registeredCount: number;
  liveToolName?: string | null;
}

/**
 * In-page chat drawer.
 *
 * Owns a plain `LanguageModel.create({ responseFormat: INTENT_SCHEMA, outputLanguage: 'en' })`
 * session (NO `tools` array — that codepath is broken on Chrome 147 + WebMCP).
 * Tool calls are extracted from the schema-constrained JSON response and
 * dispatched to `RECIPE_TOOLS` handlers in JavaScript, one per prompt turn.
 * This satisfies AGENT-01 ("in-page LanguageModel chat invokes the same
 * registered WebMCP tools") without touching the broken `create({ tools })`
 * codepath.
 *
 * Architecture: responseFormat-based intent extraction (Approach A from the
 * reopen debug session 2026-04-27).
 *
 * Bugs fixed (2026-04-27 continuation):
 * - B1/B4: extractJsonFromResponse() strips markdown code fences before
 *   JSON.parse — prevents raw JSON from appearing as a chat bubble.
 * - B2: Dispatch loop correctly iterates now that parse doesn't fail.
 * - B3: Active recipe ID is injected into each user turn prefix so the
 *   model never needs to guess or hallucinate a recipeId.
 * - Chrome 147 warning: outputLanguage: 'en' added to LanguageModel.create()
 *   to suppress "No output language specified" warning and ensure optimal
 *   output quality (may also reduce fence-wrapping and hallucination).
 */
export const AgentDrawer: React.FC<AgentDrawerProps> = (props) => {
  const {
    onLiveToolNameChange,
    registrationStatus,
    registeredCount,
    liveToolName: incomingLiveToolName,
  } = props;

  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolCallEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<LanguageModel | null>(null);
  const [unavailable, setUnavailable] = useState<boolean>(false);
  const [sessionInitFailed, setSessionInitFailed] = useState<boolean>(false);
  const messageIdCounter = useRef<number>(0);

  const addMessage = (text: string, sender: string): void => {
    messageIdCounter.current += 1;
    setMessages((prev) => [...prev, { id: messageIdCounter.current, text, sender }]);
  };

  const pushToolEvent = (event: ToolCallEvent): void => {
    setToolEvents((prev) => [...prev, event]);
  };

  // Mount-time session creation.
  // responseFormat is used WITHOUT a `tools` array — the model emits JSON that
  // the host JS parses and dispatches manually. outputLanguage: 'en' is required
  // in Chrome 147+ to suppress the "No output language specified" console warning
  // and ensure optimal output quality (JSON adherence, reduced hallucination).
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
          outputLanguage: 'en',
          responseFormat: INTENT_SCHEMA,
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
  const handleUserMessage = async (text: string, _action: 'Prompt' | 'Translate'): Promise<void> => {
    void _action;
    if (sessionInitFailed || !session) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    setIsLoading(true);
    setToolEvents([]);
    addMessage(text, 'User');

    // B3 fix: prefix the user message with active recipe context so the model
    // never has to guess or hallucinate a recipeId. The real IDs are
    // "buttermilk-pancakes" and "tomato-pasta" — injecting them here prevents
    // the model from inventing IDs like "123".
    let recipeContext = '';
    const activeId = getActiveRecipeId();
    if (activeId) {
      try {
        const recipe = await getRecipe(activeId);
        if (recipe) {
          const ingredientNames = recipe.ingredients.map((i) => i.name).join(', ');
          recipeContext = `[Context: active recipe is "${recipe.title}" (id: ${recipe.id}), ${recipe.servings} servings. Ingredients: ${ingredientNames}.]\n\n`;
        }
      } catch {
        // non-fatal — proceed without context if fetch fails
      }
    }

    try {
      // Prepend recipe context to the first user message in this turn.
      let promptText = recipeContext + text;
      let callCount = 0;

      // Dispatch loop: prompt → parse → execute tool → feed result → repeat.
      // Exits when the model emits toolName "done" or MAX_TOOL_CALLS is reached.
      while (callCount < MAX_TOOL_CALLS) {
        const rawResponse = await session.prompt(promptText);

        // B1/B4 fix: use extractJsonFromResponse() which strips markdown code
        // fences before JSON.parse. Previously a bare JSON.parse(rawResponse)
        // was used — if the model wrapped the JSON in ```json ... ``` the parse
        // threw and the catch rendered the full raw response as a chat bubble.
        const parsed = extractJsonFromResponse(rawResponse);

        if (!parsed) {
          // Could not extract JSON at all — surface the raw response as a plain
          // assistant reply and stop the loop.
          addMessage(rawResponse || "Sorry, I couldn't generate a response.", 'Bot');
          break;
        }

        const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'done';

        if (toolName === 'done') {
          // Model has finished all tool calls — show the conversational reply.
          const reply =
            typeof parsed.reply === 'string' && parsed.reply.length > 0
              ? parsed.reply
              : "Done. Let me know if you'd like any other changes.";
          addMessage(reply, 'Bot');
          onLiveToolNameChange?.(null);
          break;
        }

        // Find the tool handler in RECIPE_TOOLS.
        const tool = RECIPE_TOOLS.find((t) => t.name === toolName);
        if (!tool) {
          // Unknown tool — tell the model and continue.
          promptText = `Tool "${toolName}" is not registered. Available tools: ${RECIPE_TOOLS.map((t) => t.name).join(', ')}. Please call a valid tool or emit { "toolName": "done" }.`;
          callCount++;
          continue;
        }

        const args = (parsed.args !== null && typeof parsed.args === 'object' && !Array.isArray(parsed.args)
          ? parsed.args
          : {}) as Record<string, unknown>;

        // Emit pending event and notify the parent so the external ToolListPanel
        // can also highlight the active tool.
        pushToolEvent({ kind: 'pending', toolName, args });
        onLiveToolNameChange?.(toolName);

        let toolResult: string;
        try {
          const result = await tool.execute(args);
          toolResult = typeof result === 'string' ? result : JSON.stringify(result);
          pushToolEvent({ kind: 'done', toolName });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          pushToolEvent({ kind: 'error', toolName, message });
          toolResult = JSON.stringify({ error: message });
        }

        onLiveToolNameChange?.(null);

        // B2 fix: feed the tool result back as the next prompt so the model can
        // decide whether to call another tool or emit "done". The loop continues
        // until the "done" sentinel is received.
        promptText = `Tool "${toolName}" result: ${toolResult}. Now decide: call the next tool (emit the JSON), or if all changes are complete emit { "toolName": "done", "reply": "..." }.`;
        callCount++;
      }

      if (callCount >= MAX_TOOL_CALLS) {
        addMessage('Reached the maximum number of tool calls for this request.', 'Bot');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[AgentDrawer] Error in agent loop:', message);
      addMessage("Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
    } finally {
      setIsLoading(false);
      onLiveToolNameChange?.(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 h-full min-h-[60vh] lg:min-h-[600px] flex flex-col">
      <div className="flex flex-col gap-3 h-full min-h-0">
        <ToolListPanel status={registrationStatus} registeredCount={registeredCount} liveToolName={incomingLiveToolName ?? null} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatBox messages={messages} />
          {toolEvents.map((event, i) => (
            <ToolCallIndicator key={i} event={event} />
          ))}
        </div>
        {unavailable && <LanguageModelUnavailable />}
        <ChatInput onSend={handleUserMessage} disabled={isLoading || unavailable || (!session && !sessionInitFailed)} />
      </div>
    </div>
  );
};
