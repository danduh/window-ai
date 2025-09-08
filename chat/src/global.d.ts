// global.d.ts
import {Translation, AILanguageModelFactory} from 'chrome-llm-ts';

declare global {
  interface Window {
    ai: {
      languageModel: AILanguageModelFactory;
    };
    translation: Translation;
    LanguageModel: AILanguageModelFactory;
    Translator: typeof Translator;
    Summarizer: typeof Summarizer;
    Writer: typeof Writer;
  }

  // Chrome's Prompt API - LanguageModel is a global class
  abstract class LanguageModel {
    static create(options?: any): Promise<LanguageModel>;
    static availability(options?: any): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    static params(): Promise<{
      readonly defaultTopK: number;
      readonly maxTopK: number;
      readonly defaultTemperature: number;
      readonly maxTemperature: number;
    }>;

    prompt(input: string, options?: any): Promise<string>;
    promptStreaming(input: string, options?: any): ReadableStream<string>;
    
    readonly inputUsage: number;
    readonly inputQuota: number;
    readonly topK: number;
    readonly temperature: number;

    clone(options?: any): Promise<LanguageModel>;
    destroy(): void;
  }
}

declare module "*.md";

declare module '*.md' {
  const content: string; // markdown is just a string
  export default content;
}
