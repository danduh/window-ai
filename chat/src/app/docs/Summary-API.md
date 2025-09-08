# Chrome Summarization API Usage Guide

This document provides a comprehensive guide on how to use Chrome's built-in Summarization API for intelligent text summarization with various options and configurations.

## Overview

The Summarization API provides on-device text summarization capabilities with support for different summary types, formats, and lengths. It's designed to help developers create intelligent summarization features without relying on external services.

## Prerequisites

### Browser Support

1. **Summarization API**:
    - Available from Chrome 129+ on desktop
    - Supported platforms: Windows, Mac, and Linux
    - Requires at least 22GB free storage for model download

### Setup Instructions

1. **Enable Gemini Nano Model**:
    ```
    chrome://flags/#optimization-guide-on-device-model
    ```
    Set to `Enabled` with `BypassPerfRequirement` and restart Chrome.

2. **Enable Summarization API**:
    ```
    chrome://flags/#summarization-api-for-gemini-nano
    ```
    Set to `Enabled` and restart Chrome.

### Checking API Availability

```javascript
// Check Summarization availability
const summarizerAvailability = await Summarizer.availability();
console.log('Summarization:', summarizerAvailability); // "available", "downloadable", "downloading", or "unavailable"

// Check specific configuration availability
const specificAvailability = await Summarizer.availability({
  type: "key-points",
  format: "markdown",
  length: "medium"
});
console.log('Specific config:', specificAvailability);
```

## Summarization API

### Basic Summarization

```javascript
const summarizer = await Summarizer.create({
  type: "key-points",
  format: "markdown",
  length: "medium"
});

const summary = await summarizer.summarize(`
  The quarterly earnings report shows unprecedented growth in our cloud services division. 
  Revenue increased by 47% year-over-year, driven primarily by enterprise customers adopting 
  our new AI-powered analytics platform. Customer satisfaction scores reached an all-time 
  high of 94%, while operational costs decreased by 12% due to infrastructure optimizations. 
  The mobile app saw 2.3 million new downloads this quarter, with user engagement up 31%. 
  Looking ahead, we're investing heavily in research and development, particularly in 
  machine learning capabilities and edge computing solutions.
`);

console.log(summary);
// Output: 
// • Cloud services revenue grew 47% year-over-year
// • Customer satisfaction reached 94% all-time high  
// • Mobile app gained 2.3M downloads with 31% higher engagement
// • Operational costs reduced by 12% through optimizations
// • Heavy R&D investment planned for ML and edge computing

summarizer.destroy();
```

### Summary Types

Different summary types for different use cases:

#### Key Points Summary
```javascript
const keyPointsSummarizer = await Summarizer.create({
  type: "key-points",
  format: "markdown"
});

const keyPoints = await keyPointsSummarizer.summarize(`
  The new employee handbook includes updated remote work policies, revised vacation 
  procedures, and enhanced diversity and inclusion guidelines. All employees must 
  complete mandatory cybersecurity training by month-end. The company cafeteria 
  will be closed for renovations from March 15-30. New parking assignments take 
  effect immediately, and building access cards need renewal by April 1st.
`);
// Returns bulleted list of main points
```

#### TL;DR Summary
```javascript
const tldrSummarizer = await Summarizer.create({
  type: "tl;dr",
  length: "short"
});

const tldr = await tldrSummarizer.summarize(longArticleText);
// Returns concise paragraph summary
```

#### Headline Generation
```javascript
const headlineSummarizer = await Summarizer.create({
  type: "headline",
  length: "short"
});

const headline = await headlineSummarizer.summarize(newsArticleText);
// Returns single sentence headline (no more than one sentence)
```

#### Teaser Summary
```javascript
const teaserSummarizer = await Summarizer.create({
  type: "teaser",
  length: "medium"
});

const teaser = await teaserSummarizer.summarize(blogPostText);
// Returns engaging preview to entice readers
```

### Streaming Summarization

```javascript
const summarizer = await Summarizer.create({
  type: "key-points",
  format: "markdown",
  length: "long"
});

const stream = summarizer.summarizeStreaming(longDocumentText);

for await (const chunk of stream) {
  console.log("Partial summary:", chunk);
  // Update UI progressively as summary generates
}
```

### Summarization with Shared Context

```javascript
const meetingSummarizer = await Summarizer.create({
  sharedContext: "Weekly product team standup meeting notes",
  type: "key-points",
  format: "markdown"
});

// Summarize multiple meeting segments with consistent context
const sprintSummary = await meetingSummarizer.summarize(`
  Sprint planning discussion: Team committed to 8 story points for the upcoming sprint. 
  Priority items include user authentication refactor and mobile app performance improvements.
`);

const retrospectiveSummary = await meetingSummarizer.summarize(`
  Retrospective highlights: Team velocity improved 15% this sprint. Main blockers were 
  API rate limiting and third-party integration delays. Action items: upgrade CI/CD 
  pipeline and establish vendor communication protocols.
