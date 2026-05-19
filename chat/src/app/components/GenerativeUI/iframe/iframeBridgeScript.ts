// Iframe-side bridge scripts exported as string templates.
//
// Source: 05-CONTEXT.md (Sandbox + iframe rendering strategy, Theme propagation),
// 05-RESEARCH.md (Pattern 2 Double-iframe HTML structure, Pattern 5 ResizeObserver script,
// Pattern 6 Handshake from inner iframe, Security Domain).
//
// These are plain JS strings (NOT compiled TypeScript). They run in null-origin
// srcdoc contexts with no ES module support. Syntax: ES2017+, IIFEs, no imports.

/**
 * The OUTER iframe's srcdoc document.
 *
 * Contains a shell HTML that:
 * 1. Creates the inner iframe with sandbox="allow-scripts" only (NO allow-same-origin)
 *    and a placeholder __INNER_SRCDOC__ for carouselTemplate.ts to substitute.
 * 2. Relays messages bidirectionally between inner iframe and window.parent (React host):
 *    - inner→host: event.source === inner.contentWindow → window.parent.postMessage
 *    - host→inner: event.source === window.parent → inner.contentWindow.postMessage
 *    Mutually exclusive by source — no echo loop (05-RESEARCH.md "Relay echo problem").
 *
 * Source: 05-RESEARCH.md Pattern 2 Double-iframe HTML structure.
 */
export const outerShellHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; }
    iframe { width: 100%; border: 0; display: block; height: 100%; }
  </style>
</head>
<body>
<iframe id="inner"
  sandbox="allow-scripts"
  srcdoc="__INNER_SRCDOC__"
></iframe>
<script>
(function() {
  var inner = document.getElementById('inner');

  // Relay: inner iframe → React host
  // inner.contentWindow posts to its window.parent (outer shell),
  // outer shell relays to ITS parent (React host).
  window.addEventListener('message', function(event) {
    if (event.source !== inner.contentWindow) return;
    // Side effect: when the inner iframe reports its content size, ALSO grow the
    // inner iframe element so its content isn't clipped. User-agent default is
    // ~150-200px which clipped the carousel until this was added.
    try {
      var data = event.data;
      if (data && data.method === 'ui/notifications/size-changed' && data.params && typeof data.params.height === 'number') {
        inner.style.height = data.params.height + 'px';
      }
    } catch (_) { /* ignore malformed */ }
    window.parent.postMessage(event.data, '*');
  });

  // Relay: React host → inner iframe
  // React host posts to outerIframe.contentWindow (outer shell);
  // outer shell forwards down to inner.contentWindow.
  window.addEventListener('message', function(event) {
    if (event.source === window.parent) {
      inner.contentWindow.postMessage(event.data, '*');
    }
  });
})();
</script>
</body>
</html>`;

/**
 * The INNER iframe's inline bridge script.
 *
 * Handles:
 * - ui/initialize request (sent on DOMContentLoaded or immediately if ready)
 * - ui/notifications/initialized notification (sent after ui/initialize response)
 * - ui/notifications/host-context-changed: applies data-theme to <html>
 * - ui/notifications/size-changed: ResizeObserver on document.documentElement (50ms debounce)
 * - tools/call: delegated click handler on .pick-btn[data-recipe-id] buttons
 *
 * All message communication uses window.parent (= outer shell), which relays to the React host.
 *
 * Source: 05-RESEARCH.md Pattern 5 (ResizeObserver), Pattern 6 (handshake/request correlator).
 */
export const innerIframeBridgeScript = `(function() {
  var pendingIframeRequests = {};
  var nextId = 1;
  // DEV gate for iframe-side debug logging. Stays false in production (this script ships
  // pre-stringified inside <script> tags; Vite cannot tree-shake it). Toggle manually
  // during iframe debugging if needed.
  var DEV = false;
  function debug() { if (DEV) console.debug.apply(console, arguments); }

  function sendRequest(method, params) {
    var id = nextId++;
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        delete pendingIframeRequests[id];
        reject(new Error('timeout'));
      }, 5000);
      pendingIframeRequests[id] = { resolve: resolve, reject: reject, timer: timer };
      var msg = { jsonrpc: '2.0', id: id, method: method, params: params };
      debug('[mcp-apps:iframe]', method, msg);
      window.parent.postMessage(msg, '*');
    });
  }

  function sendNotification(method, params) {
    var msg = { jsonrpc: '2.0', method: method, params: params };
    debug('[mcp-apps:iframe]', method, msg);
    window.parent.postMessage(msg, '*');
  }

  // Inbound message listener: handles responses and host notifications
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || data.jsonrpc !== '2.0') return;
    debug('[mcp-apps:iframe]', 'inbound', data);

    // Response to a pending request
    if (data.id !== undefined && pendingIframeRequests[data.id]) {
      var pending = pendingIframeRequests[data.id];
      clearTimeout(pending.timer);
      delete pendingIframeRequests[data.id];
      if (data.error) {
        pending.reject(new Error(data.error.message || 'RPC error'));
      } else {
        pending.resolve(data.result);
      }
      return;
    }

    // Host notification: theme change
    if (data.method === 'ui/notifications/host-context-changed' && data.params) {
      document.documentElement.setAttribute('data-theme', data.params.theme || 'light');
    }
  });

  // Handshake: send ui/initialize on ready, then send ui/notifications/initialized
  function start() {
    sendRequest('ui/initialize', {
      protocolVersion: '2026-01-26',
      clientInfo: { name: 'mcp-apps-carousel', version: '1.1.0' }
    }).then(function(result) {
      // Apply initial theme from hostContext
      if (result && result.hostContext && result.hostContext.theme) {
        document.documentElement.setAttribute('data-theme', result.hostContext.theme);
      }
      // Notify handshake complete
      sendNotification('ui/notifications/initialized', {});

      // Attach ResizeObserver AFTER handshake complete (50ms debounce).
      // Observe document.body (not document.documentElement) — documentElement does
      // not expand for overflow children (e.g. horizontal-scroll carousel); body does.
      // Read Math.max(scrollHeight, offsetHeight) to capture overflow content such as
      // the Pick button row at the bottom of cards (07-CONTEXT.md clipping fix).
      var debounceTimer = null;
      var ro = new ResizeObserver(function(entries) {
        var entry = entries[0];
        if (!entry) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          var height = Math.ceil(Math.max(document.body.scrollHeight, document.body.offsetHeight));
          sendNotification('ui/notifications/size-changed', { height: height });
        }, 50);
      });
      ro.observe(document.body);

      // Delegated click handler for Pick buttons
      document.addEventListener('click', function(event) {
        var target = event.target;
        if (!target || !target.matches || !target.matches('.pick-btn[data-recipe-id]')) return;
        var button = target;
        var recipeId = button.getAttribute('data-recipe-id');
        if (!recipeId) return;

        button.disabled = true;
        button.style.opacity = '0.6';

        sendRequest('tools/call', { name: 'commitRecipeToPlan', arguments: { recipeId: recipeId } })
          .then(function() {
            button.textContent = 'Added!';
            setTimeout(function() {
              button.textContent = 'Pick';
              button.disabled = false;
              button.style.opacity = '';
            }, 2000);
          })
          .catch(function() {
            button.textContent = 'Tools unavailable';
            button.style.background = '#6b7280';
          });
      });
    }).catch(function(err) {
      debug('[mcp-apps:iframe]', 'ui/initialize failed', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();`;
