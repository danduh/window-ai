---
phase: 260518-lig-live-voice-transcription-dual-translator
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - chat/src/app/services/LiveTranscriptionService.ts
  - chat/src/app/components/LiveTranslatePage.tsx
  - chat/src/app/AppRouter.tsx
  - chat/src/app/hooks/useSEOData.ts
  - chat/scripts/prerender-react.js
autonomous: true
requirements:
  - QUICK-260518-LIG
tags:
  - web-speech-api
  - translator-api
  - chat-spa
  - quick-task

must_haves:
  truths:
    - "Navigating to /live-translate renders a page with two empty translation panes and a mic Start button."
    - "Clicking Start (with mic permission granted) shows live transcript text appearing in the source pane."
    - "Each finalized sentence (Mode A — default) appears translated in BOTH language panes within ~1s."
    - "Toggling to Mode B causes interim transcripts to update both panes live (debounced ~300ms)."
    - "Changing a pane's language dropdown re-translates the latest source content into the new language."
    - "In an unsupported browser (no SpeechRecognition), a banner explains the requirement instead of crashing."
    - "`npx nx build chat` exits 0."
  artifacts:
    - path: "chat/src/app/services/LiveTranscriptionService.ts"
      provides: "Web Speech API wrapper with start/stop/isSupported"
      contains: "window.SpeechRecognition"
    - path: "chat/src/app/components/LiveTranslatePage.tsx"
      provides: "Three-section page: transcript log, dual translator panes, controls"
      contains: "LiveTranscriptionService"
    - path: "chat/src/app/AppRouter.tsx"
      provides: "/live-translate route + nav link"
      contains: "LiveTranslatePage"
    - path: "chat/src/app/hooks/useSEOData.ts"
      provides: "seoConfigs.liveTranslate entry"
      contains: "liveTranslate"
    - path: "chat/scripts/prerender-react.js"
      provides: "/live-translate prerender entry"
      contains: "/live-translate"
  key_links:
    - from: "LiveTranslatePage.tsx"
      to: "LiveTranscriptionService"
      via: "service.start(onInterim, onFinal) callbacks"
      pattern: "start\\("
    - from: "LiveTranslatePage.tsx onFinal callback"
      to: "TranslateService.translate"
      via: "fan-out: two translate() calls per finalized sentence (one per target language)"
      pattern: "translate\\("
    - from: "useSEOData.ts seoConfigs.liveTranslate"
      to: "prerender-react.js seoConfigs['/live-translate']"
      via: "verbatim-identical title/description/keywords (single source of truth pattern)"
      pattern: "Live Voice Translation"
---

<objective>
Add a new `/live-translate` demo to the `chat/` SPA that pipes Web Speech API live transcription into the existing TranslateService, fanning each transcript out to TWO simultaneously-displayed translation panes with independently-selected target languages.

Purpose: Showcase composition of two browser-native APIs (Web Speech API + Chrome Translator API) in a "2-min demo" — speak, see live multilingual translation. Brownfield addition: no new dependencies, only files inside `chat/`, no tests required.

Output: A new route, a thin Web Speech API service wrapper, a page component mirroring the existing `/translate` page styling, nav link, SEO entries, and prerender entry.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/STRUCTURE.md

@chat/src/app/components/TranslatePage.tsx
@chat/src/app/services/TranslateService.ts
@chat/src/app/AppRouter.tsx
@chat/src/app/hooks/useSEOData.ts
@chat/scripts/prerender-react.js

<interfaces>
<!-- Key contracts the executor needs. Extracted from codebase. -->

From chat/src/app/services/TranslateService.ts:
```typescript
export type AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available";

export const translate: (
  prompt: string,
  sourceLanguage?: string,   // default 'en'
  targetLanguage?: string,   // default 'ru'
  options?: Partial<TranslationOptions>  // { signal?: AbortSignal; monitor?; ... }
) => Promise<string>;

export const checkTranslationAvailability: (
  sourceLanguage: string,
  targetLanguage: string
) => Promise<AvailabilityStatus>;

export const detectPrimaryLanguage: (
  prompt: string,
  options?: LanguageDetectionOptions
) => Promise<string>;
```

