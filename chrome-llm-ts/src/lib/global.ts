import {AILanguageModelFactory} from "./interfaces";
import { AISummarizer } from "./summary";
import { Translation } from "./translation";
import {AIRewriterFactory, AIWriterFactory} from "./writer";

export interface Window {
  readonly ai: AI;
  readonly translator: Translation;
  readonly LanguageModel: AILanguageModelFactory;
}

export interface AI {
  readonly languageModel: AILanguageModelFactory;
  readonly summarizer?: AISummarizer;
  readonly writer?: AIWriterFactory;
  readonly rewriter?: AIRewriterFactory;
}

export interface WorkerGlobalScope {
  readonly ai: AI;
  readonly LanguageModel: AILanguageModelFactory;
}
