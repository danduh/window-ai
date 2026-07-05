# Why On-Device, Why Now

## The four forces that converged in 2024–2026

On-device LLM inference in the browser became practical because four independent trends crossed paths at roughly the same time:

### 1. Small models got good

Gemini Nano (2B / 4B parameters), Phi-3, Llama 3.2 1B/3B, Qwen 2.5 1.5B — the 2024–2025 generation of small instruction-tuned models clears the bar for the *tasks people actually use LLMs for*: summarization, rewriting, translation, classification, extraction, short-form generation, and tool selection. They do not match GPT-4 or Claude on complex reasoning. They do not need to.

The relevant benchmark for the browser use case is not MMLU; it's "can this rewrite a customer support reply in a slightly more formal tone without hallucinating policy?" The answer for 2B+ models is yes.

### 2. Consumer hardware got fast enough

Apple Silicon shipped neural acceleration into every Mac sold since 2020. Qualcomm shipped Hexagon NPUs into mainstream Windows laptops. Even mid-range integrated GPUs from 2023+ have enough memory bandwidth to serve a quantized 2B model at conversational token rates.

Chrome's eligibility check on first run benchmarks the device with a synthetic shader and picks the largest model variant that will hit a target tokens-per-second. Devices that fail the check don't get the model — the runtime degrades gracefully.

### 3. Browser vendors made a shared bet

Google shipped Gemini Nano via the optimization-guide component (the same delivery mechanism it uses for Safe Browsing models). Microsoft Edge picked up the same APIs. Brave shipped its variant. Mozilla published a position note signaling intent to implement compatible APIs.

This matters because the *web platform* requires multi-vendor implementation for an API to feel safe to build on. The maturity is now uneven but real: Summarizer, Translator, and Language Detector have been stable since Chrome 138, and the Prompt API (`LanguageModel`) went stable on the open web in Chrome 148 (it's no longer extensions-only, and it now supports multimodal input and structured output). Writer, Rewriter, and Proofreader are still origin-trial / behind-a-flag. WebMCP (`document.modelContext`) is a public origin trial as of Chrome 149. The trajectory is clear even where the individual APIs haven't all landed.

### 4. The cloud LLM bill came due

Every product team that shipped a "AI feature" in 2023 has a 2024–2025 spreadsheet showing the per-MAU inference cost. Most of those features are not strategic differentiators — they're table-stakes (autocomplete, suggest a reply, summarize this thread). Paying $0.50/MAU/month for table stakes is not a sustainable position.

On-device inference is the answer for the "table-stakes AI" layer specifically. Reserve cloud LLM spend for the features that actually need it.

## What changes when inference is free

When the per-call cost of an LLM drops from $0.005 to $0.000, three things change:

**The unit of analysis changes.** Designers stop thinking "where do we put the AI button?" and start thinking "where in this interaction is the user waiting on us to figure something out?" The answer is: many, many places.

**Real-time AI becomes the default.** Throttle/debounce becomes the wrong primitive. Run on every keystroke, every paste, every selection change. The model is sitting idle on the user's GPU — using it doesn't cost anyone anything.

**Speculative AI becomes safe.** You can ask the model to do work the user didn't request — "guess what they'll type next", "pre-translate this paragraph in case they want it", "pre-summarize the article in case they scroll past the fold". If the prediction is wrong, nobody paid for it.

## What stays true

On-device inference is not a free lunch:

- **First-token latency** is local but not zero. Session warm-up adds ~300 ms; subsequent prompts in the same session are immediate.
- **Throughput** is per-user, not per-server. You can't scale a single hard prompt across multiple GPUs.
- **The user pays the electricity bill.** A sustained inference loop on a laptop draws the GPU; on battery, the user notices.
- **The user owns the model.** You can't pick the model, version, or weights. Chrome manages it. If the user disables on-device AI in settings, your feature breaks — degrade gracefully.
- **No system access.** Browser sandbox holds. The model can't read the filesystem, network, or other tabs.

## The "but it's just a small model" objection

Yes. A 2B–4B parameter model is not a generalist genius. It is, however:

- **Better than the median human** at narrow text transformation tasks (rewrite formal, summarize bullets, fix grammar).
- **Better than any non-AI heuristic** for tasks like language detection, sentiment classification, and intent extraction.
- **Better than nothing** in the offline case, which used to mean "feature unavailable".
- **Better than a $0.005 cloud call** for the 80% of asks that don't need cloud-scale reasoning, because it costs $0.

Pick the right tool for the task. Use the local model for *most* of what people ask LLMs to do. Use a cloud model when the task genuinely requires it. Most product teams overestimate how often that second case actually arises.

## The compliance angle

For regulated industries (finance, healthcare, government, EU consumer products):

- On-device inference means **no data crosses the network** for the AI step. Customer text, PII, transaction data — all of it stays in the browser process.
- That collapses an enormous category of compliance work. No DPA negotiation with the LLM vendor. No data-residency engineering. No third-party processor disclosures for the AI feature specifically.
- It does not collapse all of it. You still need to handle storage, telemetry, and consent for the rest of the app. But the AI step itself becomes a non-event from a compliance standpoint.

This is the single most underrated business reason to adopt on-device AI. For a fintech, healthtech, or EU-targeted product, the legal cost savings dwarf the inference cost savings.
