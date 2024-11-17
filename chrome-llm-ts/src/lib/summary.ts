export {};

export type AIModelAvailability = 'readily' | 'after-download' | 'no';
export type AISummarizerType = 'tl;dr' | 'key-points' | 'teaser' | 'headline';
export type AISummarizerFormat = 'plain-text' | 'markdown';
export type AISummarizerLength = 'short' | 'medium' | 'long';

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
