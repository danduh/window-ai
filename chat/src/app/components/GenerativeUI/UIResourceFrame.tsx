// UIResourceFrame — React component owning the outer iframe DOM, bridge lifecycle,
// loading/error/ready state machine, theme propagation, and height sync.
//
// Source: 05-CONTEXT.md (Sandbox + iframe rendering strategy, JSON-RPC bridge protocol,
// Theme propagation), 05-RESEARCH.md (Pattern 4 UIResourceFrame state machine,
// Pattern 8 Theme propagation wiring, Pattern 9 Pre-load outbound queue,
// Pitfall 4 ThemeContext re-renders, Pitfall 5 navigator.modelContext unavailable).

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { createUIResourceBridge } from './iframe/bridge';
import { GEN_UI_TOOLS } from '../../services/genUITools';

// ── Props ─────────────────────────────────────────────────────────────────────

interface UIResourceFrameProps {
  /** Complete srcdoc HTML (result of renderCarouselHTML(recipes)). */
  html: string;
  /** Tool registry — defaults to GEN_UI_TOOLS if not provided. */
  tools?: ModelContextTool[];
}

// ── Locked host constants (05-CONTEXT.md host_constants) ─────────────────────

const HOST_INFO = {
  name: 'window-ai-generative-ui',
  version: '1.1.0',
  mcpVersion: '2026-01-26',
} as const;

const INITIAL_IFRAME_HEIGHT = 320; // px — locked default (initial iframe height = 320px)
const MAX_WIDTH = 672; // px — max-w-2xl
const MAX_HEIGHT = 800; // px — soft cap

// ── Component ─────────────────────────────────────────────────────────────────

export const UIResourceFrame: React.FC<UIResourceFrameProps> = ({
  html,
  tools,
}) => {
  const { theme } = useTheme();

  // State machine: mounting → ready | error
  const [frameState, setFrameState] = useState<'mounting' | 'ready' | 'error'>(
    'mounting',
  );
  // Increment to force iframe DOM destruction + recreation on retry
  const [iframeKey, setIframeKey] = useState(0);
  // Dynamic height driven by ui/notifications/size-changed from iframe
  const [iframeHeight, setIframeHeight] = useState(INITIAL_IFRAME_HEIGHT);

  const outerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<ReturnType<typeof createUIResourceBridge> | null>(
    null,
  );

  // ── Retry handler — destroys + recreates the iframe via key bump ─────────────
  const handleRetry = () => {
    setFrameState('mounting');
    setIframeKey((k) => k + 1);
  };

  // ── PRIMARY EFFECT — bridge instantiation + window message listener ───────────
  // Deps: [iframeKey, html] — theme is intentionally excluded (handled by THEME EFFECT)
  useEffect(() => {
    const iframe = outerIframeRef.current;
    if (!iframe) return;

    const bridge = createUIResourceBridge({
      outerIframe: iframe,
      tools: tools ?? GEN_UI_TOOLS,
      hostInfo: HOST_INFO,
      initialHostContext: {
        theme,
        displayMode: 'inline',
        dimensions: { maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT },
      },
      handshakeTimeoutMs: 1000,
      requestTimeoutMs: 5000,
      onHandshakeComplete: () => setFrameState('ready'),
      onHandshakeTimeout: () => setFrameState('error'),
      onSizeChanged: (h) => setIframeHeight(h),
      onLog: (tag, msg, data) =>
        console.debug(`[mcp-apps:${tag}]`, msg, data ?? ''),
    });

    bridgeRef.current = bridge;
    bridge.attachLoadListener();

    const onMessage = (e: MessageEvent) => bridge.handleMessage(e);
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
      bridge.destroy();
      bridgeRef.current = null;
    };
  }, [iframeKey, html]);

  // ── THEME EFFECT — propagate theme changes to the mounted iframe ──────────────
  // Deps: [theme] only — bridgeRef is accessed by ref (not as dep, per Pitfall 4)
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    bridge.sendHostContextChanged({ theme, displayMode: 'inline' });
  }, [theme]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full overflow-hidden rounded-xl">
      {/* Loading skeleton — visible while handshake is in progress */}
      {frameState === 'mounting' && (
        <div
          aria-label="Loading recipe carousel…"
          className="h-[200px] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
        />
      )}

      {/* Error card — visible when handshake timed out */}
      {frameState === 'error' && (
        <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {"Couldn't load app"}
          </p>
          <p className="text-sm text-red-600 dark:text-red-300">
            {"The recipe carousel didn't respond in time. This can happen if WebMCP isn't enabled in your browser."}
          </p>
          <button
            className="self-start px-3 py-1.5 text-sm font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      )}

      {/* Outer iframe — always mounted (keeps ref stable); hidden until ready */}
      <iframe
        key={iframeKey}
        ref={outerIframeRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={html}
        title="Recipe carousel"
        className="w-full border-0 block"
        style={{
          display: frameState === 'ready' ? 'block' : 'none',
          height: `${iframeHeight}px`,
        }}
      />
    </div>
  );
};
