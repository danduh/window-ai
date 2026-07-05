# Translation — `Translator`, `LanguageDetector`, and live voice translation

## The two translation APIs

Chrome ships two complementary on-device translation surfaces:

- **`LanguageDetector`** — given some text, identifies the language with a confidence score.
- **`Translator`** — given source language + target language + text, returns translated text.

Both have been **stable since Chrome 138** (along with `Summarizer`) — the 131-era builds were earlier origin trials, not the stable release. As of the current stable browser (Chrome 150, June 2026) they ship in every desktop Chrome. Both ship per-language packs on demand. Both run fully on-device with no network round-trip.

Together with the Web Speech API (a much older browser surface), they compose into the killer demo for this whole platform: **real-time, multi-target voice translation** with no backend.

---

## LanguageDetector

```js
const detector = await LanguageDetector.create();

const results = await detector.detect('Bonjour, comment ça va?');
// [
//   { detectedLanguage: 'fr', confidence: 0.99 },
//   { detectedLanguage: 'ht', confidence: 0.005 },
//   ...
// ]

detector.destroy();
```

The result is an array sorted by confidence descending. The top entry is usually all you need; the rest are for edge cases (mixed-language input, very short text).

### Use cases

- Auto-pick the source language for a translation
- Route user messages to the right NLP pipeline by language
- Detect when a user pastes content in an unexpected language and prompt for translation
- Hide the "translate this" button when the text is already in the user's language

### Confidence thresholds

The model is confident on text ≥ 20 chars. Below that, confidence drops sharply. For UI like "auto-translate when source lang ≠ user lang", set a threshold like `confidence > 0.7` and fall back to "ask the user" below that.

---

## Translator

```js
// Check pair availability first
const status = await Translator.availability({
  sourceLanguage: 'en',
  targetLanguage: 'es',
});
// 'available' | 'downloadable' | 'downloading' | 'unavailable'

const translator = await Translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  monitor(m) {
    m.addEventListener('downloadprogress', e =>
      console.log(`Lang pack: ${(e.loaded/e.total*100).toFixed(1)}%`));
  },
});

const text = await translator.translate('Hello, how are you?');
// "Hola, ¿cómo estás?"

// Streaming variant (useful for long input):
const stream = translator.translateStreaming(longText);
for await (const chunk of stream) appendToUI(chunk);

translator.destroy();
```

### Per-pair packs

Each `(source, target)` pair downloads its own language pack on first use. Packs are typically 10–50 MB. Subsequent translations use the cached pack with no network.

You can pre-warm a pack in the background before the user needs it:

```js
// Pre-warm en→fr while the user is reading something
await Translator.create({ sourceLanguage: 'en', targetLanguage: 'fr' });
```

### Translation quality

Quality is comparable to Google Translate web for the major languages (English, Spanish, French, German, Portuguese, Japanese, Korean, Chinese, Arabic, Hebrew, Russian). It drops for low-resource languages and for technical / domain-specific content (medical, legal). For those cases, fall back to a cloud translator.

### Streaming caveat

`translateStreaming` returns chunks aligned to translation units, not characters — for short input you might get the whole answer in one chunk. The benefit appears at >200 character inputs.

---

## Language tags — BCP 47 vs ISO

The two APIs use different tag conventions, and this trips people up:

| Surface | Tag format | Example |
|---|---|---|
| `SpeechRecognition.lang` | BCP 47 | `en-US`, `fr-FR`, `pt-BR` |
| `Translator` source/target | Short ISO (2-3 letter) | `en`, `fr`, `pt` |
| `LanguageDetector` output | Short ISO | `en`, `fr`, `pt` |

The conversion is simple — strip the hyphen suffix:

```js
const short = bcp47.split('-')[0];   // 'en-US' → 'en'
```

For regional translation pairs that matter (e.g., `pt-BR` vs `pt-PT`), some translators support the regional code; check `Translator.availability({ sourceLanguage: 'pt-BR', targetLanguage: 'en' })` first.

---

## The killer demo: live voice translation

Compose Web Speech API + Translator and you've got the demo that makes every audience lean forward.

```js
// 1. Pick languages
const SOURCE = 'en-US';
const TARGETS = ['es', 'fr', 'de', 'ja'];

// 2. Pre-warm translators
const translators = await Promise.all(
  TARGETS.map(t => Translator.create({
    sourceLanguage: SOURCE.split('-')[0],
    targetLanguage: t,
  }))
);

// 3. Start recognition
const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new Ctor();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = SOURCE;

recognition.onresult = async (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (!result.isFinal) continue;

    const transcript = result[0].transcript;
    const translations = await Promise.all(
      translators.map(t => t.translate(transcript))
    );

    renderColumns(transcript, translations);
  }
};

recognition.start();
```

### Why this demo works

1. **No backend, no key.** The audience watches you do live multi-language translation with the dev tools network tab open — zero requests.
2. **Latency is shocking.** Translations appear within ~100 ms of the speech result. Cloud translation services are 300–1500 ms.
3. **Scales linearly.** Add 4 more target languages — still instant. The bottleneck is the speech-to-text, not the translation.
4. **Privacy story is dramatic.** "Everything you just heard me say stayed on this laptop." Lawyers in the audience perk up.

### The site has a working demo

The `/live-translate` route in this project does exactly this. Open it during the talk and speak into the microphone. Use it as the opener.

---

## Common pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| BCP 47 passed to Translator | `unavailable` for valid language | Strip the region code |
| Pair pack not pre-warmed | First translation takes 5–30 sec | `await Translator.create()` ahead of need |
| Microphone permission not pre-granted | Demo dies on stage | Use the page once before the talk to grant |
| `interimResults: false` | UI feels laggy | Set to `true`, render interim differently |
| One `recognition.onerror` and stop | Demo dies on first network blip | Auto-restart on `no-speech`, `network`, `aborted` |

## When to fall back to cloud translation

- **Right-to-left** languages where positional accuracy matters (legal, religious texts) — on-device occasionally fumbles ordering.
- **Long-form technical content** (academic papers, code comments) — quality drops vs. premium cloud services.
- **Languages outside the major ~50** — pack may not be available.

A reasonable hybrid: on-device by default, "improve translation" button that re-runs the same text through a cloud service for users who care about edge quality.
