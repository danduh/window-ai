// global.d.ts
import type { AI } from 'chrome-llm-ts';

declare global {
  interface Window {
    ai: AI;
  }
}