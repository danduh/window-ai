# Slide Outline — "Small LLM in your Browser"

> **⚠️ SUPERSEDED (July 2026).** This is the v1 outline (30 slides, Chrome 146-era). The current outline is [`outline-v2.md`](outline-v2.md) and the built deck is [`Small-LLM-in-your-Browser-v2.pptx`](Small-LLM-in-your-Browser-v2.pptx) — 37 slides, Payoneer-branded, refreshed to Chrome 150 facts, with the expanded WebMCP section and the grand-finale demo. Kept here for reference only.

**Total slides: 30**
**Talk duration: 25:30 + Q&A**
**Design language: minimal, high-contrast. Code monospace (JetBrains Mono or Fira Code). Body text sans (Inter). Dark or light theme — keep consistent.**

Slides drive the talk; they don't carry it. Every slide on this list is *sparse on text* — the speaker's narration (`script/narration.md`) is the message. Slides exist to anchor the visual and give the audience a beat to absorb each shift.

Format below: **Slide N — title** / *content* / *speaker notes*.

---

## Section 1 — Opening hook

### Slide 1 — Title

**Visible:**
- *Small LLM in your Browser*
- *Huge Opportunities for Web Applications*
- Speaker name + handle
- Talk date

**Speaker notes:** Hold this for 3 seconds in silence. Audience reads, speaker scans the room.

### Slide 2 — What just happened

**Visible:**
- *"That just ran entirely in your browser."*
- (sub) *No backend. No API key. No cost. No data egress.*

**Speaker notes:** Lands right after the live-translate demo. Three bullets, big.

---

## Section 2 — The shift

### Slide 3 — The four forces

**Visible:**
- *Four forces converged in 2024–2026:*
  1. Small models got good
  2. Hardware got fast enough
  3. Browser vendors made a shared bet
  4. The cloud LLM bill came due

**Speaker notes:** Reveal one bullet at a time, animated build.

### Slide 4 — Force 1: Small models got good

**Visible:**
- *Gemini Nano, Phi-3, Llama 3.2, Qwen 2.5*
- *2B–4B parameters, instruction-tuned*
- *Clear the bar for the tasks people actually use LLMs for*

**Speaker notes:** Don't dwell on benchmarks; the point is "good enough".

### Slide 5 — Force 2: Hardware got fast enough

**Visible:**
- *Apple Silicon: shipped since 2020*
- *Hexagon NPUs in mainstream Windows*
- *Integrated GPUs from 2023+ pass the bar*

**Speaker notes:** "The laptops people already own can run this."

### Slide 6 — Force 3: Browser vendors aligned

**Visible:**
- *Chrome 138+ stable*
- *Edge 147+ stable*
- *Brave shipped*
- *Firefox: intent signaled*

**Speaker notes:** Acknowledge not yet multi-vendor stable, but trajectory is clear.

### Slide 7 — Force 4: The bill came due

**Visible:**
- *2023: "Let's add AI"*
- *2025: $0.50 / MAU / month for autocomplete?*
- *Unsustainable for table-stakes*

**Speaker notes:** Audience-relatable — many in the room have lived this.

### Slide 8 — Cost flipped

**Visible (table, large):**

| | Cloud | On-device |
|---|---|---|
| Per-request cost | $0.001–$0.10 | **$0** |
| Time to first token | 200–2000 ms | **0 ms** |
| Data egress | Always | **Never** |
| Offline | Impossible | **Works** |

**Speaker notes:** Animate the right column in last. Land the "design space changed" beat.

---

## Section 3 — API surface tour

### Slide 9 — The whole surface on one page

**Visible:**
- `LanguageModel`
- `Summarizer`
- `Writer` / `Rewriter`
- `Proofreader`
- `Translator` + `LanguageDetector`
- `navigator.modelContext` (WebMCP)
- (footnote) *Four verbs: `availability` → `create` → work → `destroy`*

**Speaker notes:** Hold 5 seconds for absorption. This is the mental model slide.

### Slide 10 — LanguageModel: the chat API

