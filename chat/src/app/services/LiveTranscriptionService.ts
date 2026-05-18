// LiveTranscriptionService — thin wrapper around the browser-native Web Speech API.
// Composes naturally with TranslateService.translate(...) in LiveTranslatePage.
//
// Web Speech API types are not in the default TS DOM lib in all toolchains, so
// we declare a minimal local shape and extend the Window interface (the same
// pattern used by TranslateService for window.LanguageDetector).

// Minimal local Web Speech API surface — keeps the public API typed without `as any`.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export interface LiveTranscriptionHandle {
  stop: () => void;
}

export interface LiveTranscriptionOptions {
  lang?: string;
  onError?: (err: Error) => void;
  onEnd?: () => void;
}

/**
 * Returns true if the current browser exposes the Web Speech API.
 * Safe to call in any environment (SSR-safe — guards `typeof window`).
 */
export const isSupported = (): boolean =>
  typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Start a live speech recognition session.
 *
 * @param onInterim Callback receiving the in-flight, not-yet-finalized transcript
 *                  (called whenever new interim results arrive).
 * @param onFinal   Callback receiving a finalized sentence (called once per
 *                  isFinal === true result; empty strings are filtered out).
 * @param options   Optional lang override (default 'en-US'), and error/end hooks.
 *
 * @returns LiveTranscriptionHandle with an idempotent `stop()` method.
 *
 * @throws Error if the Web Speech API is not available in this browser.
 */
export const start = (
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  options?: LiveTranscriptionOptions
): LiveTranscriptionHandle => {
  if (!isSupported()) {
    throw new Error('SpeechRecognition not supported in this browser');
  }

  // Non-null assertion is safe: isSupported() guarantees at least one is defined.
  const Ctor = (window.SpeechRecognition || window.webkitSpeechRecognition)!;
  const recognition = new Ctor();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options?.lang ?? 'en-US';

  recognition.onresult = (event) => {
    let interimBuffer = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) {
        const trimmed = transcript.trim();
        if (trimmed.length > 0) {
          onFinal(trimmed);
        }
      } else {
        interimBuffer += transcript;
      }
    }
    if (interimBuffer.trim().length > 0) {
      onInterim(interimBuffer);
    }
  };

  recognition.onerror = (event) => {
    const message = event.error ?? event.message ?? 'speech recognition error';
    options?.onError?.(new Error(message));
  };

  recognition.onend = () => {
    options?.onEnd?.();
  };

  recognition.start();

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // idempotent — calling stop() on an already-stopped recognition is a no-op.
      }
    },
  };
};