`);

meetingSummarizer.destroy();
```

### Multilingual Summarization

```javascript
const multilingualSummarizer = await Summarizer.create({
  expectedInputLanguages: ["en", "es", "fr"],
  outputLanguage: "en",
  type: "tl;dr",
  sharedContext: "International customer support tickets requiring executive review"
});

const englishSummary = await multilingualSummarizer.summarize(`
  Cliente reporta problemas con la facturación automática. El sistema cobra incorrectamente 
  cuando el usuario cambia de plan premium a básico. Tres casos similares esta semana.
`);
// Returns summary in English regardless of input language
```

### Download Progress Monitoring

```javascript
const summarizer = await Summarizer.create({
  type: "key-points",
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log(`Model download: ${(e.loaded * 100).toFixed(1)}%`);
      // Update progress bar in UI
    });
  }
});
```

### Error Handling

#### Handling Quota Exceeded Errors

```javascript
const summarizer = await Summarizer.create();

try {
  console.log(await summarizer.summarize(veryLongDocument));
} catch (e) {
  if (e.name === "QuotaExceededError") {
    console.error(`Document too large! You tried to summarize ${e.requested} tokens, but only ${e.quota} are supported.`);
    
    // Suggest breaking into smaller chunks
    console.log(`Try breaking your document into sections of ${e.quota} tokens or less.`);
  }
}
```

#### Checking Input Quota

```javascript
const summarizer = await Summarizer.create({
  type: "key-points",
  length: "long"
});

const quota = summarizer.inputQuota;
const currentUsage = await summarizer.measureInputUsage(documentText);

console.log(`Document uses ${currentUsage}/${quota} tokens`);

if (currentUsage > quota) {
  // Split document or use different approach
  console.log("Document exceeds quota, consider chunking");
}
```

### Cancellation and Abort Signals

```javascript
const controller = new AbortController();

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30000);

try {
  const summarizer = await Summarizer.create({ 
    signal: controller.signal 
  });
  
  const summary = await summarizer.summarize(documentText, { 
    signal: controller.signal 
  });
  
  console.log(summary);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Summarization was cancelled");
  }
}
```

## Creative Use Cases

### Meeting Minutes Summarizer
```javascript
async function createMeetingMinutesSummarizer() {
  return await Summarizer.create({
    sharedContext: "Corporate meeting minutes requiring executive summary",
    type: "key-points",
    format: "markdown",
    length: "medium"
  });
}

const meetingSummarizer = await createMeetingMinutesSummarizer();

// Summarize different meeting sections
const actionItems = await meetingSummarizer.summarize(actionItemsText);
const decisions = await meetingSummarizer.summarize(decisionsText);
const nextSteps = await meetingSummarizer.summarize(nextStepsText);
```

### Customer Feedback Analyzer
```javascript
const feedbackSummarizer = await Summarizer.create({
  sharedContext: "Customer product reviews for quarterly analysis",
  type: "key-points",
  format: "markdown"
});

// Process multiple reviews
const reviews = [review1, review2, review3];
const summaries = await Promise.all(
  reviews.map(review => feedbackSummarizer.summarize(review))
);

console.log("Customer feedback themes:", summaries);
```

### Research Paper Abstracter
```javascript
const academicSummarizer = await Summarizer.create({
  sharedContext: "Academic research papers in computer science",
  type: "teaser",
  format: "plain-text",
  length: "short"
});

const abstract = await academicSummarizer.summarize(researchPaperText);
// Generate compelling abstracts for research papers
```

## Using with TypeScript

```typescript
import {
  summarizeText,
  summarizeTextStreaming,
  checkSummaryAvailability,
  type SummaryOptions,
  type AvailabilityStatus
} from '../services/SummaryService';

// Basic summarization
const result: string = await summarizeText("Text to summarize", {
  type: "key-points",
  format: "markdown",
  length: "medium"
});

// Check availability
const availability: AvailabilityStatus = await checkSummaryAvailability({
  type: "headline"
});

// Streaming
const stream: ReadableStream<string> = await summarizeTextStreaming(longText, {
  type: "tl;dr"
});
```

## Best Practices

1. **Choose appropriate summary types** for your use case
2. **Use shared context** for consistent summaries across related content
3. **Handle quota errors gracefully** by chunking large documents
4. **Monitor download progress** for better user experience
5. **Clean up resources** by calling `destroy()` on summarizers
6. **Cache summarizers** when processing multiple texts with same configuration
7. **Use streaming** for long documents to provide progressive feedback

## Conclusion

Chrome's Summarization API provides powerful on-device text summarization with flexible configuration options. By following the patterns in this guide, you can build intelligent summarization features that enhance user productivity while maintaining privacy through local processing.

