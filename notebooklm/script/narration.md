# Narration Script — "Small LLM in your Browser"

> **⚠️ SUPERSEDED (July 2026).** This is the v1 script (Chrome 146-era). The current, delivery-ready script is [`narration-v2.md`](narration-v2.md) — refreshed to Chrome 150 facts (`document.modelContext`, Prompt API stable @148), written at B2 English level, with the expanded WebMCP section and the grand-finale "kitchen sink" demo. Kept here for reference only.

**Total runtime target: 27 minutes (24 min talk + 3 min Q&A buffer)**
**Speaking rate assumption: 150 wpm conversational**

Section timings include both speaking and demo beats. **[DEMO]** markers indicate where you switch from slides to live browser; **[SLIDE]** markers indicate slide changes; **[BEAT]** markers indicate pause for emphasis.

---

## Section 1 — Opening hook (0:00 – 2:30)

**[SLIDE 1: Title slide — "Small LLM in your Browser: Huge Opportunities for Web Applications"]**

Good morning. I want to start by showing you something, and I want you to watch my dev tools, specifically the network tab. Not the slides — the network tab.

**[DEMO 1: Open windowai.danduh.me/live-translate. Show network tab is empty.]**

This is a web page I built. It's running in Chrome, on this laptop, like any other web page. I'm going to speak into the microphone, and you'll see something happen on screen.

**[BEAT — open mic, speak naturally:]**

"Good morning everyone, I'm really happy to be here today, and I hope you find this talk useful."

**[Watch the screen — translations appear in 4 columns: Spanish, French, German, Japanese]**

Now look at the network tab. **[BEAT]** Empty. No requests. Nothing was sent anywhere. Everything you just saw — speech recognition, translation into four languages, all of it — happened on this laptop. In the browser. With no backend, no API key, no cloud LLM, no bill.

**[SLIDE 2: "What just happened"]**

What just happened is the headline of this talk. Every modern Chrome user now has a 4 GB language model already on their disk. Web pages can call it through a JavaScript API that's stable, simple, and ships with Chrome. The cost per call is zero. The latency is zero. The data egress is zero.

That's a different product economics than we had 18 months ago. And in the next 25 minutes I'm going to convince you it changes what you can build on the web.

---

## Section 2 — The shift (2:30 – 5:30)

**[SLIDE 3: "The four forces"]**

For three years, every AI feature on the web has been a cloud API call. A request goes from the user's browser, to your server, to OpenAI or Anthropic or Google, and back. That round trip costs money — somewhere between a tenth of a cent and ten cents per call. It costs latency — 200 to 2000 milliseconds before the first token. And critically, it costs data — the user's text leaves their machine.

Four things happened in the last two years that broke that pattern.

**[SLIDE 4: "Force 1 — Small models got good"]**

Small models got good. The 2024–2025 generation of 2-billion to 4-billion parameter instruction-tuned models — Gemini Nano, Phi-3, Llama 3.2, Qwen — they clear the bar for the tasks people actually use LLMs for. Summarization, translation, rewriting, classification, extraction. They are not GPT-4. They do not need to be.

**[SLIDE 5: "Force 2 — Hardware got fast enough"]**

Consumer hardware got fast enough. Every Mac sold since 2020 has neural acceleration. Mainstream Windows laptops with Hexagon NPUs. Even integrated GPUs from 2023 have enough memory bandwidth to serve a quantized 2B model at conversational speeds.

**[SLIDE 6: "Force 3 — Browser vendors made a shared bet"]**

Browser vendors made a shared bet. Chrome shipped Gemini Nano. Edge picked up the same APIs. Brave shipped it. Firefox signaled intent. We're not at multi-vendor stability yet, but the direction is clear.

**[SLIDE 7: "Force 4 — The cloud LLM bill came due"]**

And the bill came due. Every team that shipped a "let's add AI" feature in 2023 has a spreadsheet now showing per-user inference cost. For features that are table-stakes — autocomplete, suggest a reply, summarize this thread — paying half a dollar per user per month is not sustainable.

**[SLIDE 8: "Cost flipped, design space changed"]**

Those four forces converged. And when inference cost flips from "expensive" to "free" — really free, not free-tier-with-rate-limits free — the design space changes. Throttle and debounce become wrong. You run on every keystroke. You speculatively pre-translate paragraphs the user hasn't scrolled to yet. You ambient-classify every chat message into a sentiment bucket as it renders.

