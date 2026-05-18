# Your Browser Just Grew a Brain: Building Local-First AI with Chrome’s Built-in APIs

“Hold on,” your teammate says, leaning over your monitor. “You’re telling me this thing can *rewrite the text*, *summarize the doc*, *translate the chat*, and *run parts of our app logic*—without touching the cloud?”

You spin your chair. “That’s exactly what I’m telling you.”

Chrome’s built-in AI is easy to underestimate because it doesn’t arrive with fanfare. There’s no new dashboard or magic URL. Instead, Google quietly tucked a set of **on-device AI APIs** into the browser. They speak plain JavaScript. They run locally. And they’re designed for the mundane-but-powerful tasks that turn average web apps into helpful ones: generating, rewriting, summarizing, translating—plus a low-level **Prompt API** that behaves like a tiny chat model you can script. All of it rides on **Gemini Nano**, Google’s small on-device model that downloads once and then lives on the user’s machine. Privacy by default, latency that feels snappy, and zero per-token bills. ([Chrome for Developers][1])

Before we get cute with use cases, let’s answer the “is this real?” question. Yes. The building blocks are official, documented, and evolving: the **Prompt API** for free-form chat-like interactions, **Writer** and **Rewriter** for text creation and cleanup, **Summarizer** for distilling long content, and **Translator + Language Detection** for private multilingual experiences. They don’t all land in stable at the same time, and availability can vary by channel, but the shape of the platform is here—and Google keeps publishing updates to the status pages and docs. ([Chrome for Developers][2])

## A day in the life of a local-first app

Picture a support dashboard your agents actually like using.

A customer writes a 12-paragraph message in Portuguese. Your app quietly detects the language and translates it to English, *in the browser*, before it ever hits your servers. The agent drafts a reply; your **Rewriter** nudges tone from “robotic apology” to “human clarity.” Meanwhile, a gnarly internal policy page (yes, the one nobody reads) gets piped through **Summarizer** to pull five crisp bullet points the agent can trust. The whole interaction stays local. Your legal team breathes easier. Your agent’s response time drops. Customers stop sending “tl;dr” replies.

None of this needs a PhD, an “AI team,” or a new vendor contract. It’s a couple of function calls—and a bit of product taste.

“Okay,” your PM says, “show me.”

### Rewriting without the rinse-repeat dance

You hand them a keyboard:

```js
// Softly formalize a rough reply.
const rewriter = await Rewriter.create({ instruction: "Make this polite, concise, and specific." });
const improved = await rewriter.rewrite(`
hey — i checked and it should work soon
maybe later today, not sure
`);
```

That’s it. The **Rewriter API** is purpose-built for this “take text, improve it” loop, and its sibling **Writer** is the “draft something from a task” version when you barely have a sentence to start with. They’re part of Chrome’s Writing Assistance APIs, and they run against the local model. Your user’s words don’t leave their machine. ([Chrome for Developers][3])

### Summaries that don’t make you hate PDFs

Now you point at the 18-page policy doc. “Watch this.”

```js
// Give me skimmable key points from a wall of text.
const summarizer = await Summarizer.create({ type: "key-points" });
const bullets = await summarizer.summarize(longPolicyText);
```

The **Summarizer API** supports different summary styles—key points, one-paragraph TL;DRs, headlines, even teaser-style previews. You choose the format; the model does the trimming. For feature docs, meeting transcripts, or the “Please review this PRD by noon” special, this lands like a superpower. ([Chrome for Developers][4])

### Translation that respects privacy

Finally, the conversation itself:

```js
// Detect and translate privately, on device.
const detector = await LanguageDetector.create();
const { detectedLanguage } = await detector.detect(userInput);

const translator = await Translator.create({ sourceLanguage: detectedLanguage, targetLanguage: "en" });
const english = await translator.translate(userInput);
```

No network calls to a third-party provider, no accidental PII leaks. It’s fast and local. You can round-trip the agent’s English back into the customer’s original language the same way. ([Chrome for Developers][5])