**Visible:**
- *`LanguageModel` — generic chat surface against Gemini Nano*
- *Use when task APIs don't fit*
- *Conversational state, custom system prompts, multimodal, tool calling, structured output*

### Slide 11 — Minimal session (code)

**Visible (code, monospace, large):**

```js
const session = await LanguageModel.create({
  initialPrompts: [
    { role: 'system', content: 'You are a concise pirate.' },
  ],
});

const reply = await session.prompt('What is the capital of France?');
// "Arr, the capital be Paris."
```

**Speaker notes:** Walk it line by line briefly. The audience sees the four-verb pattern in action.

### Slide 12 — responseConstraint

**Visible (code):**

```js
const schema = {
  type: 'object',
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['sentiment'],
};

const result = await session.prompt(input, { responseConstraint: schema });
// always valid JSON matching schema
```

**Speaker notes:** This is the "production-ready" beat. Emphasize: no parsing retries.

### Slide 13 — The task APIs

**Visible:**
- *Summarizer · Writer · Rewriter · Proofreader*
- *Same backing model. Tuned system prompts + decoders.*
- *More reliable than raw `LanguageModel` for these specific tasks.*

### Slide 14 — Summarizer (code)

**Visible:**

```js
const summarizer = await Summarizer.create({
  type: 'key-points',
  format: 'markdown',
  length: 'medium',
  sharedContext: 'This is a customer support email.',
});

const bullets = await summarizer.summarize(text);
```

**Speaker notes:** Highlight `sharedContext` — the killer feature.

### Slide 15 — Writer vs Rewriter

**Visible (side-by-side):**

| Writer | Rewriter |
|---|---|
| New text from a brief | Transform existing text |
| `tone`, `length`, `format` | `tone`, `length`, `format` + `context` |
| "Write a release note..." | "Make this email polite..." |

**Speaker notes:** They look similar; the distinction is *new vs. transform*.

### Slide 16 — Proofreader: corrections array

**Visible (code, with output):**

```js
const result = await proofreader.proofread('She dont know nothing.');
// result.correctedInput: "She doesn't know anything."
// result.corrections: [
//   { startIndex: 4, endIndex: 8, correction: "doesn't", type: 'grammar' },
//   ...
// ]
```

**Speaker notes:** This is the API for inline grammar UIs — positioned suggestions.

### Slide 17 — Translation: two APIs

**Visible:**
- *`LanguageDetector` — what language is this?*
- *`Translator` — translate source → target*
- *Both Chrome 131+. Both per-language packs on demand.*

### Slide 18 — Composing them (code)

**Visible:**

```js
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.onresult = async (e) => {
  const text = e.results[i][0].transcript;
  const translations = await Promise.all(
    targets.map(t => translators[t].translate(text))
  );
  render(text, translations);
};
```

**Speaker notes:** Callback to the opening demo. "This is what was happening."

### Slide 19 — Multimodal: one extra option

**Visible:**

```js
const session = await LanguageModel.create({
  expectedInputs: [{ type: 'image' }, { type: 'text' }],
});

await session.prompt([
  { type: 'text', value: 'What is in this picture?' },
  { type: 'image', value: imageBlob },
]);
```

**Speaker notes:** One option unlocks the whole vision tower.

### Slide 20 — WebMCP

**Visible:**
- *`navigator.modelContext` — the page as tool surface*
- *Status: Draft Community Group Report (April 23, 2026)*
- *Chrome 146+ Canary, Edge 147+, flagged*
- (warning, prominent) ***Don't ship to production yet.***

### Slide 21 — registerTool (code)

**Visible:**

```js
navigator.modelContext.registerTool({
  name: 'scaleRecipe',
  description: 'Scale the active recipe to a new serving count...',
  inputSchema: { /* JSON schema */ },
  async execute({ servings }) {
    return await scaleAndSave(servings);
  },
}, { signal: controller.signal });
```

**Speaker notes:** One method. One descriptor. Page is the trust boundary.

---

## Section 4 — Architecture patterns

### Slide 22 — Four patterns