The browser became an inference runtime, and nobody sent you a memo.

---

## Section 3 — The API surface tour (5:30 – 17:30)

**[SLIDE 9: "The whole surface on one page"]**

Here's the entire developer surface. Eight things to know. Seven JavaScript globals plus one tool-exposure layer.

`LanguageModel`. `Summarizer`. `Writer`. `Rewriter`. `Proofreader`. `Translator`. `LanguageDetector`. And `navigator.modelContext`, which is the WebMCP API.

Every one of them follows the same shape: `await API.availability()` to check support, `await API.create()` to get an instance, call a work method, call `destroy()` when you're done. Four verbs. That's the mental model.

Let me show you each of them.

### LanguageModel (5:45 – 9:00)

**[SLIDE 10: "LanguageModel — the chat API"]**

`LanguageModel` is the generic chat surface against Gemini Nano. Use it when none of the task-specific APIs fit — when you need conversational state, custom system prompts, or structured output.

**[SLIDE 11: Code — minimal session]**

```js
const session = await LanguageModel.create({
  initialPrompts: [
    { role: 'system', content: 'You are a concise pirate.' },
  ],
});

const reply = await session.prompt('What is the capital of France?');
// "Arr, the capital be Paris."
```

That's the whole loop. Create a session, prompt it, get text back.

**[DEMO 2: Open /chat, show a quick conversation. Highlight: streaming, conversational state.]**

Two things to call out here that matter for production code. First, **stream by default**. If your response is longer than a sentence, use `promptStreaming` instead of `prompt`. Users perceive any wait longer than 300 milliseconds as broken. Streaming makes a 3-second response feel instant.

**[SLIDE 12: Code — `responseConstraint`]**

Second — and this is the bit that turns a hobby project into something you can ship — **constrain your output with `responseConstraint`**. Pass a JSON schema; the runtime masks invalid tokens during decoding; you get valid JSON every time. No parsing. No retries.

```js
const result = await session.prompt(
  'Classify sentiment of: ' + input,
  { responseConstraint: { /* JSON schema */ } }
);
// always valid JSON matching the schema
```

This is how you build reliable classification, intent extraction, structured data pulls. Critical pattern.

### The task APIs (9:00 – 12:30)

**[SLIDE 13: "The task APIs"]**

The four task APIs — Summarizer, Writer, Rewriter, Proofreader — all run on the same Gemini Nano model. They exist because the runtime applies tuned system prompts and decoder configs per task, getting *more reliable* output than you'd get prompting the raw model.

**[SLIDE 14: Code — Summarizer]**

```js
const summarizer = await Summarizer.create({
  type: 'key-points',   // tl;dr, key-points, teaser, headline
  format: 'markdown',
  length: 'medium',
  sharedContext: 'This is a customer support email.',
});
const bullets = await summarizer.summarize(longText);
```

The killer feature here is `sharedContext`. It frames every subsequent summary in a specific domain. "This is a medical journal article — preserve drug names." "This is a Slack thread — give me the decision, not the discussion." Without it, summaries are generically toned. With it, they fit the surrounding product.

**[DEMO 3: Open /summary, paste a long article, show the four types side by side.]**

**[SLIDE 15: "Writer vs Rewriter — the distinction"]**

Writer and Rewriter look similar but are different APIs. **Writer** generates new text from a brief. **Rewriter** transforms existing text — tone shift, length adjustment, formality change. Separate APIs because the tuned system prompts are different.

**[SLIDE 16: "Proofreader — the corrections array"]**

Proofreader is special because it returns more than just the corrected text. It returns each correction as a positioned suggestion — start index, end index, the replacement, the category. That's the API for building Grammarly-style inline corrections.

```js
const result = await proofreader.proofread(text);
// result.correctedInput, result.corrections[]
```

**[DEMO 4: Open /proofreader, type "she dont know nothing", show inline tooltips.]**

### Translation (12:30 – 14:00)

**[SLIDE 17: "Translator + LanguageDetector"]**

Translator and LanguageDetector are the two oldest, most stable APIs in this set — Chrome 131 plus. Together with the Web Speech API, they compose into the demo I opened with.

