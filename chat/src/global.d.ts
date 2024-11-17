// global.d.ts
import {AI, Translation} from 'chrome-llm-ts';

declare global {
  interface Window {
    ai: AI;
    translation: Translation;
  }
}