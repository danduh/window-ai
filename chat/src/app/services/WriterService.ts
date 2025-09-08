// Writer/Rewriter availability status type
export type AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available";

// Writer options interface
export interface WriterOptions {
  tone?: "formal" | "neutral" | "casual";
  format?: "markdown" | "plain-text";
  length?: "short" | "medium" | "long";
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  signal?: AbortSignal;
  monitor?: (m: { addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void }) => void;
}

// Rewriter options interface
export interface RewriterOptions {
  tone?: "as-is" | "more-formal" | "more-casual";
  format?: "as-is" | "markdown" | "plain-text";
  length?: "as-is" | "shorter" | "longer";
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  signal?: AbortSignal;
  monitor?: (m: { addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void }) => void;
}

// Context options for individual calls
export interface ContextOptions {
  context?: string;
  signal?: AbortSignal;
}

// QuotaExceededError interface for proper typing
export interface QuotaExceededError extends DOMException {
  readonly name: "QuotaExceededError";
  readonly requested: number;
  readonly quota: number;
}

// Extend the Window interface to include Writer and Rewriter
declare global {
  interface Window {
    Writer: {
      create(options?: WriterOptions): Promise<{
        write(input: string, options?: ContextOptions): Promise<string>;
        writeStreaming(input: string, options?: ContextOptions): ReadableStream<string>;
        readonly inputQuota: number;
        measureInputUsage(input: string): Promise<number>;
        destroy(): void;
      }>;
      availability(options?: WriterOptions): Promise<AvailabilityStatus>;
    };
    Rewriter: {
      create(options?: RewriterOptions): Promise<{
        rewrite(input: string, options?: ContextOptions): Promise<string>;
        rewriteStreaming(input: string, options?: ContextOptions): ReadableStream<string>;
        readonly inputQuota: number;
        measureInputUsage(input: string): Promise<number>;
        destroy(): void;
      }>;
      availability(options?: RewriterOptions): Promise<AvailabilityStatus>;
    };
  }
}

/**
 * Writes new content based on the writing task prompt
 */
export const writeText = async (
  prompt: string,
  options?: WriterOptions
): Promise<string> => {
  try {
    const writer = await window.Writer.create(options);
    const result = await writer.write(prompt, { signal: options?.signal });
    writer.destroy();
    return result;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        const quotaError = error as QuotaExceededError;
        throw new Error(`Input too large! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
      } else if (error.name === "NotSupportedError") {
        throw new Error("Writing with these options is not supported");
      } else if (error.name === "AbortError") {
        throw new Error("Writing was aborted");
      }
    }
    throw error;
  }
};

/**
 * Writes new content with streaming output
 */
export const writeTextStreaming = async (
  prompt: string,
  options?: WriterOptions
): Promise<ReadableStream<string>> => {
  try {
    const writer = await window.Writer.create(options);
    return writer.writeStreaming(prompt);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      throw new Error("Streaming writing with these options is not supported");
    }
    throw error;
  }
};

/**
 * Rewrites existing text with the specified transformations
 */
export const rewriteText = async (
  text: string,
  options?: RewriterOptions,
  context?: string
): Promise<string> => {
  try {
    const rewriter = await window.Rewriter.create(options);
    const result = await rewriter.rewrite(text, { 
      context,
      signal: options?.signal 
    });
    rewriter.destroy();
    return result;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        const quotaError = error as QuotaExceededError;
        throw new Error(`Input too large! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
      } else if (error.name === "NotSupportedError") {
        throw new Error("Rewriting with these options is not supported");
      } else if (error.name === "AbortError") {
        throw new Error("Rewriting was aborted");
      }
    }
    throw error;
  }
};

/**
 * Rewrites existing text with streaming output
 */
export const rewriteTextStreaming = async (
  text: string,
  options?: RewriterOptions,
  context?: string
): Promise<ReadableStream<string>> => {
  try {
    const rewriter = await window.Rewriter.create(options);
    return rewriter.rewriteStreaming(text, { context });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      throw new Error("Streaming rewriting with these options is not supported");
    }
    throw error;
  }
};

/**
 * Checks if writing is available with the given options
 */
export const checkWriterAvailability = async (
  options?: WriterOptions
): Promise<AvailabilityStatus> => {
  return await window.Writer.availability(options);
};

/**
 * Checks if rewriting is available with the given options
 */
export const checkRewriterAvailability = async (
  options?: RewriterOptions
): Promise<AvailabilityStatus> => {
  return await window.Rewriter.availability(options);
};

/**
 * Creates a reusable writer for multiple tasks with the same configuration
 */
export const createWriter = async (options?: WriterOptions) => {
  return await window.Writer.create(options);
};

/**
 * Creates a reusable rewriter for multiple texts with the same configuration
 */
export const createRewriter = async (options?: RewriterOptions) => {
  return await window.Rewriter.create(options);
};

/**
 * Legacy compatibility function - use writeText instead
 * @deprecated Use writeText instead
 */
export const writeAI = async (
  prompt: string,
  stream = false,
  format = "plain-text",
  length = "medium",
  tone = "neutral",
  sharedContext = ""
): Promise<string | ReadableStream<string>> => {
  const options: WriterOptions = {
    format: format as WriterOptions['format'],
    length: length as WriterOptions['length'],
    tone: tone as WriterOptions['tone'],
    sharedContext: sharedContext || undefined
  };

  if (stream) {
    return await writeTextStreaming(prompt, options);
  } else {
    return await writeText(prompt, options);
  }
};

/**
 * Legacy compatibility function - use rewriteText instead
 * @deprecated Use rewriteText instead
 */
export const reWriteAI = async (
  prompt: string,
  stream = false,
  format = "as-is",
  length = "as-is",
  tone = "as-is",
  sharedContext = ""
): Promise<string | ReadableStream<string>> => {
  const options: RewriterOptions = {
    format: format as RewriterOptions['format'],
    length: length as RewriterOptions['length'],
    tone: tone as RewriterOptions['tone'],
    sharedContext: sharedContext || undefined
  };

  if (stream) {
    return await rewriteTextStreaming(prompt, options);
  } else {
    return await rewriteText(prompt, options);
  }
};


