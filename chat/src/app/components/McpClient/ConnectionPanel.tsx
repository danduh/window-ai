import React, { useState } from 'react';
import type { ConnectionPanelProps, McpStatus } from './types';

/**
 * ConnectionPanel — URL + optional bearer-token form with Connect/Disconnect
 * controls, a live status pill, and (when connected) a server-info summary.
 *
 * SECURITY: the bearer token lives ONLY in this input's local state; it is
 * handed to the parent's onConnect and never logged, echoed, or persisted.
 *
 * Browser → remote MCP is CORS-gated: the server must allow this origin (and the
 * Authorization / Mcp-Session-Id headers). connect() rejects with a network /
 * TypeError when CORS blocks it — surfaced here with a CORS hint.
 *
 * Contract frozen in ./types.ts — ConnectionPanelProps.
 */

const STATUS_META: Record<
  McpStatus,
  { label: string; dot: string; pill: string }
> = {
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-gray-400 dark:bg-gray-500',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
  connecting: {
    label: 'Connecting…',
    dot: 'bg-amber-400 animate-pulse',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  error: {
    label: 'Error',
    dot: 'bg-red-500',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

const DEFAULT_URL = 'http://localhost:9339/mcp';

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  status,
  connection,
  error,
  authUrls = [],
  onConnect,
  onDisconnect,
}) => {
  const [url, setUrl] = useState(DEFAULT_URL);
  // SECURITY: token stays in local state only; never logged or persisted.
  const [token, setToken] = useState('');

  const isConnecting = status === 'connecting';
  const isConnected = status === 'connected';
  const meta = STATUS_META[status];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    if (isConnected) {
      onDisconnect();
    } else {
      onConnect(url.trim(), token);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connection</h2>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${meta.pill}`}
          role="status"
          aria-live="polite"
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="mcp-url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Server URL
          </label>
          <input
            id="mcp-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isConnected || isConnecting}
            placeholder={DEFAULT_URL}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="mcp-token"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Bearer token{' '}
            <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          <input
            id="mcp-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isConnected || isConnecting}
            placeholder="Sent as Authorization: Bearer …"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isConnecting}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-70 ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          }`}
        >
          {isConnecting && (
            <svg
              className="h-4 w-4 animate-spin"
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
          {isConnecting ? 'Connecting…' : isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </form>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Browser → MCP requires a CORS-enabled server: it must allow this origin and the
        Authorization / Mcp-Session-Id headers.
      </p>

      {status === 'error' && error && (
        <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
          <p className="mt-1 break-words text-sm text-red-700 dark:text-red-300/90">{error}</p>

          {authUrls.length > 0 ? (
            /* OAuth-required: offer to open the server's authorize URL(s). */
            <div className="mt-3">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                This server requires OAuth authorization. Open it, complete the flow, then
                paste the resulting access token above and Connect again.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {authUrls.map((u, i) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    Open authorization{authUrls.length > 1 ? ` #${i + 1}` : ''} ↗
                  </a>
                ))}
              </div>
            </div>
          ) : /session\s*id/i.test(error) ? (
            /* Streamable-HTTP session lost: almost always a CORS expose-headers gap. */
            <p className="mt-2 text-xs text-red-600 dark:text-red-400/80">
              &ldquo;Missing session ID&rdquo; usually means the server sets
              <code className="mx-1 rounded bg-red-100 dark:bg-red-900/40 px-1 py-0.5 font-mono">
                Mcp-Session-Id
              </code>
              on <em>initialize</em> but doesn&apos;t list it in
              <code className="mx-1 rounded bg-red-100 dark:bg-red-900/40 px-1 py-0.5 font-mono">
                Access-Control-Expose-Headers
              </code>
              , so the browser can&apos;t read it and later requests drop it. That&apos;s a
              server-side CORS fix.
            </p>
          ) : (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400/80">
              This is often a CORS problem — the server must send
              <code className="mx-1 rounded bg-red-100 dark:bg-red-900/40 px-1 py-0.5 font-mono">
                Access-Control-Allow-Origin
              </code>
              for this page&apos;s origin. Also check the URL, the bearer token, and that the
              endpoint speaks Streamable HTTP MCP.
            </p>
          )}
        </div>
      )}

      {isConnected && connection && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-2">
              <dt className="font-medium text-gray-500 dark:text-gray-400">Server</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {connection.serverName}
                {connection.serverVersion && (
                  <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                    v{connection.serverVersion}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="font-medium text-gray-500 dark:text-gray-400">Capabilities</dt>
              <dd className="flex flex-wrap gap-1.5">
                {connection.capabilities.length > 0 ? (
                  connection.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-md bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                    >
                      {cap}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">none reported</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <dt className="font-medium text-gray-500 dark:text-gray-400">Tools</dt>
              <dd className="text-gray-900 dark:text-white">{connection.tools.length}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;
