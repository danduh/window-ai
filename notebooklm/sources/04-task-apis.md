# The Task APIs — Summarizer, Writer, Rewriter, Proofreader

## Why these exist

These four APIs are all driven by the same Gemini Nano model that backs `LanguageModel`. They exist as separate APIs because the runtime applies *tuned system prompts and decoder configurations* per task — getting more reliable, more predictable output than you'd get by prompting the raw model.

Use them when your task fits cleanly into one of these shapes. Drop down to `LanguageModel` when it doesn't.

### Stability status (as of Chrome 150, July 2026)

Don't assume these four ship at the same maturity — they don't:

- **Summarizer** — **stable since Chrome 138** (alongside Translator and Language Detector). Ship it.
- **Writer, Rewriter, Proofreader** — still **origin trial / behind a flag**. Not stable. Prototype-only. Register an origin-trial token for a deployed origin, or enable the relevant `chrome://flags` entry for local dev.

For reference, the Prompt API (`LanguageModel`) went **stable on the open web in Chrome 148** (no longer extensions-only) with multimodal input and structured output — so when this doc says "drop down to `LanguageModel`," that path is now generally available, not experimental.

---

## Summarizer

### Use case
Compress longer text into shorter text — TL;DR, key bullets, headline, social-card teaser.

### API shape

```js
const summarizer = await Summarizer.create({
  type: 'key-points',          // 'tl;dr' | 'key-points' | 'teaser' | 'headline'
  format: 'markdown',          // 'plain-text' | 'markdown'
  length: 'medium',            // 'short' | 'medium' | 'long'
  sharedContext: 'This is a technical blog post about React.',
});

const summary = await summarizer.summarize(longText);

// or streaming:
const stream = summarizer.summarizeStreaming(longText);
for await (const chunk of stream) appendToUI(chunk);

summarizer.destroy();
```

### Type-to-output mapping

| `type` | What you get |
|---|---|
| `tl;dr` | One or two sentences. The classic "above the fold" summary. |
| `key-points` | Bulleted list of the main claims. Default and most useful. |
| `teaser` | Marketing-style hook designed to make the reader want to read the full text. |
| `headline` | A single line, news-headline cadence. |

### `sharedContext` is the killer feature

`sharedContext` is a system-prompt-level setting that influences every subsequent `.summarize()` call on the same instance. Use it to give the model the *frame* in which to summarize:

- `"This is a customer support ticket from a B2B SaaS user."`
- `"This is a section of a medical journal article. Preserve drug names and dosages exactly."`
- `"This is a Slack thread. The user wants to skim the decision, not the discussion."`

Without `sharedContext`, summaries are technically correct but generically toned. With it, they fit the surrounding product.

### When NOT to use Summarizer

If you need the output to be a *structured object* (sentiment, severity, tags) — that's `LanguageModel` with `responseConstraint`, not `Summarizer`. (The W3C option is `responseConstraint`; Chrome's current build still ships it as `responseFormat`.)

---

## Writer

> **Status:** origin trial / flag — **not stable** as of Chrome 150. Prototype-only.

### Use case
Generate *new* text from a brief or instruction. No source text to transform — you're producing prose from a prompt.

### API shape

```js
const writer = await Writer.create({
  tone: 'formal',              // 'formal' | 'neutral' | 'casual'
  format: 'plain-text',        // 'plain-text' | 'markdown'
  length: 'medium',            // 'short' | 'medium' | 'long'
  sharedContext: 'You are writing for a developer audience.',
});

const text = await writer.write('Write a release note for v2.0 of our CLI tool.');
writer.destroy();
```

### Common product uses

- "Draft an email from this calendar event"
- "Generate a release note from these git commits"
- "Write a placeholder bio from these LinkedIn fields"
- "Suggest a Pull Request description from this diff" (paired with code injected into the brief)

### Writer vs LanguageModel

You *could* prompt `LanguageModel` with "Write me a release note...". Writer is more reliable because the system prompt is tuned for "produce a finished piece of text in the requested tone/format/length, do not editorialize, do not add disclaimers".

