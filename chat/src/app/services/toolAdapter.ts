// Adapter from the WebMCP `ModelContextTool` shape to the LanguageModel
// `tools[]` shape, plus a parallel wrapper that adds tool-call lifecycle
// events without converting the type. Pure TS — no React, no DOM.
//
// Both wrappers feed the same `onEvent(ToolCallEvent)` callback so the
// UI's ToolCallIndicator fires for BOTH consumers (in-page agent + external
// WebMCP agent).
//
// Source: 02-RESEARCH.md §Pattern 2 (lines 251-290); ambient types from
// chat/src/app/types/webmcp.d.ts and chat/src/app/types/dom-chromium-ai.d.ts.

/** Tool-call lifecycle event emitted to the UI as the call progresses. */
export type ToolCallEvent =
  | { kind: 'pending'; toolName: string; args: Record<string, unknown> }
  | { kind: 'done'; toolName: string }
  | { kind: 'error'; toolName: string; message: string };

/**
 * Structural alias for one element of `LanguageModelCreateOptions['tools']`.
 *
 * The plan's preferred form was `NonNullable<LanguageModelCreateOptions['tools']>[number]`,
 * but `LanguageModelCreateOptions` is declared inside a `declare global { ... }`
 * block in a script-mode file (chat/src/app/types/dom-chromium-ai.d.ts has no
 * top-level export), so the named interface is not visible to consumers via the
 * indexed-access form. Mirroring the structural shape from dom-chromium-ai.d.ts:22-27
 * with strict typing avoids redeclaring the named ambient type while still pinning
 * the wrapper output to the same contract LanguageModel.create enforces at runtime
 * (.execute MUST return Promise<string>).
 */
type LanguageModelTool = {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: Record<string, unknown>) => Promise<string>;
};

/**
 * Convert WebMCP tools into the shape LanguageModel.create({tools}) expects.
 * Wraps each `execute` so that:
 *   - a `pending` event fires before the handler runs,
 *   - the result is JSON.stringify-ed (LanguageModel handlers must return
 *     Promise<string> per dom-chromium-ai.d.ts:26),
 *   - a `done` event fires on success, OR an `error` event fires + the wrapper
 *     returns `JSON.stringify({error: message})` so the model can read and
 *     explain the failure (does NOT re-throw — the model needs to recover).
 */
export function toLanguageModelTools(
  tools: ModelContextTool[],
  onEvent: (e: ToolCallEvent) => void,
): LanguageModelTool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
    execute: async (input: Record<string, unknown>): Promise<string> => {
      onEvent({ kind: 'pending', toolName: t.name, args: input ?? {} });
      try {
        const result = await t.execute(input);
        onEvent({ kind: 'done', toolName: t.name });
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        onEvent({ kind: 'error', toolName: t.name, message });
        return JSON.stringify({ error: message });
      }
    },
  }));
}

/**
 * Same lifecycle-event wrapping as toLanguageModelTools, but returns
 * ModelContextTool[] (no stringification — WebMCP's `execute` is typed
 * `Promise<unknown> | unknown` per webmcp.d.ts:38). Used when registering
 * with `navigator.modelContext.registerTool` so external-agent calls also
 * fire the UI indicator.
 */
export function wrapToolsWithEvents(
  tools: ModelContextTool[],
  onEvent: (e: ToolCallEvent) => void,
): ModelContextTool[] {
  return tools.map((t) => ({
    ...t,
    execute: async (input: Record<string, unknown>): Promise<unknown> => {
      onEvent({ kind: 'pending', toolName: t.name, args: input ?? {} });
      try {
        const result = await t.execute(input);
        onEvent({ kind: 'done', toolName: t.name });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        onEvent({ kind: 'error', toolName: t.name, message });
        // Return an error payload instead of re-throwing — keeps the external
        // agent's protocol intact and matches toLanguageModelTools' shape.
        return { error: message };
      }
    },
  }));
}
