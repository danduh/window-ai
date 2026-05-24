# Live Voice Translation Usage Guide — Web Speech API + Chrome Translator

This document is a complete reference for building **live, on-device voice translation** in the browser by composing two standalone web APIs:

- The **Web Speech API** (`SpeechRecognition`) — turns the microphone feed into a stream of interim and final text results.
- The **Chrome Translator API** (`Translator`) — translates each result into one or more target languages, all locally.

Together they let a page transcribe a speaker, then fan that transcript out into N simultaneous translation columns without a single network round-trip.

## Overview

The two APIs are independent, but they meet in the middle:

| API                | Input             | Output                              | Where it lives           |
|--------------------|-------------------|-------------------------------------|--------------------------|
| `SpeechRecognition`| microphone audio  | `interim` text + `isFinal` text     | Web Speech (all browsers)|
| `Translator`       | text + lang pair  | translated text (sync or streaming) | Chrome 131+ on-device    |

The bridge between them is **language tags**: speech recognition wants BCP 47 (`en-US`, `fr-FR`), while the Translator wants short ISO codes (`en`, `fr`). Stripping everything after the hyphen converts one to the other.

## Prerequisites

### Browser Support

- **`SpeechRecognition`** — Chromium-based browsers, desktop. Available as `window.SpeechRecognition` or the legacy-prefixed `window.webkitSpeechRecognition`. Not supported on Firefox or iOS Safari at the time of writing.
- **`Translator`** — Chrome 131+ on Windows, macOS, Linux. Each `(sourceLanguage, targetLanguage)` pair downloads a language pack on first use.

### Feature Detection

```javascript
const SpeechRecognitionCtor =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognitionCtor) {
  console.warn("Speech recognition not available — Chromium desktop required");
}

if (typeof Translator === "undefined") {
  console.warn("Translator API not available — enable chrome://flags/#translation-api");
}
```

### Setup — Translator Flag (if needed)

If `Translator` is undefined on a Chrome that should support it:

```
chrome://flags/#translation-api
```

Set to **Enabled** (or **Enabled without language pack limit** for more pairs) and restart. Manage installed packs at `chrome://on-device-translation-internals/`.

### Checking Translator Availability for a Pair

```javascript
const status = await Translator.availability({
  sourceLanguage: "en",
  targetLanguage: "fr"
});
// "available", "downloadable", "downloading", or "unavailable"
```

## Part 1 — Web Speech API

### Minimal Live Transcription

```javascript
const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new Ctor();

recognition.continuous = true;       // keep listening across pauses
recognition.interimResults = true;   // emit partial results while speaking
recognition.lang = "en-US";          // BCP 47 — see "Language Tags" below

recognition.onresult = (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0].transcript;
    if (result.isFinal) {
      console.log("FINAL:", text);
    } else {
      console.log("interim:", text);
    }
  }
};

recognition.onerror = (event) => {
  console.error("speech error:", event.error || event.message);
};

recognition.onend = () => {
  console.log("recognizer ended");
};

recognition.start();
// later...
recognition.stop();
```

### Interpreting `event.results`

`event.results` is a list-like collection of `SpeechRecognitionResult` objects. Each result has a `length`-of-alternatives and an `isFinal` flag:

- **interim results** (`isFinal === false`) are guesses-so-far. They're replaced as the speaker continues — don't append them to a permanent transcript.
- **final results** (`isFinal === true`) are committed sentences. Append these.

`event.resultIndex` tells you the index of the **first** result that has changed since the last `onresult` callback — start iterating from there to avoid re-processing earlier finals.

### Splitting Finals from Interims

Two helpful handlers — one append-only, one replace-only:

```javascript
function makeHandlers(onInterim, onFinal) {
  return (event) => {
    let interimBuffer = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) {
        const trimmed = text.trim();
        if (trimmed) onFinal(trimmed);
      } else {
        interimBuffer += text;
      }
    }
    if (interimBuffer.trim()) onInterim(interimBuffer);
  };
}

recognition.onresult = makeHandlers(
  (interim) => updateLivePreview(interim),
  (final)   => appendToTranscript(final)
);
```

