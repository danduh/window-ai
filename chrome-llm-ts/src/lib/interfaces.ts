// Shared self.ai APIs

export interface Window {
  readonly ai: AI;
}

export interface AI {
  readonly languageModel: AILanguageModelFactory;
}

export interface WorkerGlobalScope {
  readonly ai: AI;
}

// AI Interface

// AI Create Monitor Interface

export interface AICreateMonitor extends EventTarget {
  ondownloadprogress: ((this: AICreateMonitor, ev: Event) => any) | null;
  // Might get more functionality in the future.
}

type AICreateMonitorCallback = (monitor: AICreateMonitor) => void;

type AICapabilityAvailability = "readily" | "after-download" | "no";

// Language Model Factory

export interface AILanguageModelFactory {
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
  capabilities(): Promise<AILanguageModelCapabilities>;
}

// Language Model Interface

export interface AILanguageModel extends EventTarget {
  prompt(
    input: AILanguageModelPromptInput,
    options?: AILanguageModelPromptOptions
  ): Promise<string>;

  promptStreaming(
    input: AILanguageModelPromptInput,
    options?: AILanguageModelPromptOptions
  ): ReadableStream<string>;

  countPromptTokens(
    input: AILanguageModelPromptInput,
    options?: AILanguageModelPromptOptions
  ): Promise<number>;

  readonly maxTokens: number;
  readonly tokensSoFar: number;
  readonly tokensLeft: number;

  readonly topK: number;
  readonly temperature: number;

  oncontextoverflow: ((this: AILanguageModel, ev: Event) => any) | null;

  clone(options?: AILanguageModelCloneOptions): Promise<AILanguageModel>;
  destroy(): void;
}

// Language Model Capabilities Interface

export interface AILanguageModelCapabilities {
  readonly available: AICapabilityAvailability;

  languageAvailable(languageTag: string): AICapabilityAvailability;

  readonly defaultTopK?: number;
  readonly maxTopK?: number;
  readonly defaultTemperature?: number;
  readonly maxTemperature?: number;
}

// Dictionaries (Converted to TypeScript Interfaces)

export interface AILanguageModelCreateOptions {
  signal?: AbortSignal;
  monitor?: AICreateMonitorCallback;

  systemPrompt?: string;
  initialPrompts?: AILanguageModelInitialPrompt[];
  topK?: number;
  temperature?: number;
}

export interface AILanguageModelInitialPrompt {
  role: AILanguageModelInitialPromptRole;
  content: string;
}

export interface AILanguageModelPrompt {
  role: AILanguageModelPromptRole;
  content: string;
}

export interface AILanguageModelPromptOptions {
  signal?: AbortSignal;
}

export interface AILanguageModelCloneOptions {
  signal?: AbortSignal;
}

// Type Aliases

export type AILanguageModelPromptInput =
  | string
  | AILanguageModelPrompt
  | AILanguageModelPrompt[];

// Enumerations

export type AILanguageModelInitialPromptRole = "system" | "user" | "assistant";
export type AILanguageModelPromptRole = "user" | "assistant";
