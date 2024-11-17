// Define the TranslationAvailability enum
export enum TranslationAvailability {
  Readily = "readily",
  AfterDownload = "after-download",
  No = "no",
}

// Define the TranslationLanguageOptions dictionary
export interface TranslationLanguageOptions {
  targetLanguage: string;
  sourceLanguage: string;
}

interface LanguageDetectionResult {
  detectedLanguage?: string;
  confidence: number;
}

// Define the LanguageTranslator interface
export interface LanguageTranslator {
  translate(input: string): Promise<string>;
}

export interface LanguageDetector extends EventTarget {
  readonly ready: Promise<void>;
  ondownloadprogress: ((this: LanguageDetector, ev: ProgressEvent) => any) | null;

  detect(input: string): Promise<LanguageDetectionResult[]>;
}


// Define the Translation interface
export interface Translation {
  canTranslate(options: TranslationLanguageOptions): Promise<TranslationAvailability>;

  createTranslator(options: TranslationLanguageOptions): Promise<LanguageTranslator>;

  canDetect(): Promise<TranslationAvailability>;

  createDetector(): Promise<LanguageDetector>;

}

// Extend WindowOrWorkerGlobalScope to include Translation
export interface WindowOrWorkerGlobalScope {
  readonly translation: Translation;
}
