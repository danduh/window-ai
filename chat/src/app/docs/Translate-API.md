# Chrome Translation API Usage Guide

This document provides a comprehensive guide on how to use Chrome's built-in Translation and Language Detection APIs. These APIs provide on-device translation and language detection capabilities without requiring external services.

## Overview

Chrome's Translation API consists of two main components:
- **Language Detection API**: Detects the language of input text with confidence scores
- **Translation API**: Translates text between supported language pairs

Both APIs support streaming responses, download progress monitoring, and proper error handling with quota management.

## Prerequisites

### Browser Support

1. **Language Detection API**:
    - Available from Chrome 129+ on desktop and Android
    - Supported platforms: Android, ChromeOS, Windows, Mac, and Linux (not iOS)
    - No special hardware requirements

2. **Translation API**:
    - Available from Chrome 131+ 
    - Supported platforms: Windows, Mac, and Linux
    - Requires language packs to be downloaded

### Setup Instructions

1. **Enable Language Detection API**:
    ```
    chrome://flags/#language-detection-api
    ```
    Set to `Enabled` and restart Chrome.

2. **Enable Translation API**:
    ```
    chrome://flags/#translation-api
    ```
    Set to `Enabled` (or `Enabled without language pack limit` for more languages) and restart Chrome.

3. **Manage Language Packs** (Optional):
    ```
    chrome://on-device-translation-internals/
    ```
    Use this page to install/uninstall specific language packs.

### Checking API Availability

```javascript
// Check Language Detection availability
const detectorAvailability = await LanguageDetector.availability();
console.log('Language Detection:', detectorAvailability); // "available", "downloadable", "downloading", or "unavailable"

// Check Translation availability for specific language pair
const translatorAvailability = await Translator.availability({
  sourceLanguage: "en",
  targetLanguage: "es"
});
console.log('Translation:', translatorAvailability); // "available", "downloadable", "downloading", or "unavailable"
```

## Language Detection API

### Basic Language Detection

```javascript
const detector = await LanguageDetector.create();

const results = await detector.detect(someUserText);
for (const result of results) {
  console.log(result.detectedLanguage, result.confidence);
}
```

The `results` array contains objects with:
- `detectedLanguage`: BCP 47 language tag
- `confidence`: Number between 0 and 1

Results are sorted by descending confidence. The final entry is always `"und"` (undetermined) representing the probability that the text is not in any known language.

### Language Detection with Expected Languages

```javascript
const detector = await LanguageDetector.create({ expectedInputLanguages: ["en", "ja"] });
```

This ensures the browser downloads necessary resources and rejects with `"NotSupportedError"` if the specified languages cannot be detected.

### Language Detection with Download Progress

```javascript
const detector = await LanguageDetector.create({
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

The `downloadprogress` event is a `ProgressEvent` where:
- `loaded` is between 0 and 1
- `total` is always 1
- At least two events (0% and 100%) are always fired

## Translation API

### Basic Translation

```javascript
const translator = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "ja"
});

const text = await translator.translate("Hello, world!");
```

### Streaming Translation

```javascript
const translator = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "ja"
});

const readableStreamOfText = translator.translateStreaming(`
  Four score and seven years ago our fathers brought forth, upon this...
`);
```

The streaming API returns a `ReadableStream<string>` that can be consumed with a reader or used directly in compatible APIs.

### Translation with Download Progress

```javascript
const translator = await Translator.create({
  sourceLanguage,
  targetLanguage,
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

If the download fails, `downloadprogress` events stop and the `create()` promise rejects with a `"NetworkError"` `DOMException`.

### Combined Language Detection and Translation

```javascript
async function translateUnknownCustomerInput(textToTranslate, targetLanguage) {
  const detectorAvailability = await LanguageDetector.availability();

  // If there is no language detector, then assume the source language is the
  // same as the document language.
  let sourceLanguage = document.documentElement.lang;

  // Otherwise, let's detect the source language.
  if (detectorAvailability !== "unavailable") {
    if (detectorAvailability !== "available") {
      console.log("Language detection is available, but something will have to be downloaded. Hold tight!");
    }

    const detector = await LanguageDetector.create();
    const [bestResult] = await detector.detect(textToTranslate);

    if (bestResult.detectedLanguage === "und" || bestResult.confidence < 0.4) {
      // We'll just return the input text without translating. It's probably mostly punctuation
      // or something.
      return textToTranslate;
    }
    sourceLanguage = bestResult.detectedLanguage;
  }

  // Now we've figured out the source language. Let's translate it!
  const translatorAvailability = await Translator.availability({ sourceLanguage, targetLanguage });
  if (translatorAvailability === "unavailable") {
    console.warn("Translation is not available. Falling back to cloud API.");
    return await useSomeCloudAPIToTranslate(textToTranslate, { sourceLanguage, targetLanguage });
  }

  if (translatorAvailability !== "available") {
    console.log("Translation is available, but something will have to be downloaded. Hold tight!");
  }

  const translator = await Translator.create({ sourceLanguage, targetLanguage });
  return await translator.translate(textToTranslate);
}
```

## Error Handling

### Handling Quota Exceeded Errors

```javascript
const detector = await LanguageDetector.create();

try {
  console.log(await detector.detect(potentiallyLargeInput));
} catch (e) {
  if (e.name === "QuotaExceededError") {
    console.error(`Input too large! You tried to detect the language of ${e.requested} tokens, but ${e.quota} is the max supported.`);

    // Or maybe:
    console.error(`Input too large! It's ${e.requested / e.quota}x as large as the maximum possible input size.`);
  }
}
```

### Checking Input Quota

```javascript
const translator = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "jp"
});
meterEl.max = translator.inputQuota;

