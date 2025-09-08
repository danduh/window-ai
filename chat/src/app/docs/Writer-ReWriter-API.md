# Chrome Writer & Rewriter API Usage Guide

This document provides a comprehensive guide on how to use Chrome's built-in Writer and Rewriter APIs for intelligent content creation and enhancement.

## Overview

Chrome's Writing Assistance APIs provide on-device content creation and transformation capabilities:

- **Writer API**: Creates new content from writing task descriptions
- **Rewriter API**: Transforms and enhances existing text with specific improvements

Both APIs support streaming responses, availability checking, and advanced configuration options for tone, format, and length.

## Prerequisites

### Browser Support

1. **Writer & Rewriter APIs**:
    - Available from Chrome 129+ on desktop
    - Supported platforms: Windows, Mac, and Linux
    - Requires at least 22GB free storage for model download

### Setup Instructions

1. **Enable Gemini Nano Model**:
    ```
    chrome://flags/#optimization-guide-on-device-model
    ```
    Set to `Enabled` with `BypassPerfRequirement` and restart Chrome.

2. **Enable Writer API**:
    ```
    chrome://flags/#writer-api-for-gemini-nano
    ```
    Set to `Enabled` and restart Chrome.

3. **Enable Rewriter API**:
    ```
    chrome://flags/#rewriter-api-for-gemini-nano
    ```
    Set to `Enabled` and restart Chrome.

### Checking API Availability

     ```javascript
// Check Writer availability
const writerAvailability = await Writer.availability();
console.log('Writer:', writerAvailability); // "available", "downloadable", "downloading", or "unavailable"

// Check Rewriter availability
const rewriterAvailability = await Rewriter.availability();
console.log('Rewriter:', rewriterAvailability);

// Check specific configuration availability
const formalWriterAvailability = await Writer.availability({
  tone: "formal",
  format: "markdown",
  length: "long"
});
```

## Writer API

### Basic Writing

```javascript
const writer = await Writer.create({
  tone: "formal"
});

const result = await writer.write(
  "A draft for an inquiry to my bank about how to enable wire transfers on my account"
);

console.log(result);
writer.destroy();
```

### Creative Writing Examples

#### Business Email Generation
```javascript
const businessWriter = await Writer.create({
    tone: "formal",
    format: "plain-text",
    length: "medium",
  sharedContext: "Professional corporate communication"
});

const meetingRequest = await businessWriter.write(`
  Create a meeting request email to discuss Q4 budget planning with the finance team. 
  Include agenda items: budget review, cost optimization, and resource allocation for next quarter.
`);

console.log(meetingRequest);
// Output: Professional email with proper structure, greeting, agenda, and closing

const projectUpdate = await businessWriter.write(`
  Write a status update email for the mobile app redesign project. 
  Current progress: UI mockups completed, user testing scheduled for next week.
`);

console.log(projectUpdate);
businessWriter.destroy();
```

#### Marketing Content Creation
```javascript
const marketingWriter = await Writer.create({
  tone: "casual",
  format: "markdown",
  length: "long",
  sharedContext: "Social media and digital marketing content"
});

const productLaunch = await marketingWriter.write(`
  Create a blog post announcing our new eco-friendly water bottle. 
  Key features: recycled materials, temperature retention, leak-proof design, 
  available in 5 colors, priced at $24.99.
`);

const socialMediaCampaign = await marketingWriter.write(`
  Write social media posts for Instagram and Twitter promoting our summer fitness challenge. 
  Include motivational language, hashtags, and call-to-action for sign-ups.
`);

marketingWriter.destroy();
```

#### Technical Documentation
```javascript
const techWriter = await Writer.create({
  tone: "neutral",
  format: "markdown",
  length: "long",
  sharedContext: "Technical documentation for software developers"
});

const apiDocs = await techWriter.write(`
  Create API documentation for a user authentication endpoint. 
  Include: endpoint URL, request parameters, response format, error codes, 
  and example implementations in JavaScript and Python.
`);

const troubleshooting = await techWriter.write(`
  Write a troubleshooting guide for common database connection issues. 
  Cover: connection timeouts, authentication failures, SSL certificate problems, 
  and network connectivity issues.
`);

techWriter.destroy();
```

#### Creative Content Generation
```javascript
const creativeWriter = await Writer.create({
  tone: "casual",
  format: "markdown",
  sharedContext: "Creative writing and storytelling"
});

const newsletterIntro = await creativeWriter.write(`
  Write an engaging introduction for a monthly newsletter about sustainable living. 
  Topic focus: reducing plastic waste, energy conservation tips, and eco-friendly product reviews.
