import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkTranslationAvailability,
  translate,
} from '../services/TranslateService';
import {
  isSupported as isLiveTranscriptionSupported,
  start as startLiveTranscription,
  LiveTranscriptionHandle,
} from '../services/LiveTranscriptionService';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import ThemeToggle from './ThemeToggle';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ar', name: 'Arabic' },
];

// BCP-47 tags for Web Speech API. The short prefix (before the '-') doubles as
// the Translator API source code, so picking en-US here both sets recognition
// to American English AND tells the Translator to translate from `en`.
const speechLanguages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'he-IL', name: 'Hebrew' },
  { code: 'ar-SA', name: 'Arabic' },
];

type Mode = 'final' | 'interim';
const INTERIM_DEBOUNCE_MS = 300;
const DEFAULT_SPEECH_LANG = 'en-US';

const LiveTranslatePage: React.FC = () => {
  useSEOData(seoConfigs.liveTranslate, '/live-translate');

  const supported = isLiveTranscriptionSupported();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>('final');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [speechLang, setSpeechLang] = useState<string>(DEFAULT_SPEECH_LANG);
  const [targetA, setTargetA] = useState<string>('es');
  const [targetB, setTargetB] = useState<string>('fr');
  // Mirrors the source transcript shape: a list of completed sentence
  // translations, plus an in-progress translation rendered below (italic),
  // just like transcript[] + interimText for the source pane. Translations
  // accumulate across sentences; only the Clear button wipes them.
  const [translationLinesA, setTranslationLinesA] = useState<string[]>([]);
  const [translationLinesB, setTranslationLinesB] = useState<string[]>([]);
  const [currentTranslationA, setCurrentTranslationA] = useState<string>('');
  const [currentTranslationB, setCurrentTranslationB] = useState<string>('');
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Refs that mirror the "current in-progress" translation so handleFinal can
  // read the latest value without depending on stale state (a final fires
  // very soon after the last interim translation completes).
  const currentTranslationARef = useRef<string>('');
  const currentTranslationBRef = useRef<string>('');

  // Translator wants the language portion of the BCP-47 tag (e.g. "en", not "en-US").
  const sourceLang = speechLang.split('-')[0];

  const handleRef = useRef<LiveTranscriptionHandle | null>(null);
  const abortARef = useRef<AbortController | null>(null);
  const abortBRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const latestSourceRef = useRef<string>('');
  const modeRef = useRef<Mode>(mode);
  const targetARef = useRef<string>(targetA);
  const targetBRef = useRef<string>(targetB);
  const sourceLangRef = useRef<string>(sourceLang);
  const didMountARef = useRef<boolean>(false);
  const didMountBRef = useRef<boolean>(false);
  const didMountSpeechLangRef = useRef<boolean>(false);
  // Last-write-wins request IDs — each translate call gets a monotonically
  // increasing id; only the most recent caller writes to its pane. Defends
  // against races between handleFinal, the post-final debounce flush, and
  // rapid interim updates in Rolling Interim mode.
  const requestIdARef = useRef<number>(0);
  const requestIdBRef = useRef<number>(0);

  // Keep refs in sync so the speech-recognition callbacks always see the
  // latest mode/target values without re-binding the recognition session.
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { targetARef.current = targetA; }, [targetA]);
  useEffect(() => { targetBRef.current = targetB; }, [targetB]);
  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);

  // Interim translation (rolling interim mode): writes to the "in-progress"
  // slot for the current sentence. Last-write-wins via request id; sticky
  // write skips empty/whitespace output so the pane never flashes empty.
  const translateInterimA = useCallback(async (text: string, source: string, target: string) => {
    if (!text.trim()) return;
    const myId = ++requestIdARef.current;
    abortARef.current?.abort();
    const ctrl = new AbortController();
    abortARef.current = ctrl;
    setErrorA(null);
    if (source === target) {
      if (myId === requestIdARef.current) {
        currentTranslationARef.current = text;
        setCurrentTranslationA(text);
      }
      return;
    }
    try {
      const avail = await checkTranslationAvailability(source, target);
      if (myId !== requestIdARef.current) return;
      if (avail === 'unavailable') {
        setErrorA(`Language pair ${source}->${target} unavailable on this Chrome build`);
        return;
      }
      const out = await translate(text, source, target, { signal: ctrl.signal });
      if (myId !== requestIdARef.current) return;
      if (out && out.trim().length > 0) {
        currentTranslationARef.current = out;
        setCurrentTranslationA(out);
      }
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('aborted')) return;
      if (myId === requestIdARef.current) setErrorA(msg || 'Translation failed');
    }
  }, []);

  const translateInterimB = useCallback(async (text: string, source: string, target: string) => {
    if (!text.trim()) return;
    const myId = ++requestIdBRef.current;
    abortBRef.current?.abort();
    const ctrl = new AbortController();
    abortBRef.current = ctrl;
    setErrorB(null);
    if (source === target) {
      if (myId === requestIdBRef.current) {
        currentTranslationBRef.current = text;
        setCurrentTranslationB(text);
      }
      return;
    }
    try {
      const avail = await checkTranslationAvailability(source, target);
      if (myId !== requestIdBRef.current) return;
      if (avail === 'unavailable') {
        setErrorB(`Language pair ${source}->${target} unavailable on this Chrome build`);
        return;
      }
      const out = await translate(text, source, target, { signal: ctrl.signal });
      if (myId !== requestIdBRef.current) return;
      if (out && out.trim().length > 0) {
        currentTranslationBRef.current = out;
        setCurrentTranslationB(out);
      }
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('aborted')) return;
      if (myId === requestIdBRef.current) setErrorB(msg || 'Translation failed');
    }
  }, []);

  // Final translation (Per finalized sentence mode, or replacing the trusted
  // interim translation when a final fires): appends to the linesA list.
  const translateFinalA = useCallback(async (text: string, source: string, target: string) => {
    if (!text.trim()) return;
    const myId = ++requestIdARef.current;
    abortARef.current?.abort();
    const ctrl = new AbortController();
    abortARef.current = ctrl;
    setErrorA(null);
    if (source === target) {
      if (myId === requestIdARef.current) {
        setTranslationLinesA((prev) => [...prev, text]);
      }
      return;
    }
    try {
      const avail = await checkTranslationAvailability(source, target);
      if (myId !== requestIdARef.current) return;
      if (avail === 'unavailable') {
        setErrorA(`Language pair ${source}->${target} unavailable on this Chrome build`);
        return;
      }
      const out = await translate(text, source, target, { signal: ctrl.signal });
      if (myId !== requestIdARef.current) return;
      if (out && out.trim().length > 0) {
        setTranslationLinesA((prev) => [...prev, out]);
      }
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('aborted')) return;
      if (myId === requestIdARef.current) setErrorA(msg || 'Translation failed');
    }
  }, []);

  const translateFinalB = useCallback(async (text: string, source: string, target: string) => {
    if (!text.trim()) return;
    const myId = ++requestIdBRef.current;
    abortBRef.current?.abort();
    const ctrl = new AbortController();
    abortBRef.current = ctrl;
    setErrorB(null);
    if (source === target) {
      if (myId === requestIdBRef.current) {
        setTranslationLinesB((prev) => [...prev, text]);
      }
      return;
    }
    try {
      const avail = await checkTranslationAvailability(source, target);
      if (myId !== requestIdBRef.current) return;
      if (avail === 'unavailable') {
        setErrorB(`Language pair ${source}->${target} unavailable on this Chrome build`);
        return;
      }
      const out = await translate(text, source, target, { signal: ctrl.signal });
      if (myId !== requestIdBRef.current) return;
      if (out && out.trim().length > 0) {
        setTranslationLinesB((prev) => [...prev, out]);
      }
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('aborted')) return;
      if (myId === requestIdBRef.current) setErrorB(msg || 'Translation failed');
    }
  }, []);

  const handleFinal = useCallback(
    (text: string) => {
      // Cancel any pending interim-mode debounce — the final is authoritative.
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setTranscript((prev) => [...prev, text]);
      setInterimText('');
      latestSourceRef.current = text;

      if (modeRef.current === 'interim') {
        // The last interim debounce already translated this sentence (or
        // something very close to it) into the "current" slot. Promote that
        // in-progress translation into the lines list and clear the slot so
        // the next sentence starts fresh.
        const currentA = currentTranslationARef.current;
        const currentB = currentTranslationBRef.current;
        if (currentA.trim().length > 0) {
          setTranslationLinesA((prev) => [...prev, currentA]);
        } else {
          // Edge case: paused before any interim debounce fired. Translate
          // the final text directly into the lines list.
          void translateFinalA(text, sourceLangRef.current, targetARef.current);
        }
        if (currentB.trim().length > 0) {
          setTranslationLinesB((prev) => [...prev, currentB]);
        } else {
          void translateFinalB(text, sourceLangRef.current, targetBRef.current);
        }
        currentTranslationARef.current = '';
        currentTranslationBRef.current = '';
        setCurrentTranslationA('');
        setCurrentTranslationB('');
      } else {
        // Per finalized sentence mode: no interim translations happen, so
        // translate the final text now and append to lines.
        void translateFinalA(text, sourceLangRef.current, targetARef.current);
        void translateFinalB(text, sourceLangRef.current, targetBRef.current);
      }
    },
    [translateFinalA, translateFinalB]
  );

  const handleInterim = useCallback(
    (text: string) => {
      setInterimText(text);
      if (modeRef.current === 'interim') {
        if (debounceRef.current !== null) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => {
          latestSourceRef.current = text;
          void translateInterimA(text, sourceLangRef.current, targetARef.current);
          void translateInterimB(text, sourceLangRef.current, targetBRef.current);
        }, INTERIM_DEBOUNCE_MS);
      }
    },
    [translateInterimA, translateInterimB]
  );

  const handleStart = useCallback(() => {
    setGlobalError(null);
    try {
      handleRef.current = startLiveTranscription(handleInterim, handleFinal, {
        lang: speechLang,
        onError: (err) => {
          setGlobalError(err.message);
          setIsListening(false);
        },
        onEnd: () => setIsListening(false),
      });
      setIsListening(true);
    } catch (e) {
      setGlobalError((e as Error).message);
    }
  }, [handleFinal, handleInterim, speechLang]);

  const handleStop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setIsListening(false);
  };

  const handleClear = () => {
    setTranscript([]);
    setInterimText('');
    setTranslationLinesA([]);
    setTranslationLinesB([]);
    setCurrentTranslationA('');
    setCurrentTranslationB('');
    currentTranslationARef.current = '';
    currentTranslationBRef.current = '';
    setErrorA(null);
    setErrorB(null);
    latestSourceRef.current = '';
  };

  // Re-translate the latest source line when target A changes. Routes to
  // interim translation (writing to the in-progress slot) so the visible
  // pane updates without clobbering accumulated history.
  useEffect(() => {
    if (!didMountARef.current) {
      didMountARef.current = true;
      return;
    }
    if (latestSourceRef.current.trim().length > 0) {
      void translateInterimA(latestSourceRef.current, sourceLangRef.current, targetA);
    }
  }, [targetA, translateInterimA]);

  useEffect(() => {
    if (!didMountBRef.current) {
      didMountBRef.current = true;
      return;
    }
    if (latestSourceRef.current.trim().length > 0) {
      void translateInterimB(latestSourceRef.current, sourceLangRef.current, targetB);
    }
  }, [targetB, translateInterimB]);

  // When the speech (source) language changes, restart recognition if listening
  // so the new language takes effect immediately. Do NOT clear transcript or
  // panes — by user contract, only the Clear button wipes UI state.
  useEffect(() => {
    if (!didMountSpeechLangRef.current) {
      didMountSpeechLangRef.current = true;
      return;
    }
    setInterimText('');
    setErrorA(null);
    setErrorB(null);

    if (handleRef.current) {
      handleRef.current.stop();
      handleRef.current = null;
      // Defer restart to the next tick so onend can fire first.
      const id = window.setTimeout(() => {
        handleStart();
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [speechLang, handleStart]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      abortARef.current?.abort();
      abortBRef.current?.abort();
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 22h8" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Voice Translation</h1>
              <p className="text-gray-600 dark:text-gray-400">Web Speech API + Chrome Translator API</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
          </div>
        </header>

        {!supported ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 text-amber-900 dark:text-amber-100 p-4">
            <strong>Live transcription unavailable.</strong> This demo requires Chrome desktop with
            microphone access. Try a Chromium-based browser on desktop.
          </div>
        ) : (
          <>
            {/* Section 1 — Source transcript */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Source ({speechLanguages.find((l) => l.code === speechLang)?.name ?? speechLang})
                </h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="speechLang" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    I'll speak in
                  </label>
                  <select
                    id="speechLang"
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {speechLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                {transcript.length === 0 && !interimText && !globalError && (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    Click "Start Listening" and speak — your words will appear here.
                  </p>
                )}
                <ul className="space-y-1">
                  {transcript.map((line, idx) => (
                    <li
                      key={idx}
                      className={
                        idx === transcript.length - 1
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100 rounded px-2 py-1'
                          : 'text-gray-800 dark:text-gray-200 px-2 py-1'
                      }
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                {interimText && (
                  <p className="italic text-gray-500 dark:text-gray-400 mt-2 px-2">
                    {interimText}
                  </p>
                )}
                {globalError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-3 px-2">
                    {globalError}
                  </p>
                )}
              </div>
            </section>

            {/* Section 2 — Two side-by-side translation panes */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Pane A */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="targetA" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pane A — Target Language
                  </label>
                  <select
                    id="targetA"
                    value={targetA}
                    onChange={(e) => setTargetA(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 min-h-[120px]">
                  {translationLinesA.length === 0 && !currentTranslationA && (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Translation will appear here...
                    </p>
                  )}
                  <ul className="space-y-1">
                    {translationLinesA.map((line, idx) => (
                      <li
                        key={idx}
                        className={
                          idx === translationLinesA.length - 1
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100 rounded px-2 py-1 whitespace-pre-wrap break-words'
                            : 'text-gray-800 dark:text-gray-200 px-2 py-1 whitespace-pre-wrap break-words'
                        }
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  {currentTranslationA && (
                    <p className="italic text-gray-500 dark:text-gray-400 mt-2 px-2 whitespace-pre-wrap break-words">
                      {currentTranslationA}
                    </p>
                  )}
                </div>
                {errorA && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorA}</p>
                )}
              </div>

              {/* Pane B */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="targetB" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pane B — Target Language
                  </label>
                  <select
                    id="targetB"
                    value={targetB}
                    onChange={(e) => setTargetB(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 min-h-[120px]">
                  {translationLinesB.length === 0 && !currentTranslationB && (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Translation will appear here...
                    </p>
                  )}
                  <ul className="space-y-1">
                    {translationLinesB.map((line, idx) => (
                      <li
                        key={idx}
                        className={
                          idx === translationLinesB.length - 1
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100 rounded px-2 py-1 whitespace-pre-wrap break-words'
                            : 'text-gray-800 dark:text-gray-200 px-2 py-1 whitespace-pre-wrap break-words'
                        }
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  {currentTranslationB && (
                    <p className="italic text-gray-500 dark:text-gray-400 mt-2 px-2 whitespace-pre-wrap break-words">
                      {currentTranslationB}
                    </p>
                  )}
                </div>
                {errorB && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorB}</p>
                )}
              </div>
            </section>

            {/* Section 3 — Controls */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <div className="flex flex-wrap items-center gap-4">
                {!isListening ? (
                  <button
                    onClick={handleStart}
                    className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v3" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 22h8" />
                    </svg>
                    Start Listening
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-red-300 animate-pulse mr-2" />
                    Stop
                  </button>
                )}

                <fieldset className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <legend className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
                    Mode
                  </legend>
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="final"
                      checked={mode === 'final'}
                      onChange={() => setMode('final')}
                      className="mr-2"
                    />
                    Per finalized sentence
                  </label>
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="interim"
                      checked={mode === 'interim'}
                      onChange={() => setMode('interim')}
                      className="mr-2"
                    />
                    Rolling interim (debounced)
                  </label>
                </fieldset>

                <button
                  onClick={handleClear}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveTranslatePage;