**[SLIDE 18: Code — composing them]**

```js
const recognition = new SpeechRecognition();
recognition.onresult = async (e) => {
  const transcript = e.results[i][0].transcript;
  const translations = await Promise.all(
    targets.map(t => translators[t].translate(transcript))
  );
  render(transcript, translations);
};
```

Each translator instance caches a language pack — typically 10 to 50 megabytes. After the first translation in a pair, every subsequent one is instant.

A pattern worth stealing: **pre-warm translators**. When the page loads, kick off `Translator.create()` for the likely pairs in the background. By the time the user clicks "translate", the pack is cached, the call is instant.

### Multimodal (14:00 – 16:00)

**[SLIDE 19: "Multimodal — one option, big change"]**

Multimodal mode unlocks with one extra option at session creation: `expectedInputs: [{ type: 'image' }, { type: 'text' }]`. Once you opt in, your prompts become arrays of content parts — mix text and images in any order.

**[DEMO 5: Open /multimodal. Drag a photo onto the page. Ask "what's in this picture?". Show streaming response.]**

What's interesting is the live mode.

**[DEMO 6: Switch to webcam tab. Show continuous frame analysis.]**

Three things make continuous webcam analysis work. **Downsample** — pre-shrink to 640px before sending. **Single in-flight** — skip frames if the previous prompt hasn't resolved. **Session reuse** — one session outside the loop, never recreate per frame.

On this laptop, sustained ~3 seconds per analysis cycle. Free, private, offline-capable.

### WebMCP (16:00 – 17:30)

**[SLIDE 20: "WebMCP — the page as tool surface"]**

The last API. WebMCP — `navigator.modelContext`. This one's still draft, behind a flag, in Chrome 146 Canary and Edge 147. Don't ship it to production. But understand it, because when it stabilizes it changes how agents interact with web apps.

The idea: a web page declares its in-page actions as callable tools. A page calls `registerTool` once per thing it wants to expose. An AI agent — either an in-page LanguageModel session or an external browser-resident agent — sees the tools and calls them. The page's handler runs in the page's context, with the user's session, no separate authentication.

**[SLIDE 21: Code — registerTool]**

```js
navigator.modelContext.registerTool({
  name: 'scaleRecipe',
  description: 'Scale a recipe to a new servings count...',
  inputSchema: { /* JSON schema */ },
  async execute({ servings }) {
    // run in the page, with the user's session
    return await scaleAndSave(servings);
  },
}, { signal: controller.signal });
```

**[DEMO 7: Open /webmcp. Show the recipe browser. Open the agent panel. Type "scale the cake to 12 servings". Watch the agent invoke scaleRecipe.]**

For 25 years, the way to let AI drive a web app was either a public API plus auth, or a Selenium script that pretends to be a user. WebMCP is a fourth option: the page declares its tools, the agent calls them. The user's already signed in. No API key. No infrastructure.

That changes what an "agentic" product can look like. Not in 2026 — the API is still moving. But in 2027 and beyond, this matters.

---

## Section 4 — Architecture patterns (17:30 – 21:00)

**[SLIDE 22: "The four patterns you'll need"]**

Four patterns you should walk out of this room knowing.

**One: always check availability before create.**

Calling `create` without checking `availability` means the user's UI freezes during a 4 GB download. Check first, show a download UI, wire up the `monitor` callback for progress.

**[SLIDE 23: Code — monitor callback]**

**Two: one session per feature, reused across calls.**

Session creation costs 300 milliseconds of warm-up. Don't recreate per call. Lazy singleton pattern, hold the session, destroy on unmount.

**Three: single in-flight for input-driven features.**

The user is typing. By the time the model finishes responding to keystroke five, keystroke twelve has happened. Abort the previous request when input changes. Don't show stale answers.

**[SLIDE 24: Code — abort pattern]**

**Four: degrade gracefully, don't feature-gate.**

When the API isn't available, build the non-AI version of the feature. The user came to do a thing, not to be told their hardware is too old.

These four patterns cover 90% of the production-readiness work.

---

## Section 5 — The opportunity (21:00 – 24:30)

**[SLIDE 25: "What this unlocks"]**

I want to close on opportunity, not API surface. Because the API surface is the easy part. What's hard, and what's interesting, is what you build with it.

**[SLIDE 26: "Seven categories"]**

