# AISummarizer Usage Guide

This document provides a guide on how to use the `AISummarizer` module from TypeScript code in a JavaScript environment.

## Overview

`AISummarizer` is a service that offers AI-based text summarization capabilities with different options for summarization types, lengths, and formats.

## Prerequisites

1. **Acknowledge Google's Generative AI Prohibited Uses Policy.**

2. **Download and Install Chrome Canary**:
   - Ensure your Chrome Canary version is equal to or newer than `129.0.6639.0`.

3. **Check Device Requirements**:
   - Make sure your device has at least 22 GB of free storage space.
   - The Gemini Nano model will be deleted if available storage falls below 10 GB post-download.
   - If you are already using the Prompt API, storage requirements are already met.

4. **Enable Gemini Nano**:
   - If you haven't set up the Prompt API, follow these steps:
      1. Open Chrome and navigate to `chrome://flags/#optimization-guide-on-device-model`.
      2. Enable `BypassPerfRequirement`.
      3. Relaunch Chrome to save changes.

5. **Enable the Summarization API**:
   - Navigate to `chrome://flags/#summarization-api-for-gemini-nano`.
   - Enable it for local experimentation.
   - Relaunch Chrome.

6. **Finalize Setup**:
   - Open Chrome DevTools and execute `await ai.summarizer.create();` in the console to initiate the model download.
   - Execute `await ai.summarizer.capabilities();` repeatedly until the response indicates "readily". This process may take 3 to 5 minutes.
   - If the message reads "The model was available but there was not an execution config available...", you might need to wait a day for configuration updates.
   - Refer to the troubleshooting section if problems persist.

## Using AISummarizer

### Step 1: Check Capabilities

Before creating a summarizer session, check the availability of the model.

```javascript
async function checkCapabilities() {
  const capabilities = await window.ai.summarizer.capabilities();
  console.log("Model Availability:", capabilities.available);
}

checkCapabilities();
```

### Step 2: Create a Summarizer Session

Create a summarizer session using the appropriate enum values.

```javascript
async function createSummarizerSession() {
  const options = {
    type: 'tl;dr',  // Enum value
    length: 'medium',  // Enum value
    format: 'plain-text'  // Enum value
  };

  const summarizerSession = await window.ai.summarizer.create(options);
  return summarizerSession;
}
```

### Step 3: Use the Summarizer

Once you have a session, summarize the text.

```javascript
async function summarizeText(text) {
  const session = await createSummarizerSession();

  // Wait for the session to be ready
  await session.ready;

  const summary = await session.summarize(text);
  console.log("Summary:", summary);

  // Clean up
  session.destroy();
}

summarizeText("Your text to be summarized goes here.");
```

### Handling Download Progress

If the model requires downloading, handle progress with an event listener.

```javascript
function handleDownloadProgress(prop, event) {
  console.log(`Property: ${prop}, Loaded: ${event.loaded}, Total: ${event.total}`);
}

async function summarizeWithProgress(text) {
  const session = await createSummarizerSession();

  // Add event listener for download progress
  session.addEventListener = handleDownloadProgress;

  await session.ready; // Wait for readiness
  const summary = await session.summarize(text);
  console.log("Summary:", summary);

  session.destroy();
}

summarizeWithProgress("Text to summarize with progress handling.");
```

