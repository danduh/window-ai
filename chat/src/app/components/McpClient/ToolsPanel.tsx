import React, { useState } from 'react';
import type { ToolsPanelProps } from './types';
import type { McpToolInfo } from '../../services/McpClientService';

/**
 * ToolsPanel — one row per discovered tool: an enable/disable checkbox (bound to
 * the parent's `selected` set), the tool name + description, an expandable
 * pretty-printed inputSchema, and a "Run manually" control (JSON args textarea +
 * Call button) that invokes onCallManually and shows the returned string or any
 * parse / call error. This satisfies the "check tools" requirement.
 *
 * Contract frozen in ./types.ts — ToolsPanelProps.
 */

type CallState = {
  args: string;
  running: boolean;
  result: string | null;
  error: string | null;
};

const emptyCall = (): CallState => ({
  args: '{}',
  running: false,
  result: null,
  error: null,
});

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  tools,
  selected,
  onToggle,
  onCallManually,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [calls, setCalls] = useState<Record<string, CallState>>({});

  const allSelected = tools.length > 0 && tools.every((t) => selected.has(t.name));

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const setCall = (name: string, patch: Partial<CallState>) => {
    setCalls((prev) => ({ ...prev, [name]: { ...(prev[name] ?? emptyCall()), ...patch } }));
  };

  const selectAllOrNone = () => {
    if (allSelected) {
      // deselect only the ones currently selected
      tools.forEach((t) => selected.has(t.name) && onToggle(t.name));
    } else {
      tools.forEach((t) => !selected.has(t.name) && onToggle(t.name));
    }
  };

  const runTool = async (tool: McpToolInfo) => {
    const current = calls[tool.name] ?? emptyCall();
    let parsed: Record<string, unknown>;
    try {
      const raw = current.args.trim() === '' ? '{}' : current.args;
      const value: unknown = JSON.parse(raw);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Arguments must be a JSON object, e.g. { "key": "value" }.');
      }
      parsed = value as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON';
      setCall(tool.name, { error: `Invalid arguments: ${message}`, result: null });
      return;
    }

    setCall(tool.name, { running: true, error: null, result: null });
    try {
      const result = await onCallManually(tool.name, parsed);
      setCall(tool.name, { running: false, result, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool call failed';
      setCall(tool.name, { running: false, error: message, result: null });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tools{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({selected.size} of {tools.length} enabled)
          </span>
        </h2>
        {tools.length > 0 && (
          <button
            type="button"
            onClick={selectAllOrNone}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {tools.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          This server exposed no tools.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tools.map((tool) => {
            const isSelected = selected.has(tool.name);
            const isOpen = expanded.has(tool.name);
            const call = calls[tool.name] ?? emptyCall();
            const schemaJson = JSON.stringify(tool.inputSchema, null, 2);

            return (
              <li
                key={tool.name}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <input
                    id={`tool-${tool.name}`}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(tool.name)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`tool-${tool.name}`}
                      className="cursor-pointer font-mono text-sm font-semibold text-gray-900 dark:text-white break-words"
                    >
                      {tool.name}
                    </label>
                    {tool.description && (
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 break-words">
                        {tool.description}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(tool.name)}
                      className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? 'Hide schema & run' : 'Show schema & run'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Input schema
                      </p>
                      <pre className="overflow-x-auto rounded-md bg-gray-100 dark:bg-gray-950 p-3 text-xs text-gray-800 dark:text-gray-200">
                        <code>{schemaJson}</code>
                      </pre>
                    </div>

                    <div>
                      <label
                        htmlFor={`args-${tool.name}`}
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        Run manually — JSON arguments
                      </label>
                      <textarea
                        id={`args-${tool.name}`}
                        value={call.args}
                        onChange={(e) => setCall(tool.name, { args: e.target.value })}
                        rows={3}
                        spellCheck={false}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 font-mono text-xs text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => runTool(tool)}
                          disabled={call.running}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
                        >
                          {call.running && (
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          )}
                          {call.running ? 'Calling…' : 'Call'}
                        </button>
                      </div>
                    </div>

                    {call.error && (
                      <div className="rounded-md border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-3">
                        <p className="break-words text-xs text-red-700 dark:text-red-300">
                          {call.error}
                        </p>
                      </div>
                    )}

                    {call.result !== null && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Result
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-gray-100 dark:bg-gray-950 p-3 text-xs text-gray-800 dark:text-gray-200">
                          <code>{call.result}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ToolsPanel;