**Visible:**
1. Always check `availability` before `create`
2. One session per feature, reused across calls
3. Single in-flight for input-driven features
4. Degrade gracefully, don't feature-gate

### Slide 23 — Monitor download progress (code)

**Visible:**

```js
const session = await LanguageModel.create({
  monitor(m) {
    m.addEventListener('downloadprogress', e => {
      setProgress(e.loaded / e.total);
    });
  },
});
```

**Speaker notes:** First-time UX matters. Never freeze on a 4 GB download.

### Slide 24 — Abort on input change (code)

**Visible:**

```js
let inFlight = null;

async function onInput(text) {
  if (inFlight) inFlight.abort();
  const controller = new AbortController();
  inFlight = controller;
  // ... use controller.signal in promptStreaming
}
```

**Speaker notes:** Keystroke 12 shouldn't render keystroke 5's answer.

---

## Section 5 — The opportunity

### Slide 25 — What this unlocks

**Visible (just the section title):**
- *What this unlocks*

**Speaker notes:** Hold for 2 seconds. Pivot point of the talk.

### Slide 26 — Seven categories

**Visible (icons + labels, animated build):**

1. Real-time text features
2. Privacy-first AI
3. Offline-capable AI
4. Ambient editor features
5. Multimodal "show me"
6. Agentic web apps (early)
7. The "uneconomic" category

**Speaker notes:** Build one at a time. Don't dwell — narration carries the examples.

### Slide 27 — What stays in the cloud

**Visible:**
- Long-context reasoning
- Code generation, complex math
- Factual recall (use cloud + grounding)
- Domain-tuned tasks
- Multi-user shared state

(footer) *Hybrid is the answer.*

### Slide 28 — The first thing to ship

**Visible:**
- *Pick one feature where:*
  1. The user wishes it was ambient
  2. There are clear privacy stakes
  3. Long context isn't needed
  4. A clean fallback exists

(examples in smaller text) *Live translation. Inline proofreading. Smart paste. PII detection. Document summarization on save.*

---

## Section 6 — Close

### Slide 29 — The closing line

**Visible (large, center, single sentence):**

*"The browser became an inference runtime, and nobody sent you a memo."*

**Speaker notes:** Pause before reading. Read slowly. Pause after.

### Slide 30 — Resources

**Visible:**
- **Live demos:** windowai.danduh.me
- **Source:** github.com/danduh/window-ai
- **Chrome docs:** developer.chrome.com/docs/ai
- **WebMCP spec:** webmachinelearning.github.io/webmcp
- *Slack / X / LinkedIn handles*

**Speaker notes:** Stay on this slide through Q&A.

---

## Visual design notes

### Color palette
Pick ONE accent color (signal blue, signal green, or a desaturated purple) and use it for:
- Active list bullets
- Code keyword highlight
- The cost-flipped column in Slide 8
- Underlines on Slide 12 / 24 for emphasis

Everything else: white / black / one medium gray. No gradients. No drop shadows.

### Code formatting
- Monospace, size large enough to read from the back row (24pt+)
- Syntax-highlight token colors, but keep contrast high
- Highlight ONE line per code slide as the "look here" line
- Never put more than ~12 lines of code on a slide

### Animation
- Slide-to-slide: instant cut, no transitions
- Bullet builds: fast fade-in (0.2s), no slide-in
- Code emphasis: instant underline appear

### Anti-patterns
- No clip art
- No "team photo"
- No giant logos
- No more than 7 words per non-code slide line
- No paragraph-shaped slides (if you need a paragraph, the script carries it)

## Producing the .pptx

Use the `pptx` skill (or any compatible tool) to render this outline into a deck:

1. Each `Slide N` header = one slide.
2. `Visible:` content = slide body.
3. `Speaker notes:` = the speaker-notes pane of that slide.
4. Code blocks render in a monospace box.
5. Tables stay tabular.

If using the `pptx` skill, point it at this file and ask for "30-slide deck following the structure in slides/outline.md, design language matching `Small-LLM-in-your-Browser.pptx` if reference is available."
