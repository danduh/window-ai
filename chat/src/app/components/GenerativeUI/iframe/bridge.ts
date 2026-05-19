// JSON-RPC 2.0 types + host-side bridge factory for the MCP Apps sandboxed iframe.
//
// Source: 05-CONTEXT.md (Sandbox + iframe rendering strategy, JSON-RPC bridge protocol),
// 05-RESEARCH.md (Pattern 3 JSON-RPC types, Pattern 9 pre-load outbound queue,
// Implementation Guide bridge.ts Host-Side Class, "tools/call proxy handler" code example).
//
// Design: factory function (not class) to avoid `this` binding issues when the React
// component calls handleMessage from a window listener. All state lives in closures.
// No React imports — pure TS, framework-free.

// ── Core JSON-RPC 2.0 types ──────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  // No 'id' field — distinguishes from request
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ── MCP Apps / SEP-1865 message shapes ───────────────────────────────────────

// iframe → host request (ui/initialize)
export interface UIInitializeParams {
  protocolVersion: string; // '2026-01-26'
  clientInfo: { name: string; version: string };
  appCapabilities?: {
    availableDisplayModes?: string[];
    tools?: { listChanged?: boolean };
  };
}

// host → iframe response to ui/initialize
export interface UIInitializeResult {
  protocolVersion: string; // '2026-01-26'
  hostInfo: HostInfo;
  hostContext: HostContext;
  hostCapabilities?: Record<string, unknown>;
}

export interface HostInfo {
  name: string; // e.g. 'window-ai-generative-ui'
  version: string; // e.g. '1.1.0'
  mcpVersion: string; // '2026-01-26'
}

export interface HostContext {
  theme: 'dark' | 'light';
  displayMode: 'inline';
  dimensions: {
    maxWidth: number;
    maxHeight: number;
  };
}

// host → iframe notification (theme change)
export interface HostContextChangedParams {
  theme: 'dark' | 'light';
  displayMode?: 'inline';
  containerDimensions?: { width: number; maxHeight: number };
}

// iframe → host notification (height sync)
export interface SizeChangedParams {
  height: number;
  width?: number;
}

// iframe → host request (tool proxy)
export interface ToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// host → iframe response to tools/call
export interface ToolsCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

// Standard JSON-RPC error codes
// Source: 05-RESEARCH.md Pattern 3 error codes table
export const RPC_ERROR = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_ERROR: -32000,
  DENIED: -32000, // user denied
} as const;

// ── createUIResourceBridge factory ───────────────────────────────────────────

export interface UIResourceBridgeOptions {
  /** Owner-supplied DOM element for the outer iframe. */
  outerIframe: HTMLIFrameElement;
  /** Resolved tool registry (per 05-RESEARCH.md Open Q3 — caller passes GEN_UI_TOOLS). */
  tools: ModelContextTool[];
  /** { name, version, mcpVersion: '2026-01-26' } */
  hostInfo: HostInfo;
  /** { theme, displayMode: 'inline', dimensions } */
  initialHostContext: HostContext;
  /** Milliseconds to wait for ui/initialize from the iframe after load. Default 1000. */
  handshakeTimeoutMs?: number;
  /** Milliseconds to wait for a tool execute response. Default 5000. */
  requestTimeoutMs?: number;
  /** Fires when ui/notifications/initialized is received (handshake complete). */
  onHandshakeComplete?: () => void;
  /** Fires after handshakeTimeoutMs if handshake was not completed. */
  onHandshakeTimeout?: () => void;
  /** Called with the new height px value when ui/notifications/size-changed is received. */
  onSizeChanged?: (height: number) => void;
  /** Debug logger. tag: 'host' for outbound, 'iframe' for inbound, 'relay' for relay events. */
  onLog?: (tag: 'host' | 'iframe' | 'relay', msg: string, data?: unknown) => void;
}

