// Re-export types from @types/dom-chromium-ai for easier use
declare global {
  // Re-export the types to make them available globally
  interface LanguageModelParams {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
  }

  interface LanguageModelCreateOptions {
    topK?: number;
    temperature?: number;
    expectedInputs?: Array<{
      type: "text" | "image" | "audio";
      languages?: string[];
    }>;
    expectedOutputs?: Array<{
      type: "text" | "image" | "audio";
      languages?: string[];
    }>;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: object;
      execute: (...args: any[]) => Promise<string>;
    }>;
    signal?: AbortSignal;
    monitor?: (monitor: any) => void;
    initialPrompts?: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
  }

  abstract class LanguageModel extends EventTarget {
    static create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    static availability(options?: Partial<LanguageModelCreateOptions>): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    static params(): Promise<LanguageModelParams>;

    prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
    promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
    
    readonly inputUsage: number;
    readonly inputQuota: number;
    readonly topK: number;
    readonly temperature: number;

    clone(options?: { signal?: AbortSignal }): Promise<LanguageModel>;
    destroy(): void;
  }

  abstract class Summarizer {
    static create(options?: any): Promise<Summarizer>;
    static availability(options?: any): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    
    summarize(input: string, options?: any): Promise<string>;
    summarizeStreaming(input: string, options?: any): ReadableStream<string>;
    destroy(): void;
  }

  abstract class Writer {
    static create(options?: any): Promise<Writer>;
    static availability(options?: any): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    
    write(input: string, options?: any): Promise<string>;
    writeStreaming(input: string, options?: any): ReadableStream<string>;
    destroy(): void;
  }

  abstract class Translator {
    static create(options: { sourceLanguage: string; targetLanguage: string }): Promise<Translator>;
    static availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    
    translate(input: string, options?: any): Promise<string>;
    translateStreaming(input: string, options?: any): ReadableStream<string>;
    destroy(): void;
  }
}
