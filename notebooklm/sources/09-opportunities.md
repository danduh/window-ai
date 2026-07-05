# Opportunities — What You Can Build Now

The honest framing for this section: most products in 2024–2025 added "AI features" that were either too expensive to run at scale or duplicated something the user could already do in ChatGPT. On-device AI changes the economics, which changes what's worth building. Here's the categorized opportunity map.

## Category 1 — Real-time text features

Features that *should* be ambient but were too expensive on cloud LLMs.

- **Live translation overlay** — translate every message in a chat into the reader's language, automatically, on render. No "translate this" button. Latency-free, free to run, no data egress.
- **Inline grammar/style checker** — runs on every keystroke. Replaces server-backed Grammarly-style features for offline-capable products.
- **Real-time text classification** — sentiment, intent, language, severity, category, PII detection — runs as the user types, no debounce needed.
- **Smart paste** — detect what the user just pasted (URL? code? phone number? address?) and offer the relevant action.
- **Per-keystroke autocomplete** — not just word completion, but phrase or paragraph completion in the user's voice. Was prohibitively expensive on cloud.

**Why now**: $0/keystroke, ~50–200 ms first token.

## Category 2 — Privacy-first AI features

Features that companies *wanted* to ship but couldn't because of data sensitivity.

- **Medical / healthtech assistants** that summarize patient notes, draft replies, suggest codes. On-device means HIPAA-compatible by physics, not by contract.
- **Legal tech** — contract review, redline suggestions, clause extraction. No data ever leaves the user's machine.
- **Financial services chat** — explain a transaction, draft a reply to a customer, classify a support ticket. Data residency solved by definition.
- **Therapy / journaling apps** — sentiment analysis, supportive responses, mood tracking. The most sensitive category of user data; on-device is the only ethical default.
- **Enterprise SaaS** with strict data-handling clauses. Customers ask "where does our data go?" — answer: "nowhere".

**Why now**: the compliance cost of cloud LLM integration in regulated industries is often >$200K/year in legal + engineering. On-device collapses that to near zero.

## Category 3 — Offline-capable AI

Features that *only* work without a network.

- **Reading apps** that summarize articles you saved on a plane.
- **Field tools** for inspectors, surveyors, sales reps in remote areas — voice notes → summary, photo → caption, all offline.
- **Privacy-conscious browsing** — incognito sessions can still have AI features, with no telemetry.
- **Travel apps** — translate signs, menus, conversations in airplane mode or roaming-disabled.
- **Backup mode** for cloud LLM products — if the cloud service is rate-limited or down, fall back to on-device for table-stakes features.

**Why now**: the user's device IS the inference runtime; no network is needed once the model is downloaded.

## Category 4 — Ambient AI in tools

Features that watch what the user is doing and quietly help.

- **Editor that proofreads silently** — corrections appear inline, no "check now" button.
- **Form filler** — detect form context, suggest values from the user's clipboard or recent inputs.
- **Notification triager** — classify incoming notifications and bundle low-priority ones.
- **Tab manager** — suggest grouping or closing tabs based on content.
- **Email assistant** — auto-draft reply suggestions as the email loads, not on demand.

**Why now**: ambient features only make sense if they're free and instant. Cloud LLMs are neither.

## Category 5 — Multimodal "show me" features

Webcam and image input unlock product shapes that were science-fiction in 2023.

- **Object identifier** — point your camera at anything, get a description. Educational apps, accessibility, kids' tools.
- **Document scanner with semantic understanding** — not just OCR, but "this is a receipt; the total is $42.18; the date is May 15".
- **Whiteboard capture** — webcam pointed at a whiteboard, model transcribes the diagram into structured notes.
- **Accessibility narrator** — describes the page or image content for visually impaired users.
- **Recipe + cooking helper** — point camera at ingredients, suggest a recipe. Photo of fridge → meal plan.
- **Live moderation** — webcam-based child-safety features in kids' apps. No frames leave the device.

**Why now**: the Prompt API (`LanguageModel`) is stable on the open web since Chrome 148, including multimodal input (image/audio via `expectedInputs`). No flag required. Image input is essentially free.

## Category 6 — Agentic web apps (early)

Features enabled by WebMCP — let an AI agent drive the page. The agent is a *guest in the user's tab*: it inherits the user's existing login, cookies, and session, so tools like `purchase()` or `book()` work with no separate auth, API key, or OAuth dance.

- **"Do it for me" workflows** — the user says what they want; the agent invokes the right page tools in sequence. Booking, ordering, planning, scheduling.
- **Voice control of complex SaaS apps** — registered tools become the voice command vocabulary.
- **Cross-page agents** that hop between sites the user is signed into, using each page's tools. (Future — needs cross-page agent infrastructure.)
- **Customer-facing copilots** in B2B apps — the AI sees only what the page exposes, runs only what the page allows.

The efficiency story is the pitch: exposing structured tools instead of making an agent read screenshots and click pixels yields roughly **98% task accuracy, ~89% fewer tokens** (no images to process), and **~68% less overhead**. Structured tools beat pixel-peeping.