export interface UIResourceBridge {
  /**
   * Wire the 'load' event on outerIframe. Must be called AFTER assigning srcdoc.
   * Sets iframeLoaded=true on fire, flushes pendingOutbound FIFO, starts 1000ms handshake timer.
   */
  attachLoadListener(): void;
  /**
   * Route inbound MessageEvent to the bridge. Call this from the component's
   * window 'message' listener. The factory does NOT register its own window listener
   * (avoids leaking in React StrictMode double-mount).
   */
  handleMessage(event: MessageEvent): void;
  /**
   * Queue or send ui/notifications/host-context-changed to the iframe.
   * If the iframe is not loaded yet, pushes to pendingOutbound.
   */
  sendHostContextChanged(params: HostContextChangedParams): void;
  /**
   * Clean up: set destroyed=true, clear handshakeTimer, reject in-flight pending requests,
   * empty queue. Idempotent.
   */
  destroy(): void;
}

/**
 * Factory that returns a stateful host-side bridge object.
 * Pure TS — no React, no DOM mutation outside outerIframe.contentWindow.postMessage.
 */
export function createUIResourceBridge(opts: UIResourceBridgeOptions): UIResourceBridge {
  const {
    outerIframe,
    tools,
    hostInfo,
    initialHostContext,
    handshakeTimeoutMs = 1000,
    requestTimeoutMs = 5000,
    onHandshakeComplete,
    onHandshakeTimeout,
    onSizeChanged,
    onLog,
  } = opts;

  // ── Internal state (closures) ─────────────────────────────────────────────
  const pendingOutbound: unknown[] = [];
  let iframeLoaded = false;
  type PendingRequest = {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  const pendingRequests = new Map<string | number, PendingRequest>();
  let handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let loadListenerAttached = false;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function postToOuter(msg: unknown): void {
    outerIframe.contentWindow?.postMessage(msg, '*');
  }

  function queueOrSend(msg: unknown): void {
    if (!iframeLoaded) {
      pendingOutbound.push(msg);
    } else {
      postToOuter(msg);
    }
  }

  function flushQueue(): void {
    while (pendingOutbound.length > 0) {
      const msg = pendingOutbound.shift();
      postToOuter(msg);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function attachLoadListener(): void {
    if (loadListenerAttached || destroyed) return;
    loadListenerAttached = true;

    outerIframe.addEventListener(
      'load',
      () => {
        if (destroyed) return;
        iframeLoaded = true;
        // Flush pre-load outbound queue FIFO (05-RESEARCH.md Pattern 9)
        flushQueue();
        // Start 1000ms handshake timer (05-CONTEXT.md Handshake protocol)
        handshakeTimer = setTimeout(() => {
          handshakeTimer = null;
          if (!destroyed) {
            // onLog is dev-only — production builds skip logging entirely (07-CONTEXT.md Polish items).
            if (import.meta.env.DEV) onLog?.('host', 'handshake timeout', { handshakeTimeoutMs });
            onHandshakeTimeout?.();
          }
        }, handshakeTimeoutMs);
        if (import.meta.env.DEV) onLog?.('host', 'iframe loaded, queue flushed, handshake timer started', {
          pendingFlushed: pendingOutbound.length,
        });
      },
      { once: true },
    );
  }

  function handleMessage(event: MessageEvent): void {
    if (destroyed) return;

    // GUARD: only accept messages from the outer iframe (05-RESEARCH.md Anti-Patterns)
    // event.origin is "null" for sandboxed srcdoc iframes — use source equality check.
    // event.source === outerIframe.contentWindow is the canonical guard per CONTEXT.md.
    if (!(event.source === outerIframe.contentWindow)) return;

    const data = event.data as Record<string, unknown>;
    if (!data || data['jsonrpc'] !== '2.0') return;

    const method = data['method'] as string | undefined;
    const id = data['id'] as string | number | undefined;
    const params = data['params'] as Record<string, unknown> | undefined;

    // Distinguish: response (has id, no method), request (has id and method), notification (method, no id)
    const isResponse = id !== undefined && method === undefined;
    const isRequest = id !== undefined && method !== undefined;
    const isNotification = id === undefined && method !== undefined;

    if (isResponse) {
      // Match to pending outbound request
      const pending = pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(id);
        if (data['error']) {
          const err = data['error'] as { message?: string };
          pending.reject(new Error(err.message ?? 'RPC error'));
        } else {
          pending.resolve(data['result']);
        }
      }
      return;
    }

    if (isRequest && method) {
      if (import.meta.env.DEV) onLog?.('iframe', method, data);
      handleInboundRequest(method, id as string | number, params ?? {});
      return;
    }

    if (isNotification && method) {
      if (import.meta.env.DEV) onLog?.('iframe', method, data);
      handleInboundNotification(method, params ?? {});
      return;
    }
  }

  function handleInboundRequest(
    method: string,
    id: string | number,
    params: Record<string, unknown>,
  ): void {
    if (method === 'ui/initialize') {
      // Respond with hostInfo + hostContext (05-CONTEXT.md Handshake protocol)
      const result: UIInitializeResult = {
        protocolVersion: '2026-01-26',
        hostInfo,
        hostContext: initialHostContext,
      };
      const response = { jsonrpc: '2.0', id, result };
      if (import.meta.env.DEV) onLog?.('host', 'ui/initialize response', response);
      postToOuter(response);
      return;
    }

    if (method === 'tools/call') {
      const callParams = params as unknown as ToolsCallParams;
      const tool = tools.find((t) => t.name === callParams.name);
      if (!tool) {
        const errorResponse = {
          jsonrpc: '2.0',
          id,
          error: {
            code: RPC_ERROR.METHOD_NOT_FOUND,
            message: `Unknown tool: ${callParams.name}`,
          },
        };
        if (import.meta.env.DEV) onLog?.('host', 'tools/call error (not found)', errorResponse);
        postToOuter(errorResponse);
        return;
      }
      // Async: execute the tool and post response when done
      Promise.resolve()
        .then(() => tool.execute(callParams.arguments ?? {}))
        .then((result) => {
          const response = { jsonrpc: '2.0', id, result };
          if (import.meta.env.DEV) onLog?.('host', 'tools/call success', response);
          postToOuter(response);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Tool execution failed';
          const errorResponse = {
            jsonrpc: '2.0',
            id,
            error: { code: RPC_ERROR.TOOL_ERROR, message },
          };
          if (import.meta.env.DEV) onLog?.('host', 'tools/call error (execute threw)', errorResponse);
          postToOuter(errorResponse);
        });

      // Set request timeout
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        const timeoutError = {
          jsonrpc: '2.0',
          id,
          error: { code: RPC_ERROR.INTERNAL_ERROR, message: 'tools/call timed out' },
        };
        postToOuter(timeoutError);
      }, requestTimeoutMs);
      // Store in pendingRequests so destroy() can reject it
      pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timer);
        },
        reject: () => {
          clearTimeout(timer);
        },
        timer,
      });
      return;
    }

    // Unknown method
    const errorResponse = {
      jsonrpc: '2.0',
      id,
      error: { code: RPC_ERROR.METHOD_NOT_FOUND, message: `Method not found: ${method}` },
    };
    if (import.meta.env.DEV) onLog?.('host', `unknown request method: ${method}`, errorResponse);
    postToOuter(errorResponse);
  }

  function handleInboundNotification(method: string, params: Record<string, unknown>): void {
    if (method === 'ui/notifications/initialized') {
      // Clear handshake timer — handshake complete
      if (handshakeTimer !== null) {
        clearTimeout(handshakeTimer);
        handshakeTimer = null;
      }
      if (import.meta.env.DEV) onLog?.('host', 'handshake complete (ui/notifications/initialized received)', {});
      onHandshakeComplete?.();
      return;
    }

    if (method === 'ui/notifications/size-changed') {
      const sizeParams = params as unknown as SizeChangedParams;
      if (import.meta.env.DEV) onLog?.('host', 'size-changed', sizeParams);
      onSizeChanged?.(sizeParams.height);
      return;
    }

    // Unrecognized notifications are silently ignored (per JSON-RPC 2.0 spec)
    if (import.meta.env.DEV) onLog?.('host', `unrecognized notification: ${method}`, params);
  }

  function sendHostContextChanged(params: HostContextChangedParams): void {
    if (destroyed) return;
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'ui/notifications/host-context-changed',
      params,
    };
    if (import.meta.env.DEV) onLog?.('host', 'sending host-context-changed', notification);
    queueOrSend(notification);
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    if (handshakeTimer !== null) {
      clearTimeout(handshakeTimer);
      handshakeTimer = null;
    }

    // Reject all in-flight pending requests
    pendingRequests.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(new Error('bridge destroyed'));
    });
    pendingRequests.clear();

    // Empty pre-load queue
    pendingOutbound.length = 0;
  }

  return {
    attachLoadListener,
    handleMessage,
    sendHostContextChanged,
    destroy,
  };
}
