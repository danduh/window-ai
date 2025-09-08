import { TranslationLanguageOptions } from "chrome-llm-ts";

// Extend the Window interface to include LanguageDetector
declare global {
  interface Window {
    LanguageDetector: {
      create(options?: LanguageDetectionOptions): Promise<{
        detect(input: string, options?: { signal?: AbortSignal }): Promise<LanguageDetectionResult[]>;
        inputQuota: number;
        measureInputUsage(input: string): Promise<number>;
        destroy(): void;
      }>;
      availability(options?: { expectedInputLanguages?: string[] }): Promise<AvailabilityStatus>;
    };
  }
}

// Translation availability status type
export type AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available";

// Language detection result type
export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
}

// Translation options with optional download monitoring
export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (m: { addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void }) => void;
}

// Language detection options
export interface LanguageDetectionOptions {
  expectedInputLanguages?: string[];
  signal?: AbortSignal;
  monitor?: (m: { addEventListener: (type: string, listener: (e: ProgressEvent) => void) => void }) => void;
}

// QuotaExceededError interface for proper typing
export interface QuotaExceededError extends DOMException {
  readonly name: "QuotaExceededError";
  readonly requested: number;
  readonly quota: number;
}

/**
 * Translates text from source language to target language
 */
export const translate = async (
  prompt: string,
  sourceLanguage = 'en',
  targetLanguage = 'ru',
  options?: Partial<TranslationOptions>
): Promise<string> => {
  try {
    const translatorOptions: TranslationOptions = {
      sourceLanguage,
      targetLanguage,
      ...options
    };
    
    const translator = await window.Translator.create(translatorOptions);
    return await translator.translate(prompt, { signal: options?.signal });
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        const quotaError = error as QuotaExceededError;
        throw new Error(`Input too large! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
      } else if (error.name === "NotSupportedError") {
        throw new Error(`Translation from ${sourceLanguage} to ${targetLanguage} is not supported`);
      } else if (error.name === "AbortError") {
        throw new Error("Translation was aborted");
      }
    }
    throw error;
  }
};

/**
 * Translates text with streaming output
 */
export const translateStreaming = async (
  prompt: string,
  sourceLanguage = 'en',
  targetLanguage = 'ru',
  options?: Partial<TranslationOptions>
): Promise<ReadableStream<string>> => {
  try {
    const translatorOptions: TranslationOptions = {
      sourceLanguage,
      targetLanguage,
      ...options
    };
    
    const translator = await window.Translator.create(translatorOptions);
    return translator.translateStreaming(prompt);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      throw new Error(`Streaming translation from ${sourceLanguage} to ${targetLanguage} is not supported`);
    }
    throw error;
  }
};

/**
 * Detects the language of the input text
 */
export const detectLanguage = async (
  prompt: string,
  options?: LanguageDetectionOptions
): Promise<LanguageDetectionResult[]> => {
  try {
    const detector = await window.LanguageDetector.create(options);
    return await detector.detect(prompt, { signal: options?.signal });
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        const quotaError = error as QuotaExceededError;
        throw new Error(`Input too large for language detection! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
      } else if (error.name === "NotSupportedError") {
        throw new Error("Language detection is not supported");
      } else if (error.name === "AbortError") {
        throw new Error("Language detection was aborted");
      }
    }
    throw error;
  }
};

/**
 * Gets the most likely detected language from detection results
 */
export const detectPrimaryLanguage = async (
  prompt: string,
  options?: LanguageDetectionOptions
): Promise<string> => {
  const results = await detectLanguage(prompt, options);
  return results.length > 0 ? results[0].detectedLanguage : "und";
};

/**
 * Checks translation availability for a language pair
 */
export const checkTranslationAvailability = async (
  sourceLanguage: string,
  targetLanguage: string
): Promise<AvailabilityStatus> => {
  return await window.Translator.availability({ sourceLanguage, targetLanguage });
};

/**
 * Checks language detection availability
 */
export const checkLanguageDetectionAvailability = async (
  expectedInputLanguages?: string[]
): Promise<AvailabilityStatus> => {
  return await window.LanguageDetector.availability({ expectedInputLanguages });
};

/**
 * Legacy compatibility function - replaced by checkTranslationAvailability
 * @deprecated Use checkTranslationAvailability instead
 */
export const canTranslate = async (languagePair: TranslationLanguageOptions): Promise<boolean> => {
  const availability = await checkTranslationAvailability(languagePair.sourceLanguage, languagePair.targetLanguage);
  return availability !== "unavailable";
};

/**
 * Combined function to detect language and translate in one call
 */
export const detectAndTranslate = async (
  textToTranslate: string,
  targetLanguage: string,
  fallbackSourceLanguage = 'en'
): Promise<string> => {
  // Check if language detection is available
  const detectorAvailability = await checkLanguageDetectionAvailability();
  
  let sourceLanguage = fallbackSourceLanguage;
  
  // If language detection is available, detect the source language
  if (detectorAvailability !== "unavailable") {
    const detectionResults = await detectLanguage(textToTranslate);
    const bestResult = detectionResults[0];
    
    if (bestResult && bestResult.detectedLanguage !== "und" && bestResult.confidence >= 0.4) {
      sourceLanguage = bestResult.detectedLanguage;
    }
  }
  
  // Check if translation is available for the detected/fallback language pair
  const translatorAvailability = await checkTranslationAvailability(sourceLanguage, targetLanguage);
  
  if (translatorAvailability === "unavailable") {
    throw new Error(`Translation from ${sourceLanguage} to ${targetLanguage} is not available`);
  }
  
  // Perform the translation
  return await translate(textToTranslate, sourceLanguage, targetLanguage);
};

/**
 * Gets input quota and measures usage for a translator
 */
export const getTranslatorInputInfo = async (
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ quota: number; measureUsage: (input: string) => Promise<number> }> => {
  const translator = await window.Translator.create({ sourceLanguage, targetLanguage });
  
  return {
    quota: translator.inputQuota || Infinity,
    measureUsage: async (input: string) => {
      return await translator.measureInputUsage(input);
    }
  };
};