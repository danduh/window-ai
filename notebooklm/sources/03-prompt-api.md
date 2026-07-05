# The Prompt API — `LanguageModel`

## The 30-second pitch

`LanguageModel` is the generic chat surface against Gemini Nano. It's the API you reach for when none of the task-specific APIs fit — when you need conversational state, custom system prompts, structured output, tool calling, or multimodal input.

**Status (July 2026):** the Prompt API is **stable on the open web since Chrome 148** — it is no longer extensions-only. As of Chrome 150 (current stable) it ships with multimodal input (image/audio via `expectedInputs`), structured output, and tool calling all functional.

```js
const session = await LanguageModel.create({
  initialPrompts: [
    { role: 'system', content: 'You are a concise pirate.' },
  ],
});

const reply = await session.prompt('What is the capital of France?');
// "Arr, the capital be Paris."
```

That's the whole loop. Create a session, call `prompt()`, get text back. Stream with `promptStreaming()` if you want tokens as they arrive.

## Session lifecycle

A session is a conversation. It holds:

- The system prompt and initial messages
- The token budget (default 4096 input tokens)
- Decoding parameters (`temperature`, `topK`)
- The accumulated conversation history

```js
const session = await LanguageModel.create({
  temperature: 0.2,                       // 0.0 (deterministic) to 1.0 (creative)
  topK: 3,                                 // restrict sampling to top K logits
  initialPrompts: [
    { role: 'system', content: '...' },
    { role: 'user', content: '...' },     // optional priming
    { role: 'assistant', content: '...' }, // optional priming
  ],
});

await session.prompt('First question');
await session.prompt('Follow-up');         // remembers context

session.destroy();                          // release GPU memory
```

**Always `destroy()`** when the user navigates away or closes the feature. Sessions hold non-trivial GPU memory; orphaned sessions block other features.

## Streaming output

For anything longer than a sentence, stream:

```js
const stream = session.promptStreaming('Write a haiku about TypeScript.');
for await (const chunk of stream) {
  appendToUI(chunk);
}
```

The chunks are token-aligned strings — append directly to the UI without escaping concerns. First token typically arrives within ~50–200 ms after the prompt is sent.

## Token counting and budgets

The session tracks token usage so you can manage long conversations:

```js
session.inputUsage         // tokens consumed so far
session.inputQuota         // max input tokens (default ~4096)

const cost = await session.measureInputUsage('How many tokens is this?');
// returns the token count without prompting
```

When you're about to exceed the quota, either:

- **Clone the session** with a truncated history: `await session.clone({ initialPrompts: [...trimmed] })`
- **Recreate** with a fresh session
- **Summarize-and-restart** — use `Summarizer` on the conversation, then start a new session primed with the summary

## Structured output via `responseConstraint`

The model can be constrained to emit valid JSON matching a schema:

```js
const schema = {
  type: 'object',
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['sentiment', 'confidence'],
};

const result = await session.prompt(
  'Classify the sentiment of: "I love this product"',
  { responseConstraint: schema }
);
// result is a JSON string parseable to: { sentiment: 'positive', confidence: 0.9 }
```

The runtime enforces the schema during decoding — invalid tokens are masked out. You get valid JSON every time, no parsing retries.

> **`responseConstraint` vs `responseFormat`:** the option name in the W3C spec is `responseConstraint` (prefer it in your code). Note that Chrome's current build still ships the option under the name `responseFormat`; if you're on a Chrome build where `responseConstraint` isn't recognized, pass the same schema as `responseFormat`.

This is the right tool for: classification, intent extraction, structured extraction from unstructured text, tool argument generation, and any place you'd otherwise write a parser.

## Tool calling

`LanguageModel` sessions support function calling via the `tools[]` parameter — documented and functional as of Chrome 148. The model decides when to invoke a developer-provided tool and the runtime returns the resolved value back into the conversation:

```js
const session = await LanguageModel.create({
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a city',
      inputSchema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
      async execute({ city }) {
        const data = await fetch(`/api/weather?city=${city}`).then(r => r.json());
        return `${data.temp}°C, ${data.conditions}`;
      },
    },
  ],
});

await session.prompt('Should I bring an umbrella in Tel Aviv?');
// model invokes get_weather('Tel Aviv'), gets the result, weaves it into the reply
```

The same pattern combines with WebMCP: tools registered on the page's model context are visible to an in-page `LanguageModel` session by default. Note the entry point moved — `navigator.modelContext` is **deprecated in Chrome 150**; feature-detect both and use `document.modelContext`:

```js
const modelContext = document.modelContext ?? navigator.modelContext;
modelContext.registerTool(tool, { signal }); // abort the signal to unregister — portable across Chrome 146–150
```

(WebMCP is a W3C draft and still moving — a public origin trial since Chrome 149. Don't ship it to production yet. See source 07 for depth.)

## Multimodal input (briefly — see source 06 for depth)

Opt in at create time:

```js
const session = await LanguageModel.create({
  expectedInputs: [{ type: 'text' }, { type: 'image' }],
});

const reply = await session.prompt([
  { type: 'text', value: 'What is in this picture?' },
  { type: 'image', value: imageBlob },
]);
```

Once opted in, prompts become arrays of content parts. Images are passed as `Blob`, `ImageBitmap`, `HTMLImageElement`, `HTMLVideoElement`, `HTMLCanvasElement`, or `ImageData`.

## Cloning sessions for branching

```js
const branch = await session.clone();
// `branch` and `session` share history up to clone time, diverge after
```

Useful for: A/B testing prompts, exploring multiple completions in parallel, providing undo by keeping the pre-action snapshot.

## Error modes you'll hit

| Error | Cause | Fix |
|---|---|---|
| `NotSupportedError` | Hardware doesn't meet bar | Show fallback UI; don't retry |
| `QuotaExceededError` | Session input quota exceeded | Clone with truncated history |
| `InvalidStateError` | `destroy()` already called | Create a new session |
| Promise hangs forever | Download in progress, no monitor | Always pass `monitor` callback |
| `AbortError` | `AbortSignal` triggered | Expected — user cancelled |

## The 80/20 of `LanguageModel`

If you're going to use this API ten times in your career, nine of them will look like this:

```js
const session = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'Specific role instruction here.' }],
  responseConstraint: someJsonSchema,   // when you need structured output
});

const result = await session.prompt(userText);
const parsed = JSON.parse(result);
// use parsed
session.destroy();
```

Master that loop and you've got the API.