### Stop / Restart

`recognition.stop()` is idempotent — calling it twice is safe. The recognizer fires `onend` after it actually stops; subscribe there to flip your UI state.

When changing language mid-session, stop and restart:

```javascript
recognition.stop();
// brief tick to let onend run
setTimeout(() => {
  recognition.lang = "fr-FR";
  recognition.start();
}, 50);
```

## Part 2 — Chrome Translator

### Per-Pair Sessions

A `Translator` is bound to a `(sourceLanguage, targetLanguage)` pair at creation. You'll need one per target column.

```javascript
const enToFr = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "fr"
});

const sentence = await enToFr.translate("How are you today?");
// "Comment allez-vous aujourd'hui ?"
```

### Streaming Translations

For long sentences (or simply nicer feel), use streaming:

```javascript
const stream = enToFr.translateStreaming("…long paragraph…");
const reader = stream.getReader();

let translated = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  translated += value;
  renderTranslation(translated);
}
```

### Caching Translators

Creating a translator may trigger a language pack download. Cache one per pair:

```javascript
const cache = new Map();

async function getTranslator(sourceLanguage, targetLanguage) {
  const key = `${sourceLanguage}|${targetLanguage}`;
  let translator = cache.get(key);
  if (!translator) {
    translator = await Translator.create({ sourceLanguage, targetLanguage });
    cache.set(key, translator);
  }
  return translator;
}
```

When the source language changes mid-session (speaker switches language), the existing translator entries stay valid — they just translate from a different language now. You don't have to clear the cache.

## Part 3 — Composing Them

The classic UX has two modes — **per-sentence** (translate each final result) and **rolling interim** (translate the current interim string as the speaker is still talking).

### Per-Sentence Mode

```javascript
const targetLangs = ["es", "fr", "de"];
const sourceLang = "en";

async function translateSentence(sentence) {
  for (const target of targetLangs) {
    const t = await getTranslator(sourceLang, target);
    const out = await t.translate(sentence);
    appendToColumn(target, out);
  }
}

recognition.onresult = makeHandlers(
  () => {},                        // ignore interims in this mode
  (final) => translateSentence(final)
);
```

Each finalized sentence appears immediately in every column.

### Rolling Interim Mode

```javascript
const inFlight = new Map(); // target -> AbortController

async function translateInterim(text) {
  for (const target of targetLangs) {
    // Cancel the previous in-flight call for this column.
    inFlight.get(target)?.abort();
    const controller = new AbortController();
    inFlight.set(target, controller);

    try {
      const t = await getTranslator(sourceLang, target);
      const out = await t.translate(text, { signal: controller.signal });
      replaceColumnPreview(target, out);
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }
}

recognition.onresult = makeHandlers(
  (interim) => translateInterim(interim),
  (final) => {
    inFlight.forEach((c) => c.abort());
    inFlight.clear();
    translateSentence(final);   // commit the final
  }
);
```

Each new interim cancels the previous translation per column — the user sees a live, rolling translation that resolves to the final once the speaker pauses.

### Fanning Out to N Columns

The two modes generalize to any number of targets without extra orchestration — each column just calls `getTranslator(source, itsTarget)` and renders independently:

```javascript
function addColumn(targetLang) {
  // create DOM column
  // when a sentence arrives, the existing translateSentence/translateInterim
  // will pick it up because it iterates targetLangs.
  targetLangs.push(targetLang);
}

function removeColumn(targetLang) {
  inFlight.get(targetLang)?.abort();
  inFlight.delete(targetLang);
  targetLangs.splice(targetLangs.indexOf(targetLang), 1);
}
```

## Language Tags