From chat/src/app/hooks/useSEOData.ts:
```typescript
export const useSEOData: (config: SEOConfig, path?: string) => void;
export const seoConfigs: { home, chat, toolCalling, summary, translate, writer, webmcp, webmcpDocs, ... };
// SEOConfig = { title: string; description: string; keywords?: string; ogImage?: string }
```

From chat/src/app/AppRouter.tsx — existing translate registration pattern (lines 217-219):
```tsx
<Route path="/translate" element={<Navigate to="/translate/translate-api-documentation" replace/>}/>
<Route path="/translate/translate-api-documentation" element={<TranslatePage/>}/>
<Route path="/translate/translate-demo" element={<TranslatePage/>}/>
```

Nav link pattern (AppRouter.tsx lines 63-65 desktop, 150-152 mobile):
```tsx
<Link to="/translate"
      onClick={() => trackUserInteraction('navigation_click', 'translate_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Translate</Link>
```

Web Speech API shape (browser-native, no import needed; declare on window):
```typescript
// SpeechRecognitionEvent.results: SpeechRecognitionResultList
//   results[i].isFinal: boolean
//   results[i][0].transcript: string
// Configure: recognition.continuous = true; recognition.interimResults = true;
// Events: onresult, onerror, onend
// Methods: start(), stop()
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create LiveTranscriptionService + LiveTranslatePage with mode toggle and unavailability banner</name>

  <files>
    chat/src/app/services/LiveTranscriptionService.ts (NEW)
    chat/src/app/components/LiveTranslatePage.tsx (NEW)
  </files>

  <read_first>
    chat/src/app/services/TranslateService.ts — reuse `translate` and `checkTranslationAvailability`. Note default args (`sourceLanguage='en'`, `targetLanguage='ru'`) and AbortSignal support via `options.signal`.
    chat/src/app/components/TranslatePage.tsx — mirror header structure (lines 96-133), language `<select>` shape (lines 165-196 — same `languages` array), output pane styling (lines 277-285), `useSEOData(seoConfigs.X, '/path')` invocation at line 27, dark-mode classes throughout.
    chat/src/app/context/ThemeContext (referenced via `ThemeProvider` in AppRouter) — dark mode toggling is via Tailwind `dark:` variant; no special wiring needed in the page itself.
  </read_first>

  <action>
    Create `chat/src/app/services/LiveTranscriptionService.ts` (~80 lines):

    1. Declare Web Speech API types on `Window` interface inside a `declare global` block (the codebase already uses this pattern — see TranslateService.ts lines 4-16). Add:
       - `SpeechRecognition?: { new(): SpeechRecognition }`
       - `webkitSpeechRecognition?: { new(): SpeechRecognition }`
       And a local `SpeechRecognition` interface with: `continuous: boolean`, `interimResults: boolean`, `lang: string`, `start(): void`, `stop(): void`, `onresult: ((event: SpeechRecognitionEvent) => void) | null`, `onerror: ((event: Event) => void) | null`, `onend: (() => void) | null`. Define `SpeechRecognitionEvent` with `results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } }` plus a `resultIndex: number` field.

    2. Export `export const isSupported = (): boolean => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);`

    3. Export `export interface LiveTranscriptionHandle { stop: () => void }` and a `start` function with this exact signature:
       ```
       export const start = (
         onInterim: (text: string) => void,
         onFinal: (text: string) => void,
         options?: { lang?: string; onError?: (err: Error) => void; onEnd?: () => void }
       ): LiveTranscriptionHandle
       ```
       Inside `start`:
       - Throw `new Error('SpeechRecognition not supported in this browser')` if `!isSupported()`.
       - Resolve `const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;` then `const recognition = new Ctor();`
       - Set `recognition.continuous = true; recognition.interimResults = true; recognition.lang = options?.lang ?? 'en-US';`
       - On `onresult`: iterate from `event.resultIndex` to `event.results.length - 1`. For each result, take `result[0].transcript`. If `result.isFinal === true`, call `onFinal(transcript.trim())` (only when non-empty); else accumulate interims into a single string and call `onInterim(accumulatedInterim)` once at the end of the loop.
       - On `onerror`: forward to `options?.onError` with an `Error(event.error ?? 'speech recognition error')`.
       - On `onend`: forward to `options?.onEnd?.()`.
       - Call `recognition.start()`.
       - Return `{ stop: () => { try { recognition.stop(); } catch { /* idempotent */ } } }`.

    4. No streaming primitives (`ReadableStream`) — the service is event-callback shaped to match Web Speech's natural API.

    ---

    Create `chat/src/app/components/LiveTranslatePage.tsx` (~250 lines):

    Imports:
    - React, useState, useRef, useEffect, useCallback
    - `translate, checkTranslationAvailability, AvailabilityStatus` from `../services/TranslateService`
    - `isSupported as isLiveTranscriptionSupported, start as startLiveTranscription, LiveTranscriptionHandle` from `../services/LiveTranscriptionService`
    - `useSEOData, seoConfigs` from `../hooks/useSEOData`
    - `ThemeToggle` from `./ThemeToggle`

    Top-level constants (mirror TranslatePage.tsx):
    ```
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
    type Mode = 'final' | 'interim';
    const INTERIM_DEBOUNCE_MS = 300;
    ```

    Component body:
    - First line: `useSEOData(seoConfigs.liveTranslate, '/live-translate');`
    - State:
      - `isListening: boolean` (default false)
      - `mode: Mode` (default `'final'` — per D-02 Mode A is default)
      - `transcript: string[]` (array of finalized sentences for the source log)
      - `interimText: string` (the in-flight, not-yet-finalized text)
      - `targetA: string` (default `'es'`), `targetB: string` (default `'fr'`)
      - `translationA: string`, `translationB: string`
      - `errorA: string | null`, `errorB: string | null` (per-pane availability/error messages)
      - `globalError: string | null` (Speech API errors)
    - Refs:
      - `handleRef = useRef<LiveTranscriptionHandle | null>(null)`
      - `abortARef = useRef<AbortController | null>(null)`, `abortBRef = useRef<AbortController | null>(null)`
      - `debounceRef = useRef<number | null>(null)`
      - `latestSourceRef = useRef<string>('')` — most recent source text used for re-translation on language change.

    Source-language assumption: pass `'en'` as the source-language arg to `translate(...)` (Web Speech's default `lang='en-US'`). Per D-01 a language-pair detection beyond this is out of scope for the quick task.

    Translation fan-out helper:
    ```
    const translatePane = useCallback(
      async (text: string, target: string, pane: 'A' | 'B') => {
        if (!text.trim()) return;
        const setT = pane === 'A' ? setTranslationA : setTranslationB;
        const setErr = pane === 'A' ? setErrorA : setErrorB;
        const ref = pane === 'A' ? abortARef : abortBRef;
        ref.current?.abort();
        const ctrl = new AbortController();
        ref.current = ctrl;
        setErr(null);
        try {
          const avail = await checkTranslationAvailability('en', target);
          if (avail === 'unavailable') {
            setErr(`Language pair en->${target} unavailable on this Chrome build`);
            return;
          }
          const out = await translate(text, 'en', target, { signal: ctrl.signal });
          if (!ctrl.signal.aborted) setT(out);
        } catch (e) {
          if ((e as Error).message?.includes('aborted')) return;
          setErr((e as Error).message);
        }
      },
      []
    );
    ```

    Effect on transcript/finalized chunk handling — wire inside the Start button click handler. Define a callback `handleFinal` that:
    1. `setTranscript(prev => [...prev, text])`
    2. `latestSourceRef.current = text;`
    3. `void translatePane(text, targetA, 'A'); void translatePane(text, targetB, 'B');`

    Define `handleInterim` that:
    1. `setInterimText(text);`
    2. If `mode === 'interim'`: clear `debounceRef.current` if set, then `debounceRef.current = window.setTimeout(() => { latestSourceRef.current = text; void translatePane(text, targetA, 'A'); void translatePane(text, targetB, 'B'); }, INTERIM_DEBOUNCE_MS);`

    Start/Stop:
    ```
    const handleStart = () => {
      setGlobalError(null);
      try {
        handleRef.current = startLiveTranscription(handleInterim, handleFinal, {
          lang: 'en-US',
          onError: (err) => { setGlobalError(err.message); setIsListening(false); },
          onEnd: () => setIsListening(false),
        });
        setIsListening(true);
      } catch (e) {
        setGlobalError((e as Error).message);
      }
    };
    const handleStop = () => {
      handleRef.current?.stop();
      handleRef.current = null;
      setIsListening(false);
    };
    const handleClear = () => {
      setTranscript([]); setInterimText(''); setTranslationA(''); setTranslationB('');
      setErrorA(null); setErrorB(null); latestSourceRef.current = '';
    };
    ```

    Re-translate on target language change: add a `useEffect` watching `[targetA]` (and another for `[targetB]`) that calls `translatePane(latestSourceRef.current, targetA, 'A')` (and B respectively), only when `latestSourceRef.current` is non-empty. Skip on initial mount via a `didMountRef`.

    Cleanup `useEffect` returning `() => { handleRef.current?.stop(); abortARef.current?.abort(); abortBRef.current?.abort(); if (debounceRef.current) clearTimeout(debounceRef.current); }`.

    JSX — three vertically-stacked sections wrapped in `<div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200"><div className="max-w-6xl mx-auto p-4">`:

    1. **Header**: Mirror TranslatePage.tsx header structure (gradient icon, title "Live Voice Translation", subtitle "Web Speech API + Chrome Translator API", and `<ThemeToggle />` on the right). Use a microphone-shaped SVG icon (any `viewBox="0 0 24 24"` mic path, e.g. `M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z M19 11a7 7 0 01-14 0 M12 19v3 M8 22h8`).

    2. **Unavailability banner** (D-07): If `!isLiveTranscriptionSupported()`, render in place of the transcript section:
       ```
       <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 text-amber-900 dark:text-amber-100 p-4">
         <strong>Live transcription unavailable.</strong> This demo requires Chrome desktop with microphone access. Try a Chromium-based browser on desktop.
       </div>
       ```
       And short-circuit rendering of the controls + panes (or render them disabled). Mirror the informational, non-alarming tone described in MissingFlagBanner.tsx pattern from the codebase.

    3. **Section 1 — Source transcript** (only when supported): A scrollable card with `max-h-48 overflow-y-auto` showing each finalized sentence in `transcript` as a list item, with the latest sentence highlighted (e.g. background `bg-primary-50 dark:bg-primary-900/30`), followed by the live `interimText` rendered in italic gray. If `globalError`, show it in a red text row.

    4. **Section 2 — Two side-by-side panes** (`grid grid-cols-1 md:grid-cols-2 gap-4`): Each pane is a card with:
       - Header row: a language `<select>` (bound to `targetA` / `targetB`) populated from the `languages` array, with `onChange` updating state.
       - Body: `<pre className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 font-sans min-h-[120px]">{translationA || 'Translation will appear here...'}</pre>` (and `translationB`).
       - Footer (conditional): if `errorA` is non-null, render `<p className="text-sm text-red-600 dark:text-red-400">{errorA}</p>`.

    5. **Section 3 — Controls** (bottom, flex row, `flex flex-wrap items-center gap-3`):
       - Start/Stop button (toggles based on `isListening`): when idle, primary blue button labeled "Start Listening" with a mic icon. When listening, red button labeled "Stop" with a pulsing red dot (`<span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"/>`).
       - Mode toggle: two radio buttons (or a styled segmented control) for "Per finalized sentence" (`value='final'`) and "Rolling interim (debounced)" (`value='interim'`).
       - Clear button: secondary gray button labeled "Clear".

    `export default LiveTranslatePage;` at the end.
  </action>

  <verify>
    <automated>cd /Users/danielos/dev/window-ai && test -f chat/src/app/services/LiveTranscriptionService.ts && test -f chat/src/app/components/LiveTranslatePage.tsx && grep -F "window.SpeechRecognition" chat/src/app/services/LiveTranscriptionService.ts && grep -F "window.webkitSpeechRecognition" chat/src/app/services/LiveTranscriptionService.ts && [ "$(grep -F -c 'translate(' chat/src/app/components/LiveTranslatePage.tsx)" -ge 2 ] && grep -F "LiveTranscriptionService" chat/src/app/components/LiveTranslatePage.tsx && grep -F "checkTranslationAvailability" chat/src/app/components/LiveTranslatePage.tsx && grep -F "INTERIM_DEBOUNCE_MS" chat/src/app/components/LiveTranslatePage.tsx && grep -F "isSupported" chat/src/app/services/LiveTranscriptionService.ts && grep -F "useSEOData(seoConfigs.liveTranslate" chat/src/app/components/LiveTranslatePage.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `chat/src/app/services/LiveTranscriptionService.ts` exists, references `window.SpeechRecognition` AND `window.webkitSpeechRecognition`, exports `isSupported` and `start` symbols.
    - `chat/src/app/components/LiveTranslatePage.tsx` exists, imports from `../services/TranslateService` AND `../services/LiveTranscriptionService`, references `useSEOData(seoConfigs.liveTranslate, '/live-translate')`, and calls `translate(...)` at least twice (one per pane).
    - File contains a mode toggle (search: `'final'` and `'interim'` both appear), a debounce constant `INTERIM_DEBOUNCE_MS`, and an unavailability fallback branch.
    - Component uses `AbortController` for in-flight translation cancellation (search: `AbortController` present).
    - No new `dependencies` added to `package.json` (verify via `git status chat/package.json` or root `package.json` showing no diff).
  </acceptance_criteria>

  <done>
    Both files exist. The page renders structurally (route not yet wired — Task 2 handles routing). TypeScript compiles in the chat workspace. `LiveTranscriptionService.isSupported()` returns true in Chrome, false in jsdom test environment without crashing.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire route, nav link, SEO config, and prerender entry for /live-translate</name>

  <files>
    chat/src/app/AppRouter.tsx (EDIT)
    chat/src/app/hooks/useSEOData.ts (EDIT)
    chat/scripts/prerender-react.js (EDIT)
  </files>

  <read_first>
    chat/src/app/AppRouter.tsx — note the existing `/translate` route triplet (lines 216-219 region), the desktop nav `<Link to="/translate">` (line 63 region), AND the mobile nav `<Link to="/translate">` (line 150 region). Both nav locations must get a new Live Translate link.
    chat/src/app/hooks/useSEOData.ts — note `seoConfigs` shape (line 31+). Each entry has `title`, `description`, `keywords`. The `webmcpDocs` entry (lines 67-73) has the inline comment about verbatim parity with prerender-react.js — follow that same single-source-of-truth pattern.
    chat/scripts/prerender-react.js — note the `routes` array (lines 25-56) AND the in-function `seoConfigs` object inside `getSEODataForRoute` (lines 113-368). Each route can have a structuredData block — add one mirroring `/translate`.
  </read_first>

  <action>
    **Edit `chat/src/app/AppRouter.tsx`:**

    1. At the top with the other component imports (around lines 4-9), add:
       ```
       import LiveTranslatePage from "./components/LiveTranslatePage";
       ```

    2. In the desktop nav `<div className="flex space-x-4">` block (around line 50-72), insert a new `<Link>` immediately AFTER the existing `<Link to="/translate">` and BEFORE `<Link to="/webmcp">`:
       ```
       <Link to="/live-translate"
             onClick={() => trackUserInteraction('navigation_click', 'live_translate_link')}
             className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Live Translate</Link>
       ```

    3. In the mobile nav block (around line 137-158), insert the analogous mobile link AFTER the `<Link to="/translate">` mobile link and BEFORE the `<Link to="/webmcp">` mobile link:
       ```
       <Link to="/live-translate"
             onClick={() => trackUserInteraction('navigation_click', 'live_translate_link_mobile')}
             className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Live Translate</Link>
       ```

    4. In the `<Routes>` block (around line 216-219, right after the `{/* Translate routes */}` block and before `{/* WebMCP routes */}`), add a new comment block + route:
       ```
       {/* Live Translate routes */}
       <Route path="/live-translate" element={<LiveTranslatePage/>}/>
       ```
       Note: unlike `/translate`, this is a single-page demo (no separate docs tab in scope for this quick task), so we register `/live-translate` directly — no `Navigate` redirect and no `-demo` / `-api-documentation` siblings. This matches the simpler `/webmcp` registration pattern (line 222).

    **Edit `chat/src/app/hooks/useSEOData.ts`:**

    Add a new entry inside `seoConfigs` (between `translate` and `writer`, OR between `webmcpDocs` and the closing `} as const;` — either works; pick the alphabetical-ish spot just after `translate`). Add an inline comment matching the `webmcpDocs` pattern (lines 67-68) noting prerender parity:

    ```
    // Must match prerender-react.js seoConfigs['/live-translate'] verbatim — single source of truth.
    liveTranslate: {
      title: 'Live Voice Translation - Chrome Speech + Translator demo | Chrome AI APIs',
      description: 'Speak live in your browser and watch your words translated simultaneously into two languages. Combines the Web Speech API with Chrome\'s on-device Translator API — no server, no upload.',
      keywords: 'live translation, voice translation, Web Speech API, speech recognition, real-time translation, Chrome AI, on-device translation, dual translation, simultaneous translation'
    },
    ```

    **Edit `chat/scripts/prerender-react.js`:**

    1. In the `routes` array (lines 25-56), add a new entry after the `/translate` block (after line 47) and before the `/writer` block:
       ```
       // Live Translate route (single-page, no docs/demo split)
       { path: '/live-translate', filename: 'live-translate.html' },
       ```

    2. In the `seoConfigs` object inside `getSEODataForRoute` (lines 113-368), add a new entry after `/translate/translate-demo` (line 303) and before `/writer` (line 304). Use VERBATIM the same title/description/keywords strings as the `liveTranslate` entry in `useSEOData.ts` — copy-paste exactly. Include `structuredData`:
       ```
       '/live-translate': {
         title:
           'Live Voice Translation - Chrome Speech + Translator demo | Chrome AI APIs',
         description:
           'Speak live in your browser and watch your words translated simultaneously into two languages. Combines the Web Speech API with Chrome\'s on-device Translator API — no server, no upload.',
         keywords:
           'live translation, voice translation, Web Speech API, speech recognition, real-time translation, Chrome AI, on-device translation, dual translation, simultaneous translation',
         structuredData: {
           '@context': 'https://schema.org',
           '@type': 'WebPage',
           name: 'Live Voice Translation Demo',
           description:
             'Live speech-to-text fanned into dual simultaneous translations',
         },
       },
       ```

    **Cross-file SEO parity check (per D-03):** After editing, the title string `Live Voice Translation - Chrome Speech + Translator demo | Chrome AI APIs` MUST appear in both files. The description MUST be byte-identical. Same for keywords. This is enforced by the verify step's `grep -F` cross-file count.

    **Build verification:** After edits, run `npx nx build chat` from the repo root. Must exit 0. If a TS error appears (e.g. import path typo from Task 1), fix the underlying issue and rebuild.
  </action>

  <verify>
    <automated>cd /Users/danielos/dev/window-ai && grep -F "/live-translate" chat/src/app/AppRouter.tsx && grep -F "LiveTranslatePage" chat/src/app/AppRouter.tsx && grep -F "live_translate_link" chat/src/app/AppRouter.tsx && grep -F "live_translate_link_mobile" chat/src/app/AppRouter.tsx && grep -F "liveTranslate:" chat/src/app/hooks/useSEOData.ts && grep -F "/live-translate" chat/scripts/prerender-react.js && [ "$(grep -F -c 'Live Voice Translation - Chrome Speech + Translator demo' chat/src/app/hooks/useSEOData.ts chat/scripts/prerender-react.js | awk -F: '{s+=$2} END {print s}')" -ge 2 ] && npx nx build chat</automated>
  </verify>

  <acceptance_criteria>
    - `AppRouter.tsx` imports `LiveTranslatePage`, has a `/live-translate` `<Route>`, AND has both desktop + mobile nav `<Link to="/live-translate">` entries (search for `live_translate_link` AND `live_translate_link_mobile`).
    - `useSEOData.ts` contains `liveTranslate:` key inside `seoConfigs`.
    - `prerender-react.js` contains both a `{ path: '/live-translate', filename: 'live-translate.html' }` route entry AND a `'/live-translate':` key inside the in-function `seoConfigs`.
    - The title string `Live Voice Translation - Chrome Speech + Translator demo | Chrome AI APIs` appears at least once in `useSEOData.ts` AND at least once in `prerender-react.js` (cross-file parity).
    - `npx nx build chat` exits 0.
  </acceptance_criteria>

  <done>
    Navigating to `/live-translate` in `npx nx serve chat` renders the LiveTranslatePage component. Nav links appear in both desktop and mobile menus. Production build (`npx nx build chat`) succeeds. The prerendered `live-translate.html` will be generated on the next prerender pass with the matching SEO meta tags.
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

