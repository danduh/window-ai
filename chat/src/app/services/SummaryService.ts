// Summary availability status type
export type AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available";

// Summary options interface
export interface SummaryOptions {
  type?: "key-points" | "tl;dr" | "teaser" | "headline";
  format?: "markdown" | "plain-text";
  length?: "short" | "medium" | "long";
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  signal?: AbortSignal;
  monitor?: (m: { addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void }) => void;
}

// Summary context options for individual calls
export interface SummaryContext {
  context?: string;
  signal?: AbortSignal;
}

// QuotaExceededError interface for proper typing
export interface QuotaExceededError extends DOMException {
  readonly name: "QuotaExceededError";
  readonly requested: number;
  readonly quota: number;
}

// Extend the Window interface to include Summarizer
declare global {
  interface Window {
    Summarizer: {
      create(options?: SummaryOptions): Promise<{
        summarize(input: string, options?: SummaryContext): Promise<string>;
        summarizeStreaming(input: string, options?: SummaryContext): ReadableStream<string>;
        readonly inputQuota: number;
        measureInputUsage(input: string): Promise<number>;
        destroy(): void;
      }>;
      availability(options?: SummaryOptions): Promise<AvailabilityStatus>;
    };
  }
}

/**
 * Creates a summary of the input text with the specified options
 */
export const summarizeText = async (
  text: string,
  options?: SummaryOptions
): Promise<string> => {
  try {
    const summarizer = await window.Summarizer.create(options);
    const result = await summarizer.summarize(text, { signal: options?.signal });
    summarizer.destroy();
    return result;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        const quotaError = error as QuotaExceededError;
        throw new Error(`Input too large! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
      } else if (error.name === "NotSupportedError") {
        throw new Error("Summarization with these options is not supported");
      } else if (error.name === "AbortError") {
        throw new Error("Summarization was aborted");
      }
    }
    throw error;
  }
};

/**
 * Creates a streaming summary of the input text
 */
export const summarizeTextStreaming = async (
  text: string,
  options?: SummaryOptions
): Promise<ReadableStream<string>> => {
  try {
    const summarizer = await window.Summarizer.create(options);
    return summarizer.summarizeStreaming(text);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      throw new Error("Streaming summarization with these options is not supported");
    }
    throw error;
  }
};

/**
 * Checks if summarization is available with the given options
 */
export const checkSummaryAvailability = async (
  options?: SummaryOptions
): Promise<AvailabilityStatus> => {
  return await window.Summarizer.availability(options);
};

/**
 * Gets input quota and measures usage for a summarizer
 */
export const getSummarizerInputInfo = async (
  options?: SummaryOptions
): Promise<{ quota: number; measureUsage: (input: string) => Promise<number> }> => {
  const summarizer = await window.Summarizer.create(options);
  
  return {
    quota: summarizer.inputQuota || Infinity,
    measureUsage: async (input: string) => {
      return await summarizer.measureInputUsage(input);
    }
  };
};

/**
 * Creates a reusable summarizer for multiple texts with the same configuration
 */
export const createSummarizer = async (options?: SummaryOptions) => {
  return await window.Summarizer.create(options);
};

/**
 * Legacy compatibility function - use summarizeText instead
 * @deprecated Use summarizeText instead
 */
export const getSummaryAI = async (
  text: string,
  type = "tl;dr",
  format = "plain-text",
  length = "medium"
): Promise<string> => {
  return await summarizeText(text, {
    type: type as SummaryOptions['type'],
    format: format as SummaryOptions['format'],
    length: length as SummaryOptions['length']
  });
};