`SpeechRecognition.lang` expects BCP 47, while `Translator` expects the short ISO part. The short form is just everything before the first hyphen:

```javascript
function toTranslatorLang(speechLang) {
  return speechLang.split("-")[0];
}

toTranslatorLang("en-US");   // "en"
toTranslatorLang("zh-Hans"); // "zh"
toTranslatorLang("fr-FR");   // "fr"
```

Common pairs that work well on Chrome desktop today:

| Speech `lang` | Translator source |
|---------------|-------------------|
| `en-US`       | `en`              |
| `en-GB`       | `en`              |
| `es-ES`       | `es`              |
| `fr-FR`       | `fr`              |
| `de-DE`       | `de`              |
| `ja-JP`       | `ja`              |
| `uk-UA`       | `uk`              |
| `ru-RU`       | `ru`              |
| `he-IL`       | `he`              |
| `ar-SA`       | `ar`              |

## Error Handling

### Microphone Permission

`SpeechRecognition` will fire `onerror` with `event.error === "not-allowed"` when the user denies the mic. Subscribe to `onerror` and flip your UI state — there is no separate permission API to query first.

```javascript
recognition.onerror = (e) => {
  if (e.error === "not-allowed") {
    show("Microphone blocked — enable in browser settings");
  } else if (e.error === "no-speech") {
    // user is silent; recognition will end on its own
  } else if (e.error === "network") {
    show("Network error — Web Speech needs a connection on this platform");
  } else {
    show("Speech error: " + (e.error || e.message));
  }
};
```

Note that some Web Speech implementations forward audio to a remote server even though the demo feels "local" — that's a platform decision out of your control. Chrome's `Translator` is on-device.

### Translator Errors

```javascript
try {
  const out = await translator.translate(text);
} catch (e) {
  if (e instanceof DOMException) {
    if (e.name === "AbortError") return;          // cancelled
    if (e.name === "QuotaExceededError") {
      console.error("Input too long for one translation call");
    }
    if (e.name === "NotSupportedError") {
      console.error("Language pair not supported");
    }
    if (e.name === "NetworkError") {
      console.error("Language pack download failed");
    }
  }
}
```

## Cancellation and Cleanup

```javascript
// Stop everything on page unload.
window.addEventListener("beforeunload", () => {
  recognition.stop();
  for (const [, controller] of inFlight) controller.abort();
  for (const [, t] of cache) t.destroy?.();
});
```

`Translator.destroy()` releases the model from memory and aborts any in-flight `translate()`/`translateStreaming()` with `AbortError`.

## Best Practices

1. **Reuse translators.** Hold one per `(source, target)` pair for the lifetime of the page. Don't recreate per sentence.
2. **Iterate from `event.resultIndex`.** Speech results accumulate — starting from `resultIndex` is how you avoid re-rendering earlier finals on every callback.
3. **Cancel interim translations.** In rolling-interim mode, every new interim must abort the previous one per column. Otherwise old translations land out of order.
4. **Use streaming for long sentences.** `translateStreaming()` lets the column feel responsive even for paragraph-length finals.
5. **Restart on language change.** When the speaker changes language, stop the recognizer, update `recognition.lang`, and start again on the next tick.
6. **Surface mic permission errors inline.** No `alert()` — they need a dismiss button and the rest of the page needs to stay usable.
7. **Keep transcript append-only.** Interim text is replaceable, but once a sentence is `isFinal`, treat it as immutable — that's what users expect a transcript to do.

## Using with TypeScript

```typescript
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!Ctor) throw new Error("Web Speech API not supported");

const recognition: SpeechRecognitionLike = new Ctor();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";
```

## Conclusion

Live voice translation is two independent APIs cooperating on language tags. The Web Speech API delivers a stream of interim + final text, and a small pool of cached `Translator` instances fans each result out into N target columns — per-sentence or rolling-interim, the choice is just where in the result handler you trigger the translation. Stripping BCP 47 down to the short ISO code is the only glue between them.
