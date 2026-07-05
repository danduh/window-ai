# Limitations and Roadmap

A talk that ignores limitations is a sales pitch. This file is the honest list of what doesn't work yet, what's wobbly, and what's coming.

## Things that genuinely don't work

### 1. Mobile

Gemini Nano is **desktop-only** as of July 2026 (Chrome 150). No Android, no iOS, no ChromeOS for the full API surface. There are signals that a mobile variant is coming (likely 2027), but right now: mobile users get nothing.

For mobile-heavy products, this is the deal-breaker. Your fallback path on mobile is cloud — accept it.

### 2. The bottom 50% of laptops

Chrome's hardware bar (synthetic shader benchmark) excludes:

- Most laptops sold before 2020
- Many integrated-GPU Windows laptops at the budget tier
- Older Intel Macs (pre-Apple-Silicon)
- All Chromebooks except a handful of high-end models
- Any device with <8 GB RAM

On these devices, `availability()` returns `'unavailable'` permanently. Your fallback needs to feel like a real product, not a downgrade message.

### 3. Long-context tasks

Nano's input quota is ~4096 tokens. That's roughly 3000 words. You can't:

- Feed it an entire book chapter
- Have a 50-turn conversation without summarization
- Embed your full RAG context in the prompt

Workarounds (summarize-and-restart, chunked processing) work but add complexity. For genuinely long-context work, use a cloud model.

### 4. Reliable factual recall

Nano hallucinates. It's better than GPT-2 (much) but worse than GPT-4 (a lot). Do not use it for:

- "What year did X happen?"
- "Who is the CEO of Y?"
- "What's the dose of drug Z?"

Use it for transformations of text you provide. Don't use it as a knowledge source.

### 5. Precise structured output without `responseConstraint`

Free-form prompting for structured output (JSON, XML, key-value pairs) is unreliable on Nano. The model will sometimes emit prose around the JSON, occasionally invalid JSON, occasionally wrong field names.

**Always use `responseConstraint`** for structured output. (That's the W3C option name; Chrome's current build still ships this as `responseFormat` — expect both names in the wild.) Otherwise you're parsing free text from a small model — it will break.

### 6. Multi-language quality drops off

The major languages (en, es, fr, de, pt, ja, ko, zh, ar, he, ru) work well for translation. Smaller languages (Swahili, Welsh, Bengali) work but quality is meaningfully lower than cloud services.

For products in those markets, on-device is a fallback, not the primary path.

## Things that wobble

### 1. Multi-vendor implementation

Right now this is **Chrome plus Edge**. Brave has it (built on Chromium). Firefox has stated intent to implement but hasn't shipped. Safari has not committed.

The API surface is *technically* designed to be standardized, but until two non-Chromium browsers ship it, treat it as a Chrome-platform feature, not a web-platform feature.

### 2. Origin-trial vs flagged vs stable

The APIs are in different states (as of Chrome 150, July 2026):

| API | Status | Risk |
|---|---|---|
| Summarizer | Stable Chrome 138+ | Low |
| Translator + LanguageDetector | Stable Chrome 138+ | Low |
| LanguageModel / Prompt API (text) | Stable on the open web Chrome 148+ | Low (recently graduated from extensions-only) |
| LanguageModel (multimodal: image + audio) | Stable Chrome 148+ | Low (very recent) |
| Prompt API tool-calling (`tools[]`) | Documented + functional Chrome 148+ | Low-Medium (new surface) |
| Writer | Origin trial / behind a flag | Medium — not yet stable |
| Rewriter | Origin trial / behind a flag | Medium — not yet stable |
| Proofreader | Origin trial / behind a flag | High — may not stabilize |
| WebMCP | W3C draft, **public origin trial** Chrome 149+ | High — shape will change |

The stable set (Summarizer, Translator, LanguageDetector, Prompt API text + multimodal) you can build on confidently. Writer / Rewriter / Proofreader are still pre-stable — prototype, but keep the cloud fallback wired. WebMCP is an origin trial: usable behind a token or a Canary flag, but do not ship to production.

### 3. The "model download" UX

This is the single weakest part of the platform. First-time users who land on a page using these APIs hit a 4 GB download with no clear UI unless the developer built one. Chrome doesn't show progress unless the page does.

Until Chrome ships a built-in download progress UI, every consumer-facing product needs to build the "Setting up AI features..." overlay itself.

### 4. The model auto-purges

If the user's disk drops below ~22 GB, or if no API has used the model in 30 days, Chrome silently deletes it. The next `availability()` call returns `downloadable` again.

