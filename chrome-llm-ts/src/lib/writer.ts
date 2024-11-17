// Shared self.ai APIs




import {AICapabilityAvailability, AICreateMonitorCallback} from "./interfaces";

// export enum AICapabilityAvailability {
//   Readily = "readily",
//   AfterDownload = "after-download",
//   No = "no",
// }

// Writer

export interface AIWriterFactory {
  create(options?: AIWriterCreateOptions): Promise<AIWriter>;
  capabilities(): Promise<AIWriterCapabilities>;
}

export interface AIWriter {
  write(writingTask: string, options?: AIWriterWriteOptions): Promise<string>;
  writeStreaming(writingTask: string, options?: AIWriterWriteOptions): ReadableStream;

  readonly sharedContext: string;
  readonly tone: AIWriterTone;
  readonly format: AIWriterFormat;
  readonly length: AIWriterLength;

  destroy(): void;
}

export interface AIWriterCapabilities {
  readonly available: AICapabilityAvailability;

  supportsTone(tone: AIWriterTone): AICapabilityAvailability;
  supportsFormat(format: AIWriterFormat): AICapabilityAvailability;
  supportsLength(length: AIWriterLength): AICapabilityAvailability;

  supportsInputLanguage(languageTag: string): AICapabilityAvailability;
}

export interface AIWriterCreateOptions {
  signal?: AbortSignal;
  monitor?: AICreateMonitorCallback;

  sharedContext?: string;
  tone?: AIWriterTone;
  format?: AIWriterFormat;
  length?: AIWriterLength;
}

export interface AIWriterWriteOptions {
  context?: string;
  signal?: AbortSignal;
}

export enum AIWriterTone {
  Formal = "formal",
  Neutral = "neutral",
  Casual = "casual"
}

export enum AIWriterFormat {
  PlainText = "plain-text",
  Markdown = "markdown"
}

export enum AIWriterLength {
  Short = "short",
  Medium = "medium",
  Long = "long"
}

// Rewriter

export interface AIRewriterFactory {
  create(options?: AIRewriterCreateOptions): Promise<AIRewriter>;
  capabilities(): Promise<AIRewriterCapabilities>;
}

export interface AIRewriter {
  rewrite(input: string, options?: AIRewriterRewriteOptions): Promise<string>;
  rewriteStreaming(input: string, options?: AIRewriterRewriteOptions): ReadableStream;

  readonly sharedContext: string;
  readonly tone: AIRewriterTone;
  readonly format: AIRewriterFormat;
  readonly length: AIRewriterLength;

  destroy(): void;
}

export interface AIRewriterCapabilities {
  readonly available: AICapabilityAvailability;

  supportsTone(tone: AIRewriterTone): AICapabilityAvailability;
  supportsFormat(format: AIRewriterFormat): AICapabilityAvailability;
  supportsLength(length: AIRewriterLength): AICapabilityAvailability;

  supportsInputLanguage(languageTag: string): AICapabilityAvailability;
}

export interface AIRewriterCreateOptions {
  signal?: AbortSignal;
  monitor?: AICreateMonitorCallback;

  sharedContext?: string;
  tone?: AIRewriterTone;
  format?: AIRewriterFormat;
  length?: AIRewriterLength;
}

export interface AIRewriterRewriteOptions {
  context?: string;
  signal?: AbortSignal;
}

export enum AIRewriterTone {
  AsIs = "as-is",
  MoreFormal = "more-formal",
  MoreCasual = "more-casual"
}

export enum AIRewriterFormat {
  AsIs = "as-is",
  PlainText = "plain-text",
  Markdown = "markdown"
}

export enum AIRewriterLength {
  AsIs = "as-is",
  Shorter = "shorter",
  Longer = "longer"
}