Seven categories of products that were uneconomic 18 months ago and aren't now.

**Real-time text features.** Translation overlays on chat. Inline grammar checking on every keystroke. Live PII detection. Smart paste. Per-keystroke autocomplete.

**Privacy-first AI.** Medical assistants, legal review tools, fintech chat, therapy apps. On-device means compliance solved by physics, not contracts.

**Offline-capable AI.** Reading apps for planes. Field tools for remote work. Travel apps for roaming-disabled phones.

**Ambient editor features.** Silent proofreading. Form filling. Notification triage. Email draft suggestions on load.

**Multimodal "show me" features.** Object identifier, document scanner, whiteboard capture, accessibility narrator.

**Agentic web apps.** WebMCP-driven. Early days, but the design space is enormous.

**The "uneconomic" category.** Per-user moderation, semantic search, personalization per user — all things where cloud LLM economics blocked the product.

**[SLIDE 27: "What stays in the cloud"]**

I'm not arguing on-device replaces cloud. It doesn't. Nano is small. Long-context reasoning, code generation, factual recall, domain-tuned tasks — those stay in the cloud. The right architecture is hybrid: Nano for the local, ambient, real-time layer; cloud for the heavy lifting.

**[SLIDE 28: "The first thing to ship"]**

If your team is going to add one on-device AI feature in Q3, pick the one where the user *wishes* it was already ambient, that has clear privacy stakes, that doesn't need long context, and that has a clean fallback path. Live translation, inline proofreading, smart paste, document summarization on save, PII detection. Those are your first wins.

---

## Section 6 — Close (24:30 – 25:30)

**[SLIDE 29: "The closing line"]**

The browser became an inference runtime, and nobody sent you a memo. The cost of "what if we just ran a language model here?" used to be a budget meeting. Now it's a `LanguageModel.create()` call.

The teams that notice this in 2026 ship the next generation of web apps. The teams that wait will retrofit it in 2028, behind the teams that didn't wait.

**[SLIDE 30: "Resources"]**

Everything I showed today is live at **windowai.danduh.me**. Source on GitHub at `danduh/window-ai`. The Chrome docs are at `developer.chrome.com/docs/ai`. WebMCP spec at `webmachinelearning.github.io/webmcp`.

Thank you. I'd love to take questions.

---

## Q&A — likely questions and prepared answers

**Q: What about Safari and Firefox?**

A: As of May 2026, this is a Chrome plus Edge story. Brave has it via Chromium. Firefox has stated intent to implement compatible APIs but hasn't shipped. Safari has not committed. Build for Chrome users today, expect web-platform-wide availability in 2027.

**Q: How does this work on mobile?**

A: It doesn't, today. Gemini Nano is desktop-only — Windows, macOS, Linux. No Android, no iOS, no ChromeOS for the full surface. Mobile support is signaled for 2027.

**Q: What's the worst failure mode?**

A: First-time user lands on a feature that depends on the model, model isn't downloaded, page hangs for several minutes because the developer didn't wire up `availability` and `monitor`. Easy to avoid; very common to forget.

**Q: What if a user disabled on-device AI in settings?**

A: `availability()` returns `'unavailable'`. Your fallback path kicks in. Treat it the same as "hardware doesn't meet bar".

**Q: Is the model going to get bigger?**

A: Probably. There are signals about a larger variant for high-end devices. But Nano is going to remain the "free, fast, runs everywhere" tier. Larger models will be opt-in.

**Q: Is there a way to fine-tune it?**

A: Not yet. There's hand-waving about adapter hooks, nothing committed. Today: use system prompts and `sharedContext` to steer it.

**Q: Should I rip out my OpenAI API integration?**

A: No. Hybrid. Use Nano for the table-stakes layer; keep OpenAI for the features that need it. Most products will run both for the foreseeable future.

**Q: Can I use this with React / Next.js / [framework]?**

A: Yes. It's a regular browser API. Works fine inside any framework. The patterns I showed (lazy singleton, destroy on unmount, abort on input change) map cleanly onto React effects.

**Q: Won't users be unhappy about the 4 GB download?**

A: The May 2026 controversy is real — Chrome was downloading the model silently. Google now exposes a settings toggle. Be prepared for some users to have disabled it. Your fallback path handles them.