This means a user who *had* the feature working can come back two months later and have it broken. Build for the re-download path.

### 5. Settings can disable it

Chrome 138+ added a user-facing toggle: Settings → System → "Turn on-device AI on or off". Users (or enterprise IT policies) can disable it entirely. When disabled, every API returns `'unavailable'`.

Some users will have disabled it because of the 2026 "silent 4 GB download" controversy. Be ready for that.

## Things that are coming

### Short term (mid-2026)

- **Audio input** for multimodal (currently restricted to discrete GPUs, expanding to integrated)
- **WebMCP stabilization** — target late 2026 / early 2027. Now in a **public origin trial from Chrome 149**; the entry point was renamed from `navigator.modelContext` (deprecated in Chrome 150) to `document.modelContext`. Chrome 150 also added `unregisterTool(name)` and `clearContext()` alongside the core `registerTool(tool, { signal, exposedTo? })`.
- **Writer / Rewriter / Proofreader stabilization** — still origin trial / flagged; watch for a clean stable rollout.
- **Settings UI** for users to see and manage downloaded model components
- **Edge feature parity** with Chrome flag-by-flag

### Medium term (late 2026 / 2027)

- **Mobile support** — likely Android first, iOS contingent on Apple's separate moves with their on-device AI
- **Multi-vendor implementation** — Firefox, possibly Safari
- **Larger model variants** for high-end devices (4B → 8B range)
- **Streaming tool calls** — currently tool calls block; streaming would let UI render during the call
- **Fine-tuning hooks** — letting pages provide a small adapter for domain-specific behavior (rumored, not committed)

### Long term (2027+)

- **Hardware-specific model variants** — different model sizes for laptops, desktops, mobile
- **Cross-tab agentic coordination** — agents that can act across sites the user is signed into
- **Persistent agent context** — agents that remember across sessions (huge privacy implications, will move slowly)
- **The first real specification finalization** — until then, treat this as a Chrome platform.

## How to bet on this safely today

The pragmatic posture for product teams in 2026:

1. **Build on the stable set** (Prompt API / LanguageModel — text *and* multimodal — plus Summarizer, Translator, LanguageDetector). These are safe. The Prompt API's `tools[]` calling is documented and functional too.
2. **Prototype on Writer / Rewriter / Proofreader** — still origin trial / flagged, so keep cloud fallback and expect the surface to shift before it stabilizes.
3. **Don't ship WebMCP to production.** It's a public origin trial from Chrome 149 — great for demos and internal tools, but it's still a W3C draft that's actively moving.
4. **Build the cloud-fallback path first.** Then layer on-device as the fast/free/private path when available.
5. **Treat browser AI as a Chrome platform feature today, web platform feature in 2027.**

That's the conservative read. The aggressive read is: ship to your power users on Chrome first, learn fast, expand as the platform broadens. Either is defensible.

### The "kitchen sink" opportunity

Once you're comfortable with the individual APIs, the interesting move is combining most of them in one app. Two shapes worth prototyping:

- **Sidekick** — a Chrome extension side panel that works on *any* site: summarize the page, translate a selection, proofread an input, rewrite text, explain an image, warn before you paste private data, and drive a page's WebMCP tools. It leans on the whole stack at once.
- **The Fridge** — a web app: snap a fridge photo → get recipe ideas (multimodal Prompt API) → translate a foreign recipe → summarize the steps → let a voice agent scale or swap ingredients via WebMCP tools registered on the page.

Both are demos, not production bets — but they show why WebMCP matters. The key idea is **session inheritance**: the agent is a guest in the user's tab, using their existing login and cookies, so tools like `purchase()` or `book()` work with no separate auth or API key. Compared to the old "agent reads a screenshot and clicks pixels" approach, structured tools deliver roughly **98% task accuracy, ~89% fewer tokens** (no images to process) and **~68% less overhead**. Real sites are already experimenting — Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, Redfin — and Google shipped a demo suite (a maze you escape by prompting an agent, CineFlow for movie tickets, the L'Atelier hotel-booking app, and a smart-home demo).

## What would change this assessment

Watch for:

- **Firefox shipping** any of these APIs. That changes "Chrome platform feature" to "web platform feature".
- **Apple announcing on-device AI in Safari.** Specifically, whether they implement the W3C-track surface or do their own thing.
- **WebMCP V1** (W3C Recommendation). Now in a public origin trial from Chrome 149; V1 is probably still 12–18 months away.
- **Chrome mobile** shipping the model. That triples the addressable user base overnight.

Any of these would be reason to invest more aggressively. None of them are confirmed for 2026.
