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
    /**
     * Chrome 147 Canary — specifies the output language for the model session.
     * Required (or strongly recommended) in Chrome 147+ to ensure optimal output
     * quality and attest to output safety. Supported values: 'en', 'es', 'ja'.
     * Omitting this causes a console warning and may degrade output quality
     * (e.g., model wrapping JSON in markdown code fences despite responseFormat,
     * hallucinating IDs, or emitting fewer tool calls per turn).
     */
    outputLanguage?: string;
    expectedInputs?: Array<{
      type: "text" | "image" | "audio" | "tool-call" | "tool-response";
      languages?: string[];
    }>;
    expectedOutputs?: Array<{
      type: "text" | "image" | "audio" | "tool-call" | "tool-response";
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
    /**
     * Chrome 147 Canary — JSON-Schema-shaped output constraint that activates
     * tool-use. When `tools` is also provided, the model auto-invokes the
     * matching tool's `execute` and the prompt() response is the tool's
     * stringified return value. See chat/src/app/components/ToolCallingPage.tsx
     * for the working precedent (the W3C `expectedInputs/expectedOutputs`
     * shape is not yet implemented in 147).
     */
    responseFormat?: object;
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

  // Language detection result interface
  interface LanguageDetectionResult {
    detectedLanguage: string;
    confidence: number;
  }

  // Shared monitor interface for download-progress events across built-in AI APIs
  interface AICreateMonitor {
    addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void;
  }

  // Translation options interface
  interface TranslatorCreateOptions {
    sourceLanguage: string;
    targetLanguage: string;
    signal?: AbortSignal;
    monitor?: (m: AICreateMonitor) => void;
  }

  // Language detection options interface
  interface LanguageDetectorCreateOptions {
    expectedInputLanguages?: string[];
    signal?: AbortSignal;
    monitor?: (m: AICreateMonitor) => void;
  }

  // QuotaExceededError interface for proper typing
  interface QuotaExceededError extends DOMException {
    readonly name: "QuotaExceededError";
    readonly requested: number;
    readonly quota: number;
  }

  abstract class Translator {
    static create(options: TranslatorCreateOptions): Promise<Translator>;
    static availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;

    translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
    translateStreaming(input: string): ReadableStream<string>;
    readonly inputQuota: number;
    measureInputUsage(input: string): Promise<number>;
    destroy(): void;
  }

  abstract class LanguageDetector {
    static create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector>;
    static availability(options?: { expectedInputLanguages?: string[] }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;

    detect(input: string, options?: { signal?: AbortSignal }): Promise<LanguageDetectionResult[]>;
    readonly inputQuota: number;
    measureInputUsage(input: string): Promise<number>;
    destroy(): void;
  }

  // Proofreader API types

  type ProofreaderCorrectionType =
    | 'spelling'
    | 'punctuation'
    | 'capitalization'
    | 'preposition'
    | 'missing-words'
    | 'grammar';

  interface ProofreaderCorrection {
    startIndex: number;
    endIndex: number;
    correction: string;
    types?: ProofreaderCorrectionType[];
    explanation?: string;
  }

  interface ProofreadResult {
    correctedInput: string;
    corrections: ProofreaderCorrection[];
  }

  interface ProofreaderCreateOptions {
    includeCorrectionTypes?: boolean;
    includeCorrectionExplanations?: boolean;
    correctionExplanationLanguage?: string;
    expectedInputLanguages?: string[];
    signal?: AbortSignal;
    monitor?: (m: AICreateMonitor) => void;
  }

  interface ProofreaderProofreadOptions {
    signal?: AbortSignal;
  }

  interface Proofreader {
    proofread(input: string, options?: ProofreaderProofreadOptions): Promise<ProofreadResult>;
    destroy(): void;
    readonly includeCorrectionTypes: boolean;
    readonly includeCorrectionExplanations: boolean;
    readonly expectedInputLanguages: ReadonlyArray<string> | null;
    readonly correctionExplanationLanguage: string | null;
  }

  interface ProofreaderConstructor {
    create(options?: ProofreaderCreateOptions): Promise<Proofreader>;
    availability(options?: { expectedInputLanguages?: string[] }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  }

  interface Window {
    Translator: typeof Translator;
    LanguageDetector: typeof LanguageDetector;
    Proofreader: ProofreaderConstructor;
  }
}
