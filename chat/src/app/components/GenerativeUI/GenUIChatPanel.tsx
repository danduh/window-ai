// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../types/dom-chromium-ai.d.ts" />

/**
 * GenUIChatPanel — in-page chat for the /generative-ui route.
 *
 * Architecture: cloned from the webmcp agent drawer pattern with these
 * Phase 6 differences:
 *
 * 1. System prompt lists only tools WITHOUT annotations.visibility:['app'].
 *    For Phase 6, that resolves to exactly `searchRecipes`. `commitRecipeToPlan`
 *    is hidden from the model — it is only reachable via the iframe→host bridge.
 *
 * 2. Chrome 147 LanguageModel.create({ tools }) codepath is broken. We use
 *    `responseFormat: INTENT_SCHEMA` + manual dispatch loop as the workaround.
 *    No `tools` array is passed to create().
 *
 * 3. _meta interceptor invariant — GENUI-10:
 *    "The string `ui://` MUST NOT appear in any string passed to session.prompt()."
 *    When a tool result carries `_meta['ui.resourceUri']`, the interceptor:
 *      a) appends a Message with uiResourceUri set (renders the iframe bubble)
 *      b) feeds ONLY `{ content }` — stripped of _meta — back to the model
 *    A runtime console.assert fires before every session.prompt() call to make
 *    this invariant load-bearing in dev builds.
 *
 * 4. Commit-listener: on mount, registers setCommitListener(cb) so that whenever
 *    commitRecipeToPlan resolves, the chat appends "Added <title> to your meal
 *    plan ✓" without re-prompting the model.
 *
 * Brownfield boundary: this file does NOT import from the webmcp page subtree.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatBox, { type Message } from '../ChatBox';
import ChatInput from '../ChatInput';
import { GEN_UI_TOOLS, setCommitListener } from '../../services/genUITools';
import { getRecipe } from '../../services/RecipePersistence';

// ---------------------------------------------------------------------------
// responseFormat schema — constrains the model to emit JSON tool calls.
// Mirrors the known-working schema from the codebase (flat object + toolName).
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
// MAX_TOOL_ITERATIONS — safety guard. 5 iterations per user turn is sufficient
// for /generative-ui which has only one visible tool (searchRecipes).
// ---------------------------------------------------------------------------
const MAX_TOOL_ITERATIONS = 5;

// ---------------------------------------------------------------------------
// extractJsonFromResponse — robustly extracts a JSON object from a model
// response that may be wrapped in markdown code fences or have leading/
// trailing text. Returns null if no valid JSON object is found.
//
// Three-stage parser: direct JSON.parse → fence-strip → brace-extract.
// Root cause: Chrome 147 Canary's session.prompt() with responseFormat
// sometimes returns JSON wrapped in code fences despite the schema constraint.
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

// ---------------------------------------------------------------------------
// SYSTEM_PROMPT — dynamically built from visible tools (those WITHOUT
// annotations.visibility:['app']). For Phase 6, only `searchRecipes` survives
// the filter. `commitRecipeToPlan` is hidden from the model.
//
// The prompt follows 06-CONTEXT.md §System prompt structure.
// ---------------------------------------------------------------------------
const visibleToolsForPrompt = GEN_UI_TOOLS.filter(
  (t) => !t.annotations?.visibility?.includes('app'),
);

const toolCatalog = visibleToolsForPrompt
  .map(
    (t) =>
      `- ${t.name}: ${t.description}. Input schema: ${JSON.stringify(t.inputSchema ?? {})}`,
  )
  .join('\n');

const SYSTEM_PROMPT = `You are a recipe assistant inside the user's browser. You can search the user's recipe library and return interactive recipe cards.

Respond ONLY with a single JSON object — no markdown, no code fences, no extra text. Format: { "toolName": "<name or 'done'>", "args": {...}, "reply": "<only when done>" }

Available tools (call one per turn; the host JS will execute it and feed you the result):
${toolCatalog}

CRITICAL RULES:
1. Call ONE tool per turn and wait for the result before deciding next steps.
2. After tool results arrive, emit { "toolName": "done", "reply": "<one-sentence summary>" }.
3. If the user asks for something no tool can do, emit { "toolName": "done", "reply": "..." } immediately with an explanation.
4. NEVER wrap the JSON in code fences or markdown. Output ONLY the raw JSON object.
5. NEVER fabricate ui:// URIs or reference tool result metadata in your reply text — keep replies conversational.`;

// ---------------------------------------------------------------------------
// GenUIChatPanel component
// ---------------------------------------------------------------------------

export const GenUIChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<LanguageModel | null>(null);
  const [unavailable, setUnavailable] = useState<boolean>(false);
  const [sessionInitFailed, setSessionInitFailed] = useState<boolean>(false);
  const messageIdCounter = useRef<number>(0);

  // addMessage is declared with useCallback so its identity is stable across renders.
  // This is important for the commit-listener registration effect, which captures
  // addMessage in its closure — a stable reference means the listener always has
  // access to the latest setMessages (which is itself stable from useState).
  const addMessage = useCallback(
    (text: string, sender: string, uiResourceUri?: string): void => {
      messageIdCounter.current += 1;
      setMessages((prev) => [
        ...prev,
        { id: messageIdCounter.current, text, sender, uiResourceUri },
      ]);
    },
    [],
  );

  // ── Mount-time session creation ──────────────────────────────────────────────
  // Adapted from the in-page agent pattern established in the codebase:
  //   - outputLanguage: 'en' (Chrome 147 warning suppression)
  //   - responseFormat: INTENT_SCHEMA (schema-constrained JSON dispatch)
  //   - NO tools array (Chrome 147 broken codepath — use responseFormat instead)
  //   - System prompt filters out visibility:['app'] tools (only searchRecipes listed)
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
        console.error('[GenUIChatPanel] Failed to create LanguageModel session:', message);
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

  // ── Mount-time commit-listener registration ───────────────────────────────────
  // Registers a callback with genUITools.setCommitListener so that whenever
  // commitRecipeToPlan.execute resolves (invoked via the iframe→host bridge),
  // the chat appends "Added <recipeTitle> to your meal plan ✓".
  //
  // Does NOT depend on `session` or `messages` — uses the stable `addMessage`
  // from useCallback, which captures the stable `setMessages` from useState.
  useEffect(() => {
    setCommitListener(async (recipeId: string) => {
      const recipe = await getRecipe(recipeId);
      addMessage(`Added ${recipe?.title ?? recipeId} to your meal plan ✓`, 'System');
    });
    return () => {
      setCommitListener(null);
    };
  }, [addMessage]);

  // ── Dispatch loop ─────────────────────────────────────────────────────────────
  // Per-turn handler following the in-page agent pattern with Phase 6 changes:
  //   - MAX_TOOL_ITERATIONS = 5 (fewer iterations needed for /generative-ui)
  //   - No recipeContext prefix (no active recipe concept on /generative-ui)
  //   - visibleTools filter (only tools without visibility:['app'])
  //   - _meta interceptor after tool.execute: strips _meta before next prompt
  const handleUserMessage = async (
    text: string,
    _action: 'Prompt' | 'Translate',
  ): Promise<void> => {
    void _action;
    if (sessionInitFailed || !session) {
      addMessage("Couldn't start the agent. Reload the page or check Chrome built-in AI.", 'Bot');
      return;
    }
    setIsLoading(true);
    addMessage(text, 'User');

    // Build visible tool array at dispatch time (same filter as SYSTEM_PROMPT).
    // Only tools WITHOUT annotations.visibility:['app'] are reachable from chat.
    // `commitRecipeToPlan` with visibility:['app'] is filtered out here.
    const visibleTools = GEN_UI_TOOLS.filter(
      (t) => !t.annotations?.visibility?.includes('app'),
    );

    try {
      let promptText = text;
      let callCount = 0;

      // Dispatch loop: prompt → parse → execute tool → feed result → repeat.
      // Exits when model emits toolName "done" or MAX_TOOL_ITERATIONS is reached.
      while (callCount < MAX_TOOL_ITERATIONS) {
        // GENUI-10 runtime invariant: the string `ui://` MUST NOT appear in any
        // string passed to session.prompt(). The _meta interceptor below ensures
        // this structurally; this assert makes the invariant load-bearing in dev.
        console.assert(!promptText.includes('ui://'), '[GenUIChatPanel] _meta leak — promptText contains ui:// (must be stripped before session.prompt)');

        const rawResponse = await session.prompt(promptText);

        const parsed = extractJsonFromResponse(rawResponse);

        if (!parsed) {
          // Could not extract JSON — surface the raw response as a plain reply and stop.
          addMessage(rawResponse || "Sorry, I couldn't generate a response.", 'Bot');
          break;
        }

        const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'done';

        if (toolName === 'done') {
          // Model has finished tool calls — show conversational reply.
          const reply =
            typeof parsed.reply === 'string' && parsed.reply.length > 0
              ? parsed.reply
              : "Done. Let me know if you'd like anything else.";
          addMessage(reply, 'Bot');
          break;
        }

        // Lookup tool in VISIBLE tools only. Tools with visibility:['app'] are
        // intentionally unreachable — the loop's "not registered" branch fires if
        // the model hallucinates a hidden tool name (T-06-08, T-06-09).
        const tool = visibleTools.find((t) => t.name === toolName);
        if (!tool) {
          promptText = `Tool "${toolName}" is not registered. Available tools: ${visibleTools.map((t) => t.name).join(', ')}. Please call a valid tool or emit { "toolName": "done" }.`;
          callCount++;
          continue;
        }

        const args = (
          parsed.args !== null &&
          typeof parsed.args === 'object' &&
          !Array.isArray(parsed.args)
            ? parsed.args
            : {}
        ) as Record<string, unknown>;

        const result = await tool.execute(args);

        // ── _meta interceptor — GENUI-10 invariant enforcement ─────────────────
        // After tool.execute(), inspect the result for _meta['ui.resourceUri'].
        // If present:
        //   a) Append a Message with uiResourceUri (renders the iframe bubble in ChatBox)
        //   b) Build toolResultForModel WITHOUT _meta — only { content } is fed back
        // This ensures the literal `ui://` NEVER appears in any string passed to
        // session.prompt().

        let toolResultForModel: string;

        // Narrow result to a structured object (behind runtime type check; cast is local/bounded).
        const resultObj =
          result !== null && typeof result === 'object' && !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : null;

        const meta = resultObj?._meta as Record<string, unknown> | undefined;

        // Only treat as a string value — guard against non-string values in _meta.
        const uiResourceUri =
          typeof meta?.['ui.resourceUri'] === 'string'
            ? (meta['ui.resourceUri'] as string)
            : undefined;

        if (uiResourceUri !== undefined) {
          // Extract caption from content[0].text, fallback to 'Recipes'.
          const captionText =
            (resultObj?.content as Array<{ text?: string }> | undefined)?.[0]?.text ?? 'Recipes';

          // Append the iframe-carousel bubble to the transcript.
          // ChatBox renders a UIResourceFrame when message.uiResourceUri is set.
          addMessage(captionText, 'Bot', uiResourceUri);

          // Feed back ONLY { content } to the model — _meta is intentionally stripped.
          // This is the GENUI-10 invariant: ui:// NEVER appears in session.prompt() input.
          toolResultForModel = JSON.stringify({ content: resultObj?.content });
        } else {
          // No ui.resourceUri — plain text or JSON result, safe to pass back as-is.
          toolResultForModel =
            typeof result === 'string' ? result : JSON.stringify(result);
        }

        promptText = `Tool "${toolName}" result: ${toolResultForModel}. Now decide: call the next tool or emit { "toolName": "done", "reply": "..." }.`;
        callCount++;
      }

      if (callCount >= MAX_TOOL_ITERATIONS) {
        addMessage('Reached the maximum number of tool calls for this request.', 'Bot');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GenUIChatPanel] Error in agent loop:', message);
      addMessage("Sorry, I couldn't generate a response. Try rephrasing your request.", 'Bot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 h-full min-h-[60vh] lg:min-h-[600px] flex flex-col">
      <div className="flex flex-col gap-3 h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatBox messages={messages} />
        </div>
        {unavailable && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {"Chrome's built-in LanguageModel isn't available. Enable AI features in chrome://flags and reload."}
          </p>
        )}
        <ChatInput
          onSend={handleUserMessage}
          disabled={isLoading || unavailable || (!session && !sessionInitFailed)}
        />
      </div>
    </div>
  );
};