1. **Smoke test (manual, optional):**
   - `npx nx serve chat` → open `http://localhost:4300/live-translate`
   - Click "Start Listening", grant mic permission, speak a short English sentence
   - Confirm: source pane shows transcript; both translation panes (default `es` + `fr`) populate within ~1s
   - Toggle to "Rolling interim", speak again, confirm both panes update live with debounce
   - Change one pane's dropdown to a different language, confirm re-translation of the latest source text
   - In Firefox (or any browser without SpeechRecognition), confirm the unavailability banner renders instead of a crash

2. **Build gate:** `npx nx build chat` exits 0. Already part of Task 2's verify.

3. **No regression:** Existing routes (`/translate`, `/webmcp`, `/chat`, etc.) still load. The chat workspace tests still pass (`npx nx test chat` exits 0, no new tests added per D-09).

4. **Cross-file SEO parity:** The `liveTranslate` title/description/keywords in `useSEOData.ts` are byte-identical to the corresponding `/live-translate` entry in `prerender-react.js`.

5. **Brownfield constraint (D-08):** `git diff --stat` shows only files inside `chat/`. No edits to `mcp/`, `mcp-client/`, `devops/awsweb/`, or `chrome-llm-ts/`. No new entries in `package.json` `dependencies` or `devDependencies`.
</verification>