Real adopters are already experimenting with WebMCP: **Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, Redfin**. Google also shipped a demo suite worth studying — a maze you escape by prompting an agent, **CineFlow** (movie tickets), a hotel-booking app (**L'Atelier**), and a smart-home demo.

The registration pattern is stable across Chrome 146–150, but the entry point moved: `navigator.modelContext` is **deprecated in Chrome 150** — use `document.modelContext`, feature-detecting both.

```js
const modelContext = document.modelContext ?? navigator.modelContext;

const controller = new AbortController();
modelContext.registerTool(
  {
    name: 'book',
    description: 'Book the currently selected room',
    // input schema…
    async execute({ input }) { /* runs against the user's session */ },
  },
  { signal: controller.signal }, // abort to unregister — portable across 146–150
);
```

Chrome 150 also adds `unregisterTool(name)` and `clearContext()`, and `provideContext` replaces the full toolset at once — but the AbortSignal path above is the recommended, portable pattern.

**Why now**: WebMCP is a public **origin trial from Chrome 149** (flag-only before that). For local dev, enable `chrome://flags/#enable-webmcp-testing`; for a deployed origin, register an OT token. But it's still a W3C draft and still moving — **prototype now, don't ship to production yet.**

## Category 7 — The "feature was uneconomic" category

A grab-bag of features that have a cloud-LLM equivalent but couldn't justify the per-MAU cost.

- **Per-user content moderation** in social apps. Cloud was too expensive at user scale.
- **Smart filters / search ranking** based on semantic understanding of items.
- **Personalization** based on the user's reading history. Each user gets their own model session.
- **Educational tools** where every student gets an AI tutor. Schools couldn't afford the cloud bill.
- **Accessibility features** that need to run on every page — alt-text generation, content summarization, navigation help.

**Why now**: free is a different unit-economics curve than $0.005/call.

## Category 8 — The "kitchen sink" app (use most of the APIs at once)

The most compelling demo isn't one API — it's **one app that stitches several together**. This is the shape the v2 talk ends on. Two interchangeable forms, pick whichever fits your product:

**(A) "Sidekick" — a Chrome extension side panel that works on ANY site.** One surface, many built-in APIs:
- **Summarize** the current page (Summarizer, stable since Chrome 138).
- **Translate** a selection into the reader's language (Translator + Language Detector, stable since Chrome 138).
- **Proofread** and **rewrite** what the user is typing into any input (Writer/Rewriter/Proofreader — still origin trial / behind a flag, so gate them and degrade gracefully).
- **Explain an image** on the page (Prompt API multimodal, stable since Chrome 148).
- **Warn before pasting private data** — run ambient PII detection on clipboard content before it leaves the box.
- **Drive the page's WebMCP tools** — the same side panel becomes an agent that calls `document.modelContext` tools on whatever site the user is on.

**(B) "The Fridge" — a single web app that chains the pipeline end to end:**
fridge photo → recipe ideas (Prompt API multimodal) → translate a foreign recipe (Translator) → summarize the steps (Summarizer) → a voice agent that scales or swaps ingredients via WebMCP tools registered on the page.

Either form is the natural finale because it makes the co-existence argument concrete: the ambient/real-time/on-device layer (Summarizer, Translator, Prompt API) and the agentic layer (WebMCP) are **one product experience**, not seven separate demos. It also ties straight into the adopters above — a "Sidekick" that drives WebMCP tools is exactly what Expedia, Booking.com, Shopify, Instacart, and the rest are prototyping, just generalized to run on any site.

**Why now**: every ingredient is shippable today (Summarizer/Translator/Language Detector and the Prompt API are stable; Writer/Rewriter/Proofreader and WebMCP are trial-stage, so feature-detect and degrade). The whole thing runs local except where you choose to reach for the cloud.

## What still belongs in the cloud

Be honest about what Nano can't do well, so the audience trusts your other claims:

- **Long-context reasoning** (>4K tokens of input). Nano's quota is small.
- **Complex math, code generation, multi-step reasoning** — use Claude Opus, GPT-5, Gemini Ultra.
- **Highly factual queries** — Nano hallucinates more than larger models.
- **Domain-tuned tasks** (medical diagnosis, legal precedent search) — needs a fine-tuned model, not Nano.
- **Multi-user shared state** (group chat agents, collaborative AI features) — needs a backend.
- **Anything where the user pays you to use a "premium model"** — that's a cloud LLM proposition.

The right architecture for most products is **hybrid**: Nano for the local, ambient, real-time layer; cloud for the heavy lifting. The two co-exist gracefully.

## How to pick the first thing to ship

If your team is going to add *one* on-device AI feature in Q3, pick the one that:

1. The user *wishes* was already ambient (suggesting it on demand feels weird, but having it just work feels right).
2. Has clear privacy stakes (so the on-device story is the headline).
3. Doesn't need long context or precise factuality.
4. Has a clear graceful-degradation path if the hardware doesn't meet the bar.

Examples that hit all four: live translation in chat, inline proofreading, smart paste, document summarization on save, ambient PII detection.

Avoid for the first ship: anything that needs >2K tokens of context, anything that's the *only* way to do the task (no fallback), anything user-visible that fails on 30% of devices.

## The category that doesn't exist yet

Be ready for the audience question: *"But what's the killer app for this?"*

The honest answer: we don't know yet. The web's killer apps (search, mail, social, video, e-commerce) emerged 3–10 years after the underlying platform shipped. Gemini Nano shipped to billions of devices in 2025. The killer app is being built right now by someone who realized free local inference changes the economics — and we'll know its name in 2027–2028.

The opportunity for *this* talk's audience is to be that someone.