`LanguageModel` will often add "Sure! Here's a draft..." prefix. Writer won't.

---

## Rewriter

> **Status:** origin trial / flag — **not stable** as of Chrome 150. Prototype-only.

### Use case
Transform *existing* text — tone shift, length adjustment, formality change.

### API shape

```js
const rewriter = await Rewriter.create({
  tone: 'more-formal',         // 'as-is' | 'more-formal' | 'more-casual'
  length: 'as-is',             // 'as-is' | 'shorter' | 'longer'
  format: 'as-is',             // 'as-is' | 'plain-text' | 'markdown'
  sharedContext: 'Keep all proper nouns and product names exact.',
});

const rewritten = await rewriter.rewrite(
  "hey can u send me the doc when u get a sec",
  { context: 'This is going to a senior executive.' }
);
// "Hi — could you send me the document when you have a moment? Thanks."
```

The per-call `context` parameter is a powerful escape hatch — it lets you give per-input framing without recreating the instance.

### Rewriter vs Writer

- **Writer** = new text from a brief.
- **Rewriter** = existing text, transformed.

They're separate APIs because the tuned system prompts are different. Writer "writes from scratch"; Rewriter "respects the input, just adjusts axis X".

### Streaming

`rewriter.rewriteStreaming(input, options)` returns a `ReadableStream<string>` — same pattern as Summarizer/Writer.

---

## Proofreader

> **Status:** origin trial / flag — **not stable** as of Chrome 150. Prototype-only.

### Use case
Find grammar, spelling, and style errors. Return both corrected text and the list of individual corrections with positions.

### API shape

```js
const proofreader = await Proofreader.create({
  expectedInputLanguages: ['en'],
});

const result = await proofreader.proofread('She dont know nothing about it.');

// result.correctedInput: "She doesn't know anything about it."
// result.corrections: [
//   { startIndex: 4, endIndex: 8, correction: "doesn't", type: 'grammar' },
//   { startIndex: 14, endIndex: 21, correction: "anything", type: 'grammar' },
// ]
```

### The `corrections` array is the point

Other APIs give you the corrected text and that's it. Proofreader gives you *each correction as a positioned suggestion* — so you can render them as inline tooltips, batch-accept, or surface them in a side panel. This is the API for building an editor's grammar-check UI.

### Multilingual considerations

`expectedInputLanguages` is a hint. Proofreader will work on text in any language Nano knows, but explicitly telling it the expected languages produces better corrections (avoids "fixing" loanwords or technical terms in mixed-language input).

### Why it's still flagged

As of Chrome 150 (stable, released June 30 2026), Proofreader is still **not stable** — it remains in origin trial / behind a flag, alongside Writer and Rewriter. A stable launch date isn't confirmed and the shape may still move. Build on it for prototypes, not production.

---

## When you DON'T want the task APIs

Use `LanguageModel` directly when:

- You need **conversational state** across multiple turns
- You need **tool calling**
- You need **multimodal input** (images)
- You need **structured JSON output** with a schema — `LanguageModel` with `responseConstraint` is the supported path (Chrome currently ships this option as `responseFormat`)
- You need a **custom system prompt** that doesn't fit `sharedContext` semantics
- You need control over `temperature` / `topK`

## The "use the right tool" guideline

| Task | Best API |
|---|---|
| "Three bullets summarizing this article" | Summarizer (`type: 'key-points'`) |
| "Draft a Slack message from this calendar event" | Writer |
| "Make this rude email polite" | Rewriter (`tone: 'more-formal'`) |
| "Find grammar errors in real time as the user types" | Proofreader |
| "Classify this customer message into a category" | LanguageModel + `responseConstraint` (Chrome: `responseFormat`) |
| "Chat assistant with memory and tool use" | LanguageModel |
| "Convert hex color to RGB" | Not an AI task — just write the math |

The last row is included as a reminder. Not every problem is an LLM problem, even when the LLM is free.
