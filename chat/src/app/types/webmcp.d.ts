// Ambient declarations for the WebMCP API (Chrome 146 Canary, W3C draft Feb 2026).
// Picked up automatically by chat/tsconfig.app.json `include: ["src/**/*.ts"]`.
// DO NOT import this file from a .ts/.tsx — that would convert it to a module
// and break the ambient global augmentations.

declare global {
  interface Navigator {
    /**
     * The WebMCP entry point. Undefined when the user agent does not implement
     * `navigator.modelContext` or when the page is not a Secure Context.
     */
    readonly modelContext?: ModelContext;
  }

  interface ModelContext {
    /**
     * Registers a tool with the user agent. Pass an `AbortSignal` via `options`
     * to deregister; per the W3C IDL there is no separate `unregisterTool` method.
     */
    registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): void;
    provideContext(context: object): void;
  }

  interface ModelContextRegisterToolOptions {
    signal?: AbortSignal;
  }

  interface ModelContextTool {
    name: string;
    description: string;
    /** JSON Schema describing the input shape passed to `execute`. */
    inputSchema?: object;
    /**
     * Tool handler. Input is dynamic per-tool (driven by `inputSchema`), so `any`
     * is the spec-correct shape per W3C IDL §4.2.1 — narrow per-tool at the call
     * site in Phase 2.
     */
    execute: (input: any, client?: ModelContextClient) => Promise<unknown> | unknown;
    title?: string;
    annotations?: ModelContextToolAnnotations;
  }

  interface ModelContextToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface ModelContextClient {
    requestUserInteraction(callback: (...args: any[]) => any): Promise<any>;
  }
}