`);

const eventDescription = await creativeWriter.write(`
  Create a compelling description for a virtual cooking class featuring Italian cuisine. 
  Include: what participants will learn, required ingredients, skill level, and what makes it special.
`);

creativeWriter.destroy();
```

### Streaming Writing

```javascript
const writer = await Writer.create({
  tone: "formal",
  length: "long"
});

const stream = writer.writeStreaming(
  "Write a comprehensive project proposal for implementing AI chatbots in customer service"
);

for await (const chunk of stream) {
  console.log("Writing progress:", chunk);
  // Update UI progressively as content generates
}
```

### Writing with Download Progress

```javascript
const writer = await Writer.create({
  tone: "neutral",
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log(`Model download: ${(e.loaded * 100).toFixed(1)}%`);
    });
  }
});
```

## Rewriter API

### Basic Rewriting

```javascript
const rewriter = await Rewriter.create({
  sharedContext: "A review for the Flux Capacitor 3000 from TimeMachines Inc."
});

const result = await rewriter.rewrite(reviewEl.textContent, {
  context: "Avoid any toxic language and be as constructive as possible."
});

console.log(result);
rewriter.destroy();
```

### Creative Rewriting Examples

#### Professional Communication Enhancement
```javascript
const professionalRewriter = await Rewriter.create({
    tone: "more-formal",
  sharedContext: "Business communication requiring professional tone"
});

// Transform casual feedback into professional communication
const casualFeedback = `
  Hey, I think the new website design is pretty cool but there are some issues. 
  The navigation is kinda confusing and the colors are too bright. 
  Also, it loads super slow on my phone.
`;

const professionalFeedback = await professionalRewriter.rewrite(casualFeedback, {
  context: "Transform into professional feedback for design team"
});

console.log(professionalFeedback);
// Output: Professional, constructive feedback with specific recommendations

// Enhance email communication
const casualEmail = `
  Hi John, Can you send me the report ASAP? We need it for the meeting tomorrow. 
  Also, make sure it has all the numbers we talked about. Thanks!
`;

const formalEmail = await professionalRewriter.rewrite(casualEmail, {
  context: "Make this appropriate for senior management communication"
});

professionalRewriter.destroy();
```

#### Content Optimization for Different Audiences
```javascript
const audienceRewriter = await Rewriter.create({
  tone: "more-casual",
  length: "shorter",
  sharedContext: "Content adaptation for different target audiences"
});

// Simplify technical content for general audience
const technicalContent = `
  The implementation leverages microservices architecture with containerized deployments 
  utilizing Kubernetes orchestration. The system employs event-driven architecture patterns 
  with asynchronous message processing through Apache Kafka, ensuring horizontal scalability 
  and fault tolerance across distributed computing environments.
`;

const simplifiedContent = await audienceRewriter.rewrite(technicalContent, {
  context: "Explain this for non-technical stakeholders"
});

// Transform formal announcement into social media post
const formalAnnouncement = `
  We are pleased to announce the successful completion of our quarterly objectives, 
  demonstrating exceptional performance across all key metrics. Our dedicated team 
  has achieved remarkable results through collaborative efforts and strategic initiatives.
`;

const socialPost = await audienceRewriter.rewrite(formalAnnouncement, {
  context: "Create engaging social media content with celebration tone"
});

audienceRewriter.destroy();
```

#### Content Length Optimization
```javascript
const lengthRewriter = await Rewriter.create({
    length: "shorter",
  sharedContext: "Content optimization for space constraints"
});

// Condense lengthy product description
const verboseDescription = `
  Our revolutionary new smartphone features an advanced camera system with multiple lenses, 
  including a 108-megapixel main sensor, ultra-wide lens, and telephoto capabilities. 
  The device is powered by the latest processor technology, ensuring lightning-fast performance 
  for gaming, productivity, and multimedia applications. With its sleek design, premium materials, 
  and innovative features, this smartphone represents the pinnacle of mobile technology.
`;

const conciseDescription = await lengthRewriter.rewrite(verboseDescription, {
  context: "Create punchy product summary for marketing materials"
});

// Shorten meeting notes for executive summary
const detailedNotes = `
  During today's product development meeting, the team discussed various aspects of the upcoming 
  release. Sarah presented the user interface mockups, highlighting the new navigation system and 
  improved accessibility features. Mike provided an update on the backend development progress, 
  noting that API integration is 80% complete. The QA team reported that testing scenarios are 
  ready and will begin next Monday. Budget discussions revealed we are currently 5% under budget 
  for this quarter.
