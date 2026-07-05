# Architecture Patterns for On-Device AI Features

This is the "you'll wish you'd known this on day one" file. Every pattern here came from real bugs.

## Pattern 1 — Always check `availability` before `create`

```js
async function useFeature() {
  const status = await LanguageModel.availability();

  if (status === 'unavailable') {
    showFallback();
    return;
  }

  if (status === 'downloadable' || status === 'downloading') {
    showDownloadingUI();
  }

  const session = await LanguageModel.create({
    monitor(m) {
      m.addEventListener('downloadprogress', e => updateProgress(e));
    },
  });

  hideDownloadingUI();
  return session;
}
```

**Why:** calling `create()` without checking `availability()` first means your UI freezes on first run while a 4 GB download completes. Always show the user *something* — even just "Downloading on-device AI (3% / 4 GB)..."

## Pattern 2 — One session per feature, reused across calls

```js
// BAD: recreate per call
async function summarize(text) {
  const s = await Summarizer.create();
  const result = await s.summarize(text);
  s.destroy();
  return result;
}

// GOOD: lazy singleton
let summarizerPromise = null;
function getSummarizer() {
  if (!summarizerPromise) {
    summarizerPromise = Summarizer.create({
      sharedContext: 'This is a customer support email.',
    });
  }
  return summarizerPromise;
}

async function summarize(text) {
  const s = await getSummarizer();
  return s.summarize(text);
}
```

**Why:** session creation costs ~300 ms (warm-up). Recreating per call multiplies that. For a feature that runs on every keystroke, you save 90% of latency by holding the session.

## Pattern 3 — Destroy on unmount

```js
// React
useEffect(() => {
  let session;
  (async () => {
    session = await LanguageModel.create({ ... });
    setSession(session);
  })();
  return () => session?.destroy();
}, []);
```

**Why:** orphaned sessions hold GPU memory. After 10–20 orphaned sessions, the device runs out and `create()` starts rejecting. Always destroy in cleanup.

## Pattern 4 — Single in-flight for streaming features

```js
let inFlight = null;

async function onInput(text) {
  if (inFlight) inFlight.abort();
  const controller = new AbortController();
  inFlight = controller;

  try {
    const stream = session.promptStreaming(text, { signal: controller.signal });
    for await (const chunk of stream) {
      if (controller.signal.aborted) return;
      renderChunk(chunk);
    }
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  } finally {
    if (inFlight === controller) inFlight = null;
  }
}
```

**Why:** the user is typing. By the time the model finishes responding to keystroke 5, keystroke 12 has happened. Without abort logic, the UI shows stale answers. Always cancel in-flight work when input changes.

## Pattern 5 — Graceful degradation, not feature-gating

```js
// BAD: hide the feature
if (typeof LanguageModel === 'undefined') return null;

// GOOD: degrade
if (typeof LanguageModel === 'undefined') {
  return <ManualForm />;  // fall back to non-AI version
}
return <AIPoweredForm />;
```

**Why:** the user with an unsupported browser came to do a thing, not to be told the AI version doesn't work for them. Build the non-AI version first, then layer AI on top.

## Pattern 6 — Stream every response longer than one sentence

```js
const stream = session.promptStreaming(question);
for await (const chunk of stream) {
  appendToUI(chunk);
}
```

**Why:** users perceive any wait >300 ms as "broken". Streaming shows tokens as they arrive — even if total time is identical, perceived latency drops by 5–10×.

## Pattern 7 — Pre-warm during user idle

```js
// User navigates to a page that *might* use translation
useEffect(() => {
  // Pre-warm the most likely language pair
  Translator.create({
    sourceLanguage: 'en',
    targetLanguage: detectedUserLang,
  }).catch(() => {}); // ignore errors silently
}, []);

// Later, when user clicks "translate":
const t = await Translator.create({ ... }); // returns instantly, pack already cached
```

**Why:** the first `create()` for a language pair downloads the pack (5–50 MB). If you wait until the user clicks, they wait 5–30 seconds. Pre-warm in the background.

## Pattern 8 — Constrain output with `responseConstraint` instead of parsing

```js
// BAD: prompt and parse
const text = await session.prompt('Classify sentiment of: ' + input);
const sentiment = text.toLowerCase().includes('positive') ? 'positive' : ...;

// GOOD: constrained output
const schema = {
  type: 'object',
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['sentiment'],
};
const text = await session.prompt('Classify sentiment of: ' + input, { responseConstraint: schema });
const { sentiment } = JSON.parse(text);
```

