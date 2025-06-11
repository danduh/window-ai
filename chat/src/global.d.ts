// global.d.ts
import {AI, Translation} from 'chrome-llm-ts';

declare global {
  interface Window {
    ai: AI;
    translation: Translation;
    LanguageModel: any;
    Summarizer: any
  }
}

declare module "*.md";

declare module '*.md' {
  const content: string; // markdown is just a string
  export default content;
}