`;

const executiveSummary = await lengthRewriter.rewrite(detailedNotes, {
  context: "Create concise executive summary focusing on key decisions and status"
});

lengthRewriter.destroy();
```

#### Creative Style Transformation
```javascript
const styleRewriter = await Rewriter.create({
  format: "markdown",
  sharedContext: "Creative content transformation and enhancement"
});

// Transform dry instructions into engaging tutorial
const dryInstructions = `
  To set up the software, first download the installer. Run the installer as administrator. 
  Select the installation directory. Choose the components to install. Click install and wait. 
  Restart your computer when prompted.
`;

const engagingTutorial = await styleRewriter.rewrite(dryInstructions, {
  context: "Make this into an engaging, step-by-step tutorial with helpful tips"
});

// Enhance product review with more descriptive language
const basicReview = `
  The headphones are good. Sound quality is nice. They're comfortable to wear. 
  Battery life is okay. Would recommend to others.
`;

const detailedReview = await styleRewriter.rewrite(basicReview, {
  context: "Expand into detailed, helpful review with specific examples and comparisons"
});

styleRewriter.destroy();
```

### Streaming Rewriting

```javascript
const rewriter = await Rewriter.create({
  tone: "more-formal",
  length: "longer"
});

const stream = rewriter.rewriteStreaming(originalText, {
  context: "Expand this into a comprehensive analysis with supporting details"
});

for await (const chunk of stream) {
  console.log("Rewriting progress:", chunk);
  // Update UI progressively as content transforms
}
```

### Error Handling

#### Handling Quota Exceeded Errors

```javascript
const rewriter = await Rewriter.create();

try {
  const result = await rewriter.rewrite(veryLongDocument);
  console.log(result);
} catch (e) {
  if (e.name === "QuotaExceededError") {
    console.error(`Document too large! You tried to rewrite ${e.requested} tokens, but only ${e.quota} are supported.`);
    
    // Suggest breaking into smaller sections
    console.log(`Try breaking your document into sections of ${e.quota} tokens or less.`);
  }
}
```

#### Checking Input Quota

```javascript
const rewriter = await Rewriter.create({
  length: "longer"
});

const quota = rewriter.inputQuota;
const currentUsage = await rewriter.measureInputUsage(textToRewrite);

console.log(`Text uses ${currentUsage}/${quota} tokens`);

if (currentUsage > quota) {
  console.log("Text exceeds quota, consider splitting into sections");
}
```

### Cancellation and Abort Signals

```javascript
const controller = new AbortController();

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30000);

try {
  const rewriter = await Rewriter.create({ 
    signal: controller.signal 
  });
  
  const result = await rewriter.rewrite(textToRewrite, { 
    context: "Make this more engaging",
    signal: controller.signal 
  });
  
  console.log(result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Rewriting was cancelled");
  }
}
```

## Using with TypeScript

```typescript
import {
  writeText,
  writeTextStreaming,
  rewriteText,
  rewriteTextStreaming,
  checkWriterAvailability,
  checkRewriterAvailability,
  type WriterOptions,
  type RewriterOptions,
  type AvailabilityStatus
} from '../services/WriterService';

// Writer usage
const content: string = await writeText("Write a product description", {
  tone: "casual",
  format: "markdown",
  length: "medium"
});

// Rewriter usage
const enhanced: string = await rewriteText(originalText, {
  tone: "more-formal",
  length: "longer"
}, "Make this suitable for executive presentation");

// Check availability
const writerStatus: AvailabilityStatus = await checkWriterAvailability({
  tone: "formal"
});
```

## Best Practices

1. **Choose appropriate tones** for your target audience
2. **Use shared context** for consistent output across multiple operations
3. **Handle quota errors gracefully** by chunking large content
4. **Monitor download progress** for better user experience
5. **Clean up resources** by calling `destroy()` on writers and rewriters
6. **Cache instances** when processing multiple texts with same configuration
7. **Use streaming** for long content to provide progressive feedback
8. **Provide clear context** in rewrite operations for better results

## Conclusion

Chrome's Writer and Rewriter APIs provide powerful on-device content creation and enhancement capabilities. By following the patterns in this guide, you can build intelligent writing assistance features that help users create and improve content while maintaining privacy through local processing.

