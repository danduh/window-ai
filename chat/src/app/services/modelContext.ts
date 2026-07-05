// Single source of truth for resolving the WebMCP entry point.
//
// Chrome 150 deprecated `navigator.modelContext` and moved the API to
// `document.modelContext` (WebMCP tools are per-Document). It will be removed
// from `navigator` in a future release. Prefer `document`, fall back to
// `navigator` so the demos keep working on Chrome 146–149.
//
// Official migration guidance:
// https://developer.chrome.com/docs/ai/webmcp/imperative-api
//   const modelContext = document.modelContext || navigator.modelContext;
//
// `ModelContext` is ambient (chat/src/app/types/webmcp.d.ts).

/**
 * Returns the active WebMCP `ModelContext`, preferring the Chrome 150+
 * `document.modelContext` over the deprecated `navigator.modelContext`.
 * Returns `undefined` when WebMCP is unavailable (no flag / older browser /
 * non-secure context). SSR-safe — guards `typeof document`/`navigator`.
 */
export function getModelContext(): ModelContext | undefined {
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }
  return undefined;
}

/** Convenience boolean: is WebMCP available in this runtime? */
export function isModelContextAvailable(): boolean {
  return getModelContext() !== undefined;
}
