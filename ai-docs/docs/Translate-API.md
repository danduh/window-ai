# Language Translation API Usage Guide

This document provides a guide on how to use the `Translation` module from TypeScript code in a JavaScript environment using the configuration described.

## Overview

The `Translation` API allows for both language detection and text translation. These capabilities are available with specific configurations and flags within Chrome.

<iframe src="{{exampleSite.baseURL}}translate?inIframe=true"
style="border: none;"
width="99%" height="600"></iframe>

## Prerequisites

### Language Detection API

1. **Availability**:
    - Available from Chrome 129+ on desktop and Android.
    - Tested on Chrome Canary or Chrome Dev channel, Version 129.0.6639.0 or above.

2. **Requirements**:
    - No hardware requirements; supported on Android, ChromeOS, Windows, Mac, and Linux (not supported on iOS).

3. **Setup**:
    - Ensure you are using Chrome on a supported platform.
    - Download Chrome Canary and confirm the version is 129.0.6639.0 or newer.
    - Enable Language Detection API:
        - Navigate to `chrome://flags/#language-detection-api`.
        - Select `Enabled` and relaunch Chrome.
    - Confirm API availability:
        - Open Chrome DevTools and execute `await translation.canDetect();`.
        - Ensure it returns "readily" to confirm readiness.

### Translation API

1. **Platforms**:
    - Works on Windows, Mac, or Linux.

2. **Requirements**:
    - Ensure Chrome version is equal to or newer than 131.0.6778.2.

3. **Enable Translation API**:
    - Navigate to `chrome://flags/#translation-api`.
    - Select `Enabled` (or `Enabled without language pack limit` for more languages).
    - Relaunch Chrome.

4. **Confirm API availability**:
    - Execute `await translation.canTranslate({sourceLanguage: "en", targetLanguage: "es"});` in DevTools.
    - Ensure it returns "readily" to confirm readiness.

5. **Manage Language Packs**:
    - Navigate to `chrome://on-device-translation-internals/` to install/uninstall language packs.

## Using the Translation API

### Language Detection

#### Step 1: Create a Language Detector

```javascript
async function createLanguageDetector() {
  const detector = await window.translation.createDetector();

  detector.ondownloadprogress = function(ev) {
    console.log(`Download progress: ${ev.loaded} of ${ev.total}`);
  };

  await detector.ready;
  return detector;
}
```

#### Step 2: Detect Language

```javascript
async function detectLanguage(text) {
  const detector = await createLanguageDetector();
  const results = await detector.detect(text);
  results.forEach(result => {
    console.log(`Detected language: ${result.detectedLanguage} with confidence: ${result.confidence}`);
  });
}

detectLanguage("Your text to detect language goes here.");
```

### Translation

#### Step 1: Check Translation Availability

```javascript
async function checkTranslationAvailability() {
  const availability = await window.translation.canTranslate({
    sourceLanguage: "en",
    targetLanguage: "es"
  });
  console.log("Translation Availability:", availability);
}

checkTranslationAvailability();
```

#### Step 2: Create a Translator

```javascript
async function createTranslator() {
  const translator = await window.translation.createTranslator({
    sourceLanguage: "en",
    targetLanguage: "es"
  });
  return translator;
}
```

#### Step 3: Translate Text

```javascript
async function translateText(text) {
  const translator = await createTranslator();
  const translatedText = await translator.translate(text);
  console.log("Translated Text:", translatedText);
}

translateText("Your text to translate goes here.");
```

## Conclusion

This guide provides you with the necessary steps to utilize the `Language Detection` and `Translation` APIs correctly in your JavaScript projects. Ensure that all prerequisites are met for smooth integration and functionality.