### When you need raw access: the Prompt API

Sometimes you want a lower-level “chat session” you can steer with a system prompt, sample turns, and streaming responses. That’s **Prompt API** territory. You create a session, set the tone, and prompt as needed:

```js
// A tiny, local chat you fully script.
const session = await LanguageModel.create({
  initialPrompts: [{ role: "system", content: "You explain things like an experienced mentor—clear, practical, never smug." }]
});

const help = await session.prompt("I'm debugging a flaky test. Where do I start?");
```

Two small implementation notes make apps feel professional:

1. **Check availability.** The model downloads the first time it’s needed; you can detect status as `available`, `downloadable`, or `downloading` and show progress so users don’t think your app froze. 2) **Stream output.** It’s a nicer UX for long answers. Both patterns are documented in the Prompt API guide. ([Chrome for Developers][2])

## “But is this production-ready?”

You’ll get this question. You *should* get this question. The honest answer is: it depends on your use case and your tolerance for moving targets. The APIs are real and shipping in stages—some in stable or origin trials, others via early preview programs. Google’s **Built-in AI status** page is the scoreboard you’ll want to keep an eye on as you plan. ([Chrome for Developers][6])

There are also practical constraints:

* **Disk and hardware:** users need **\~22 GB of free space** on the same volume as the Chrome profile for model downloads, and **>4 GB of VRAM** helps for acceleration. This isn’t you being picky; it’s in the docs. ([Chrome for Developers][7])
* **Platform support:** today’s Gemini-backed APIs target desktop Chrome; mobile support is limited. Again—check the matrix before you ship a feature that must work everywhere. ([Chrome for Developers][8])
* **API maturity:** some pieces are stable, others experimental. Plan for graceful fallbacks. ([Chrome for Developers][6])

“Translation: we should feature-gate,” your engineering manager says.

“Exactly,” you reply. “We gate on `availability()`, stream where we can, and fall back to server-side when we must.” (Yes, you can mix local-first with cloud when the device can’t handle it.)

## Where this shines (and where it doesn’t)

Let’s get clear on the sweet spot. Local-first **destroys** the tiny things that make users hate software: slow spinners for every keystroke, privacy disclaimers for trivial edits, vendors charging by the token for obvious rewrites. If your app deals with **text transformation**—customer replies, drafting emails, rewriting descriptions, summarizing articles, translating short messages—this is your lane. The **task APIs** were designed precisely for that. ([Chrome for Developers][1])

Where it doesn’t shine (yet) is the land of massive context windows, heavyweight reasoning, or “we need the absolute best model quality money can buy.” You can still wire a cloud model for those workloads—but honestly, a lot of day-to-day UX wins come from the small stuff. And the small stuff runs great locally.

## Tool use: from words to actions

A fair question you’ll hear is, “Can the model actually *do things*?” On the web today, the cleanest answer is: you orchestrate it. You take model output and drive your app. For more formal “function calling” patterns—where the model selects a typed tool and you execute it—Google documents the approach in their Gemini API and an **on-device function-calling SDK** for edge scenarios. This isn’t a standard web API yet, but the pattern is clear and the ecosystem is converging on it. In practice, you expose a few safe actions (search, fetch, calculate, update state) and let the assistant call them with structured inputs you validate. ([Google AI for Developers][9])

“Could it, say, add an item to the cart when a user asks?” your designer asks.

“Sure,” you say. “Define a `addToCart({ id, qty })` tool, let the model request it, confirm, then run the function. Guardrails are on us.”

## Real product moments you can ship next sprint

You don’t need a quarter-long roadmap to make this useful. Try these:

* **Human-sounding system emails**: feed your raw template to **Rewriter** with “warm, concise, specific” and cut your proofreading time in half. ([Chrome for Developers][3])
* **One-click TL;DR in docs**: add a “Summarize” button to long pages or PRs so readers get key points before diving in. ([Chrome for Developers][4])
* **Private chat translation**: detect, translate, and reply locally so global users stop fighting the interface. ([Chrome for Developers][5])
* **Inline prompt help**: wire the **Prompt API** to your own hints (“explain this error,” “suggest a regex”), stream the answer, and cache. ([Chrome for Developers][2])

If your app is enterprise-facing, the privacy story alone can unlock doors: on-device processing means less data egress and fewer vendor approvals. If you’re consumer-facing, the latency—and the feeling that “the app helps me, instantly”—is what people remember. On both axes, local wins.

## Developer ergonomics that actually feel modern

A few quick habits make teams happy:

* **Probe first, then light up UI.** Call `LanguageModel.availability()` at startup and show “AI features ready” when the model is truly available; if it’s still downloading, surface progress instead of a spinner and silence. (The docs spell out the states and the eventing.) ([Chrome for Developers][2])
* **Stream answers.** Long outputs feel faster when they trickle in. (Users will read as the text arrives; you’ve seen this movie.) ([Chrome for Developers][2])
* **Fall back gracefully.** If a device can’t meet hardware/storage requirements, degrade to your old, boring—but reliable—flow. Users prefer boring over broken. ([Chrome for Developers][7])

## The bigger picture

If the last five years were about moving AI workloads to giant cloud models, the next five add a twist: **local-first, privacy-first**, task-oriented intelligence built into the platform itself. Chrome’s approach is pragmatic—it doesn’t try to be everything; it tries to be the useful parts you’ll actually ship. The **task APIs** (Writer, Rewriter, Summarizer, Translator, Language Detection) handle the common jobs cleanly. The **Prompt API** lets you build your own flavor of chat logic in a few lines of code. And because they run on **Gemini Nano**, the network path to “no, we don’t store your data” gets blissfully short. ([Chrome for Developers][10])

Your teammate leans back. “So we can give users smarter writing, instant summaries, and multilingual support without adding a new vendor?”

“Exactly,” you say, closing the loop. “The browser can finally carry some weight.”

They grin. “Then let’s stop arguing about it and ship something.”

And that’s the point. You don’t need a manifesto. You need a button that makes life better today. With Chrome’s built-in AI, that button is surprisingly easy to wire.

---

**References & further reading:** Prompt API (availability, sessions, streaming), Writer/Rewriter, Summarizer, Translator & Language Detection, API status and built-in AI overview, plus platform/storage requirements. ([Chrome for Developers][2])

[1]: https://developer.chrome.com/docs/ai/built-in?utm_source=chatgpt.com "Built-in AI | AI on Chrome"
[2]: https://developer.chrome.com/docs/ai/prompt-api?utm_source=chatgpt.com "The Prompt API | AI on Chrome"
[3]: https://developer.chrome.com/docs/ai/rewriter-api?utm_source=chatgpt.com "Rewriter API | AI on Chrome"
[4]: https://developer.chrome.com/docs/ai/summarizer-api?utm_source=chatgpt.com "Summarize with built-in AI | AI on Chrome"
[5]: https://developer.chrome.com/docs/ai/translator-api?utm_source=chatgpt.com "Translation with built-in AI | AI on Chrome"
[6]: https://developer.chrome.com/docs/ai/built-in-apis?utm_source=chatgpt.com "Built-in AI APIs | AI on Chrome - Chrome for Developers"
[7]: https://developer.chrome.com/docs/ai/get-started?utm_source=chatgpt.com "Get started with built-in AI | AI on Chrome"
[8]: https://developer.chrome.com/docs/extensions/ai/prompt-api?utm_source=chatgpt.com "The Prompt API | Extensions and AI - Chrome for Developers"
[9]: https://ai.google.dev/gemini-api/docs/function-calling?utm_source=chatgpt.com "Function calling with the Gemini API | Google AI for Developers"
[10]: https://developer.chrome.com/docs/ai/writer-api?utm_source=chatgpt.com "Writer API | AI on Chrome"
