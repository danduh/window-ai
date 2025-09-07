// global.d.ts
import {AI, Translation, AILanguageModelFactory} from 'chrome-llm-ts';

declare global {
  interface Window {
    ai: AI;
    translation: Translation;
    LanguageModel: AILanguageModelFactory;
    Translator: any;
    Summarizer: any
    Writer: any
  }
}

declare module "*.md";

declare module '*.md' {
  const content: string; // markdown is just a string
  export default content;
}
