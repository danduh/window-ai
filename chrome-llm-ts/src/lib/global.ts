import {AILanguageModelFactory, AISummarizer, Translation} from "chrome-llm-ts";
import {AIRewriterFactory, AIWriterFactory} from "./writer";

export interface Window {
  readonly ai: AI;
  readonly translator: Translation
}

export interface AI {
  readonly languageModel: AILanguageModelFactory;
  readonly summarizer?: AISummarizer;
  readonly writer?: AIWriterFactory;
  readonly rewriter?: AIRewriterFactory;
}

export interface WorkerGlobalScope {
  readonly ai: AI;
}
