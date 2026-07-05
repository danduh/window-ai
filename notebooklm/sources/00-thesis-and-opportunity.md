# Thesis and Opportunity

## The one-line thesis

Every modern Chrome user now ships with a ~4 GB instruction-tuned language model already on disk. Web pages can call it through a small, increasingly stable JavaScript surface (`LanguageModel`, `Summarizer`, `Writer`, `Rewriter`, `Proofreader`, `Translator`, `LanguageDetector`) and a tool-exposure layer (`document.modelContext`, formerly `navigator.modelContext`) with **zero per-request cost, zero network latency, and zero data egress**. That changes what's economically possible to build on the web. And because these are all plain browser globals, a single app can chain them together — read a page, summarize it, translate it, then drive that page's WebMCP tools — which is where **"one app, many APIs"** stops being a slogan and starts being a demo.

## Why this is a shift, not an incremental update

The mainstream LLM economics for the last three years assumed a cloud API on the critical path:

| Cost dimension | Cloud LLM (2023–2025 baseline) | On-device LLM (Chrome 150) |
|---|---|---|
| Per-request token cost | $0.001–$0.10 | $0 |
| Round-trip latency | 200–2000 ms before first token | 0 ms — local |
| Data exit to vendor | Always | Never |
| Offline use | Impossible | Works |
| Per-user rate limits | Yes (you pay or they queue) | None |
| Compliance / data residency | Major engineering effort | Solved by physics — data never leaves |
| Marginal cost of "ambient" features | Prohibitive | Free |

The flipped column is the headline. When inference is free and instant, the design space for product features changes — features that were uneconomical at $0.005/call become free at $0/call. "Summarize what the user just typed" can run every keystroke. "Translate every chat message into the reader's language" can run on every render. "Detect what language this comment is in" can run inline, no UX delay.

## Numbers worth knowing for the talk

- **Model size on disk:** ~4 GB (`weights.bin` in `OptGuideOnDeviceModel/`). Chrome auto-purges below ~22 GB free disk.
- **Model:** Gemini Nano — 2B or 4B parameter variant, picked by Chrome based on device capability via a GPU shader benchmark on first run.
- **First-call latency:** ~300 ms session warm-up. After warm-up, streaming tokens at conversational speed on consumer hardware (Apple Silicon laptop, mid-range Windows GPU).
- **Prompt API (`LanguageModel`):** stable on the open web since Chrome 148 — no longer extensions-only. Supports multimodal input (image/audio via `expectedInputs`), structured output, and tool-calling (the `tools[]` parameter).
- **Multimodal (image/audio input):** stable in Chrome 148+. Webcam + frame downsampling gets a sustained ~3-second analysis cycle.
- **Translator / Summarizer / Language Detector:** stable since Chrome 138. Translator ships per-language packs on demand; ~50 language pairs supported today.
- **WebMCP:** W3C draft, now a public **origin trial from Chrome 149** (was flag-only in Chrome 146). Entry point moved from `navigator.modelContext` to `document.modelContext` in Chrome 150. Still moving — don't ship to production yet.
- **Reach (as of July 2026):** Gemini Nano has rolled out to all Chrome desktop installs that meet the hardware bar (Chrome 150 is the current stable, released June 30, 2026). Hundreds of millions of devices.

## The opportunity in one paragraph

For 25 years, the web was a thin client. Every meaningful AI feature lived on someone else's server. With Gemini Nano shipped to every Chrome user, the web client is now a fully capable inference runtime. Web apps can do real-time translation, summarization, proofreading, drafting, rewriting, image understanding, structured tool calling, and full agentic flows — **without a backend, without a key, without a bill, without sending a byte of user data anywhere**. The payoff compounds when you stop treating these as seven separate toys and wire them into **one app that uses most of them together**: a fridge photo becomes recipe ideas, a foreign recipe gets translated, the steps get summarized, and a voice agent scales and swaps ingredients through the page's own WebMCP tools. The next two years of frontend development will be defined by who notices this first.

## What this talk argues, specifically

1. **It's real.** Gemini Nano is shipped, not a preview. The APIs work today on every recent Chrome desktop.
2. **It's small.** The whole API surface fits on one slide. You can learn it in an afternoon.
3. **It's stable enough.** Summarizer, Translator, and Language Detector are stable since Chrome 138; the Prompt API went stable on the open web in Chrome 148 (multimodal + structured output + tool-calling included). Writer, Rewriter, and Proofreader are still origin-trial / behind a flag — not stable yet, so say so. WebMCP is a public origin trial from Chrome 149 but still a moving W3C draft — don't ship that one yet, but build with it to learn.
4. **It's a category shift.** Cheap-or-free inference unlocks features that cloud LLM economics blocked — ambient, real-time, per-keystroke, per-frame.
5. **It needs new patterns.** Streaming, availability checks, session reuse, and graceful fallback are the four things you'll need to learn that don't apply to cloud LLM calls.

## What this talk does NOT argue

- That on-device replaces cloud. Nano is a small model; Claude/Gemini-Ultra/GPT-5 are not. Use Nano for the local layer, cloud for the heavy lifting.
- That every web app needs AI. The pitch is: *when* you'd use AI, you now have a free local option for many tasks.
- That this is production-perfect. Some APIs are still draft. The availability story has rough edges. We'll cover them honestly.

## The closing line (telegraphed here for consistency)

> The browser became an inference runtime, and nobody sent you a memo. The cost of "what if we just ran a language model here?" used to be a budget meeting. Now it's a `LanguageModel.create()` call.