textbox.addEventListener("input", () => {
  meterEl.value = await translator.measureInputUsage(textbox.value);
  submitButton.disabled = meterEl.value > meterEl.max;
});

submitButton.addEventListener("click", () => {
  console.log(translator.translate(textbox.value));
});
```

If an implementation has no limits, `inputQuota` will be `+Infinity` and `measureInputUsage()` will always return 0.

## Cancellation and Abort Signals

### Canceling Operations

```javascript
const controller = new AbortController();
stopButton.onclick = () => controller.abort();

const languageDetector = await LanguageDetector.create({ signal: controller.signal });
await languageDetector.detect(document.body.textContent, { signal: controller.signal });
```

Destroying a translator or language detector will:
- Reject any ongoing calls to `detect()` or `translate()`
- Error any `ReadableStream`s returned by `translateStreaming()`
- Allow the user agent to unload ML models from memory

In all cases, exceptions will be `"AbortError"` `DOMException` or the given abort reason.

## Language Tags

The APIs use [BCP 47](https://www.rfc-editor.org/info/bcp47) language tags. Common examples:

- `"en"` - English
- `"es"` - Spanish  
- `"fr"` - French
- `"de"` - German
- `"ja"` - Japanese
- `"zh"` - Chinese
- `"zh-Hans"` - Simplified Chinese
- `"zh-Hant"` - Traditional Chinese
- `"en-US"` - US English
- `"en-GB"` - British English

### Converting Language Tags to Human-Readable Names

```javascript
function languageTagToHumanReadable(languageTag, displayLanguage = 'en') {
  const displayNames = new Intl.DisplayNames([displayLanguage], { type: "language" });
  return displayNames.of(languageTag);
}

console.log(languageTagToHumanReadable("ja", "en")); // "Japanese"
console.log(languageTagToHumanReadable("en", "ja")); // "英語"
```

## Using with TypeScript

If you're using TypeScript, you can import the types from our service:

```typescript
import {
  translate,
  translateStreaming,
  detectLanguage,
  detectPrimaryLanguage,
  checkTranslationAvailability,
  checkLanguageDetectionAvailability,
  type AvailabilityStatus,
  type LanguageDetectionResult
} from '../services/TranslateService';

// Basic translation
const result: string = await translate("Hello world", "en", "es");

// Language detection with full results
const results: LanguageDetectionResult[] = await detectLanguage("Hello world");

// Check availability
const availability: AvailabilityStatus = await checkTranslationAvailability("en", "es");
```

## Best Practices

1. **Always check availability** before creating translators or detectors
2. **Handle errors gracefully** with proper try-catch blocks
3. **Clean up resources** by calling `destroy()` on translators and detectors
4. **Monitor download progress** for better user experience
5. **Use abort signals** for long-running operations
6. **Validate input size** before translation to avoid quota errors
7. **Cache translators** when translating multiple texts with the same language pair

## Conclusion

Chrome's Translation and Language Detection APIs provide powerful on-device capabilities for multilingual applications. By following the patterns in this guide, you can build robust translation features that gracefully handle errors, provide progress feedback, and offer excellent user experiences.