<success_criteria>
- [x] D-01 honored: two `<select>` dropdowns drive both panes; default pair `es` + `fr`.
- [x] D-02 honored: mode toggle UI with "final" (default) and "interim" (debounced ~300ms with AbortController cancellation on new interim) options.
- [x] D-03 honored: route is `/live-translate`; nav link added; SEO config in both `useSEOData.ts` AND `prerender-react.js` (verbatim parity).
- [x] D-04 honored: page imports and calls `translate` + `checkTranslationAvailability` from existing `TranslateService.ts`; no re-implementation. Per-pane availability failures surface inline.
- [x] D-05 honored: `window.SpeechRecognition || window.webkitSpeechRecognition` with `continuous = true`, `interimResults = true`; Start/Stop UI states.
- [x] D-06 honored: three vertically-stacked sections (transcript / dual panes / controls), dark-mode-aware styling mirroring TranslatePage.tsx.
- [x] D-07 honored: graceful unavailability banner with informational tone (no crash, no alarm).
- [x] D-08 honored: only files inside `chat/` touched; no new npm dependencies.
- [x] D-09 honored: no new tests required; existing suite must not regress.
- [x] All seven `must_haves.truths` are verifiable by a human running `npx nx serve chat` in Chrome.
- [x] `npx nx build chat` exits 0.
</success_criteria>

<output>
After completion, the executor should create `.planning/quick/260518-lig-live-voice-transcription-dual-translator/260518-lig-SUMMARY.md` recording:
- Files created (2): `LiveTranscriptionService.ts`, `LiveTranslatePage.tsx`
- Files edited (3): `AppRouter.tsx`, `useSEOData.ts`, `prerender-react.js`
- Confirmation that `npx nx build chat` passed
- Any notes about Web Speech API quirks discovered during implementation (e.g. `webkit` prefix usage, `onresult` event shape gotchas)
- Demo URL for the user: `http://localhost:4300/live-translate`
</output>
