# Writer and Rewriter API Documentation

## Overview

The Writer and Rewriter APIs are part of the built-in AI capabilities in Chrome, allowing users to create and revise content efficiently. The APIs leverage fine-tuned models tailored for specific writing and rewriting tasks.

<iframe src="http://localhost:4200/writer?inIframe=true"
style="border: none;"
width="99%" height="600"></iframe>

## Features

- **Writer API**: Create new content based on a given prompt.
- **Rewriter API**: Revise and restructure existing text.
- Fine-tuned models providing context-based content generation.

## Goals of the Early Preview

- Gather feedback on text quality.
- Identify issues in the API's implementation in Chrome.
- Shape the future of the APIs through user feedback.

## Requirements

- Supported Platforms: Desktop (Windows, macOS, Linux)
- OS Version and Hardware Requirements (specific details omitted for brevity)
- Current non-support: Chrome for Android, iOS, and ChromeOS

## Setup Instructions

1. **Prerequisites**:
   - Accept Google's Generative AI Prohibited Uses Policy.
   - Download and install Chrome Canary.

2. **Enable Chrome Flags for Gemini Nano**:
   - Open a new tab and navigate to `chrome://flags/#optimization-guide-on-device-model`.
   - Set **Optimization Guide on Device Model** to **Enabled BypassPerfRequirement**.
   - Relaunch Chrome.

3. **Enable the Writer and Rewriter APIs**:
   - Enable the **Writer API**:
     - Go to `chrome://flags/#writer-api-for-gemini-nano`.
     - Set this flag to **Enabled**.
   - Enable the **Rewriter API**:
     - Go to `chrome://flags/#rewriter-api-for-gemini-nano`.
     - Set this flag to **Enabled**.
   - Relaunch Chrome after enabling these flags.

4. **Verify Setup**:
   - Open Chrome DevTools and enter the console command:
     ```javascript
     (await ai.languageModel.capabilities()).available;
     ```
   - Confirm it returns "readily" to ensure the model is available.

## Writer API

### Purpose

To generate content based on a specific prompt and writing context.

### Usage

#### Example: Pure JavaScript

```javascript
(async () => {
  const writer = await ai.writer.create({
    tone: "formal",
    format: "plain-text",
    length: "medium",
    sharedContext: "Business email context"
  });

  const result = await writer.write("Draft an email to request a meeting.");
  
  console.log(result);

  writer.destroy(); // Clean up after the operation
})();
```

### Available Options

- **Tone**: `formal`, `neutral`, `casual`
- **Format**: `plain-text`, `markdown`
- **Length**: `short`, `medium`, `long`

## Rewriter API

### Purpose

To improve and reorganize existing content intelligently.

### Usage

#### Example: Pure JavaScript

```javascript
(async () => {
  const rewriter = await ai.rewriter.create({
    tone: "more-formal",
    format: "plain-text",
    length: "shorter",
    sharedContext: "Review context"
  });

  const revisedText = await rewriter.rewrite("I liked the product, but it could be better.");

  console.log(revisedText);

  rewriter.destroy(); // Clean up after the operation
})();
```

### Available Options

- **Tone**: `as-is`, `more-formal`, `more-casual`
- **Format**: `as-is`, `plain-text`, `markdown`
- **Length**: `as-is`, `shorter`, `longer`

## API Surface

### `AIWriterFactory`

- **create**: Initialize a writer.
- **capabilities**: Get the capabilities of the writer.

### `AIRewriterFactory`

- **create**: Initialize a rewriter.
- **capabilities**: Get the capabilities of the rewriter.

### Activation and Feedback

1. **Setup and activation** described in the setup section.
2. **Feedback**: Provide feedback through the given channels for text quality and implementation issues.

## Changelog
- Version history detailing updates and changes made to the API.

