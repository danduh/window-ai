/**
 * Observability — public surface (Phase A, GitHub #48 / tracker #52).
 *
 * Importing this module registers the console sink once, when tracing is
 * enabled (Vite dev, or `localStorage['ai:trace']='1'`). Services should import
 * `traceCall` / `traceStream` / `isTracingEnabled` from here so the default sink
 * is wired up as a side effect.
 *
 * Later phases add more sinks (in-page IndexedDB panel #49, OpenTelemetry #50,
 * Sentry / Langfuse #51). See `.planning/advanced-section/OBSERVABILITY-PLAN.md`.
 */
import { addSink, isTracingEnabled } from './tracer';
import { consoleSink } from './sinks/console';

let installed = false;

/** Register the built-in console sink exactly once (StrictMode-safe). */
export function installDefaultSinks(): void {
  if (installed) return;
  installed = true;
  addSink(consoleSink);
}

if (isTracingEnabled()) {
  installDefaultSinks();
}

export { addSink, isTracingEnabled, traceCall, traceStream } from './tracer';
export { consoleSink, getSpanHistory, clearSpanHistory } from './sinks/console';
export type { AiSpan, AiApi, AiFinish, Sink } from './types';