**Why:** parsing free-form LLM text is fragile. `responseConstraint` masks invalid tokens during decoding — you get valid JSON every time. (Naming note: `responseConstraint` is the W3C option name; Chrome's current build ships this as `responseFormat`. Structured output has been available since the Prompt API went stable on the open web in Chrome 148.)

## Pattern 9 — Cache identical prompts client-side

```js
const cache = new Map();
async function summarize(text) {
  if (cache.has(text)) return cache.get(text);
  const result = await summarizer.summarize(text);
  cache.set(text, result);
  return result;
}
```

**Why:** Gemini Nano is mostly deterministic for `temperature: 0`. Caching saves the ~300 ms inference cost for repeated inputs (paste-the-same-thing-twice cases, retry-after-error cases). Use a Map with size-cap or `lru-cache` for production.

## Pattern 10 — Combine task APIs and LanguageModel via a "pipeline"

```js
// Step 1: detect language
const [detected] = await detector.detect(input);

// Step 2: translate to English if needed
const englishText = detected.detectedLanguage === 'en'
  ? input
  : await translator.translate(input);

// Step 3: classify with LanguageModel
const classification = await session.prompt(
  `Classify: ${englishText}`,
  { responseConstraint: schema }
);
```

**Why:** the task APIs are tuned for specific jobs. Compose them rather than asking `LanguageModel` to do all three steps in one prompt — you'll get more reliable output.

## Pattern 11 — Token-budget management for long chats

```js
async function ensureSpace(session, nextInput) {
  const projectedUsage = session.inputUsage + await session.measureInputUsage(nextInput);
  if (projectedUsage > session.inputQuota * 0.9) {
    // Summarize the conversation so far and recreate
    const summary = await summarizer.summarize(serializeHistory(session));
    return LanguageModel.create({
      initialPrompts: [
        { role: 'system', content: originalSystem },
        { role: 'user', content: `Earlier in this conversation: ${summary}` },
      ],
    });
  }
  return session;
}
```

**Why:** Nano's input quota is ~4096 tokens. Long chats overflow. Summarize-and-restart is the textbook pattern.

## Pattern 12 — Defensive error handling

```js
try {
  return await session.prompt(input);
} catch (e) {
  if (e.name === 'NotSupportedError') {
    // Hardware doesn't meet bar; degrade silently
    return fallbackResult;
  }
  if (e.name === 'QuotaExceededError') {
    // Conversation too long; recover
    session = await recreateWithFreshContext();
    return session.prompt(input);
  }
  if (e.name === 'AbortError') {
    // User cancelled; expected
    return null;
  }
  throw e; // genuinely unexpected; let it bubble
}
```

**Why:** these three errors (`NotSupportedError`, `QuotaExceededError`, `AbortError`) are the entire set you'll see in practice. Handle each explicitly. Don't catch-all — you'll mask real bugs.

## Pattern 13 — Register WebMCP tools with an AbortSignal, not manual teardown

```js
// Feature-detect both entry points. navigator.modelContext is DEPRECATED
// in Chrome 150; document.modelContext is the current entry point.
const modelContext = document.modelContext ?? navigator.modelContext;

if (!modelContext) {
  showBanner('This browser has no WebMCP support — some agent actions are disabled.');
  return;
}

// React: tie tool lifetime to the component via an AbortController.
useEffect(() => {
  const controller = new AbortController();

  modelContext.registerTool(
    {
      name: 'scaleRecipe',
      description: 'Scale the current recipe to a target number of servings.',
      inputSchema: {
        type: 'object',
        properties: { servings: { type: 'number' } },
        required: ['servings'],
      },
      async execute({ servings }) {
        applyScaling(servings);
        return { content: [{ type: 'text', text: `Scaled to ${servings} servings.` }] };
      },
    },
    { signal: controller.signal } // abort => tool is unregistered automatically
  );

  return () => controller.abort(); // cleanup unregisters the tool
}, []);
```

**Why:** the abort-to-unregister path works identically across Chrome 146–150, so it's the portable teardown pattern — it mirrors the AbortController approach you already use for streaming (Pattern 4) and destroy-on-unmount (Pattern 3). Chrome 150 also adds explicit `unregisterTool(name)` and `clearContext()`, and `provideContext(...)` replaces the whole toolset at once — but reach for the signal first. This mirrors the availability→create→work→destroy discipline of the task APIs: register on mount, tear down on unmount, never leave orphaned tools attached to a tab.

Two things that make this different from the task-API patterns above:

- **Session inheritance.** A WebMCP tool runs inside the user's own tab, so it inherits their existing login, cookies, and session. A `purchase()` or `book()` tool needs no separate auth, API key, or OAuth dance — the agent acts as a guest in a tab the user is already signed into.
- **Structured tools beat pixel-peeping.** The alternative — an agent that screenshots the page and clicks around — is far more expensive. Exposing structured tools reports roughly ~98% task accuracy, ~89% fewer tokens (no images to process), and ~68% less overhead. Early adopters experimenting with WebMCP include Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, and Redfin, and Google shipped a demo suite (a prompt-to-escape maze, CineFlow for movie tickets, the L'Atelier hotel-booking app, and a smart-home demo).

**Caveat:** WebMCP is a W3C draft that is still moving. As of Chrome 149 it is a public **origin trial** (flag-only before that in Chrome 146) — use `chrome://flags/#enable-webmcp-testing` for local dev, or register an OT token for a deployed origin. **Do not ship it to production yet.**

## The "kitchen sink" finale — one app, most of the APIs

The patterns above are individually small. The payoff is composing them into a single app that leans on most of the on-device AI surface at once. Two interchangeable framings:

- **Sidekick** — a Chrome extension side panel that works on *any* site: summarize the page (Summarizer), translate a selection (Translator + Language Detector), proofread and rewrite inputs (Proofreader/Rewriter — still origin-trial), explain an image (multimodal Prompt API via `expectedInputs`), warn before pasting private data (Prompt API classification), and drive whatever WebMCP tools the current page exposes.
- **The Fridge** — a web app: photo of a fridge → recipe ideas (multimodal Prompt API) → translate a foreign recipe (Translator) → summarize the steps (Summarizer) → a voice agent that scales and swaps ingredients through the page's WebMCP tools (Pattern 13).

Either way the architecture lesson holds: each API is a tuned tool (Pattern 10), you compose them into a pipeline, and WebMCP is the layer that lets an agent *act* on the result rather than just describe it.

## Anti-patterns to avoid

- **Don't poll `availability()` in a loop.** It can trigger downloads as a side effect. Call it once at mount.
- **Don't use `LanguageModel` for tasks the task APIs cover.** Less reliable, more code.
- **Don't await `create()` on the critical render path.** Defer or background it.
- **Don't expose the model failure to users as "AI error".** Frame it as "this feature is unavailable" — they don't care which AI failed.
- **Don't assume the user's GPU is fast.** Test on a 2020 mid-range laptop. If it's painful there, redesign.
