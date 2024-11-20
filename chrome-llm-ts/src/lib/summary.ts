export {};

export enum AIModelAvailability {
  Readily = 'readily',
  AfterDownload = 'after-download',
  No = 'no'
}

export enum AISummarizerType {
  TLDR = 'tl;dr',
  KeyPoints = 'key-points',
  Teaser = 'teaser',
  Headline = 'headline'
}

export enum AISummarizerFormat {
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum AISummarizerLength {
  Short = 'short',
  Medium = 'medium',
  Long = 'long'
}

export type AISummarizerCreateOptions = {
  type?: AISummarizerType,
  length?: AISummarizerLength,
  format?: AISummarizerFormat,
};

export type AISummarizer = {
  capabilities: () => Promise<AISummarizerCapabilities>;
  create: (options?: AISummarizerCreateOptions) => Promise<AISummarizerSession>;
}

export type AISummarizerCapabilities = {
  available: AIModelAvailability
}

export type AIModelDownloadProgressEvent = {
  loaded: number,
  total: number,
}

export type AIModelDownloadCallback = (prop: string, event: AIModelDownloadProgressEvent) => void;

export type AISummarizerSession = {
  destroy: () => void;
  ready: Promise<void>;
  summarize: (string: string) => Promise<string>;
  addEventListener: AIModelDownloadCallback;
}
