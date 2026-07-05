# Demo Runbook — Live Demonstrations

This is the **click-by-click guide** for every demo in the talk. Every demo has a primary path, a known-good fallback, and an emergency "kill the demo" option. Rehearse twice; trust the runbook on stage.

## Pre-talk setup (do this once, day-of)

### Hardware checklist
- [ ] Demo laptop: Chrome **150 stable** (released June 30, 2026) installed and updated. Keep **Chrome Canary** as a backup profile for anything still flag-gated (Writer/Rewriter/Proofreader, WebMCP local dev).
- [ ] Charger plugged in (model inference draws battery)
- [ ] Hotspot ready (don't trust venue Wi-Fi for initial model download)
- [ ] HDMI dongle tested
- [ ] Webcam working in `chrome://settings/content/camera`
- [ ] Microphone working in `chrome://settings/content/microphone`

### Browser checklist
- [ ] Stable-by-default APIs need **no flags** on Chrome 150: Summarizer, Translator, Language Detector (stable since 138), and the Prompt API / `LanguageModel` — including multimodal input and structured output (stable on the open web since Chrome 148, no longer extensions-only).
- [ ] Flag-gated demos: **Writer / Rewriter / Proofreader** are still origin-trial / behind a flag — enable their flags (see `sources/02-chrome-builtin-apis-overview.md` for the full list), or run them on the Canary backup profile.
- [ ] **WebMCP**: public **origin trial since Chrome 149**. For this local/laptop demo enable `chrome://flags/#enable-webmcp-testing`; for a deployed origin you'd instead register an OT token. (Was flag-only in Chrome 146 — old runbooks are stale.)
- [ ] Model downloaded and ready — verify at `chrome://on-device-internals/`
- [ ] Translation packs pre-warmed for the target languages used in the opener (es, fr, de, ja)
- [ ] DevTools docked to right, Network tab open
- [ ] Zoom level: 110–125% (so the audience can read code)
- [ ] Dark mode set in OS so devtools matches your slide deck
- [ ] All demo URLs **pre-loaded in separate tabs** in this order:
  1. `windowai.danduh.me/live-translate` (opener)
  2. `windowai.danduh.me/chat`
  3. `windowai.danduh.me/summary`
  4. `windowai.danduh.me/proofreader`
  5. `windowai.danduh.me/multimodal`
  6. `windowai.danduh.me/webmcp`
  7. `windowai.danduh.me/finale` (the "kitchen sink" app — Sidekick extension **or** The Fridge web app)
  8. (spare blank tab for emergency `chrome://on-device-internals/`)

### Smoke test (run 15 min before talk)
1. Open `/live-translate`, click start, speak one sentence. Translations appear in all 4 columns.
2. Open `/chat`, send "What is 2+2?". Streaming reply appears.
3. Open `/summary`, paste any 3 paragraphs from the script. Bullets appear.
4. Open `/proofreader`, type a bad sentence. Corrections appear.
5. Open `/multimodal`, drag a pre-prepared photo. Description appears.
6. Open `/webmcp`. Recipe list loads. Agent panel opens. Confirm the page did **not** show the missing-flag banner (i.e. `document.modelContext` resolved).
7. Open `/finale`. The kitchen-sink app loads and at least one API round-trips (fridge photo → recipe idea, or Sidekick side panel summarizes the current tab).

If any of these fail at smoke test, the corresponding demo is **off the running order** — skip to the slide-only fallback. Do not try to fix on stage.

---

## DEMO 1 — Live voice translation (the opener)

**Timing:** 0:30 – 2:00 in the talk
**URL:** windowai.danduh.me/live-translate
**Risk level: LOW** (this demo has been the most reliable; opener choice is intentional)

### Path
1. Switch to the `/live-translate` tab (already open).
2. DevTools should be visible — Network tab. **Audience watches the network tab.**
3. Click **Start** in the page UI.
4. Grant mic permission (already granted from smoke test — should not prompt).
5. Speak the prepared opening line:

   > *"Good morning everyone, I'm really happy to be here today, and I hope you find this talk useful."*

6. Translations appear in 4 columns within ~500 ms.
7. **Hold the page state** while you narrate. Don't click anything.
8. **Show the network tab is empty.** Move mouse to it for emphasis.

### Fallback A — recognition doesn't start
- Click the microphone icon in the address bar; verify permission.
- If still failing: click **Stop**, then **Start** again.
- If still failing: refresh the page (Cmd+R), grant permission, retry.

### Fallback B — translations don't appear
- Open DevTools Console; look for `Translator: unavailable` errors.
- If model not loaded: switch to **emergency path** below.

### Emergency path — kill the demo
- Skip to a pre-recorded video of the same demo embedded in slide 1.5 (insert one if recording).
- Cover with: "I recorded this last night just in case the demo gods weren't on our side. Same setup, same result." Move on.

---

## DEMO 2 — Chat with LanguageModel

**Timing:** 6:30 – 7:30
**URL:** windowai.danduh.me/chat
**Risk level: LOW**

### Path
1. Switch to `/chat` tab.
2. Type in the input: **"Write a haiku about TypeScript."**
3. Hit enter. Streaming response.
4. **Highlight the streaming behavior** — point at the tokens appearing.
5. (Optional) Send a follow-up to show conversational state: **"Now make it about Rust."** — model remembers it's writing haiku.

### Fallback
- If the response hangs >5 seconds, refresh the page and retry once.
- If retry fails: skip to slide 12, voice-over the example.

---

## DEMO 3 — Summarizer with all four types

**Timing:** 9:30 – 10:45
**URL:** windowai.danduh.me/summary
**Risk level: LOW**

### Path
1. Switch to `/summary` tab.
2. Paste a prepared 200-word text. **Use this exact text for consistency** (pre-saved in clipboard or page):

   > *"The Chrome browser now ships with a built-in language model called Gemini Nano. This model runs entirely on the user's device, with no network requests required for inference. The model is approximately 4 gigabytes on disk and is downloaded once per user, then cached. Web pages can access the model through a JavaScript API called LanguageModel, which exposes methods for creating sessions, prompting the model with text, images, or audio, and streaming responses. The Chrome team has also shipped task-specific APIs for summarization, writing, rewriting, proofreading, translation, and language detection — all of which use the same underlying model with task-tuned prompts and decoder configurations. As of July 2026 on Chrome 150, the stable open-web APIs are LanguageModel (the Prompt API, with multimodal input and structured output), Summarizer, Translator, and LanguageDetector. Writer, Rewriter, and Proofreader remain in origin trial or behind a flag. WebMCP is a public origin trial as of Chrome 149."*

3. Cycle through the four summary types in this order:
   - **TL;DR** → 1–2 sentence summary
   - **Key points** → 4–5 bullets (default and most useful)
   - **Teaser** → "Want to know the future of AI on the web?"-style
   - **Headline** → single line

4. **Land the `sharedContext` beat** — explain that adding a context like "this is a technical blog" changes the tone of every summary.

### Fallback
- If any summary type fails, do the next one. Don't troubleshoot.
- If all fail: skip to slide 14, narrate.

---

## DEMO 4 — Proofreader inline corrections

**Timing:** 11:30 – 12:15
**URL:** windowai.danduh.me/proofreader
**Risk level: MEDIUM** (Proofreader is flagged, may behave inconsistently)

### Path
1. Switch to `/proofreader` tab.
2. Type slowly (so audience sees the inline corrections appear):

   > *"She dont know nothing about it."*

3. Wait ~1 second; underlines and tooltips appear on "dont" and "nothing".
4. Hover one to show the correction suggestion.
5. **Optional second sentence** if time allows: *"Me and him went to the store yesterday and we seen alot of people."*

### Fallback
- If Proofreader returns no corrections, type a more egregious sentence: *"i dont no nothing bout this."* If still nothing, skip.
- If demo fails entirely: cut to slide 16, narrate.

### Pre-talk warning
If the smoke test showed Proofreader was sluggish or unreliable, **cut this demo** from the running order. The audience will not miss it — narration covers the API conceptually.

---

## DEMO 5 — Multimodal (image)

**Timing:** 14:15 – 15:00
**URL:** windowai.danduh.me/multimodal
**Risk level: MEDIUM** (sometimes slow on first call after a long idle)

### Path
1. Switch to `/multimodal` tab.
2. **Have a pre-prepared photo on the desktop** — a clear photo of an object or scene (e.g., a coffee cup on a desk, a city street, a piece of fruit). Avoid photos with people.
3. Drag the photo onto the page.
4. Type the question: **"Describe this image in one sentence."**
5. Stream the response.

### Pre-prepared photo suggestions
- A coffee cup on a wooden desk (clear, simple)
- A street with a few buildings and a sign (tests OCR-like text reading)
- A bowl of fruit (tests counting + naming)

### Fallback
- If first call is slow: stay with the audience, narrate while it loads. Don't refresh.
- If completely fails: skip to slide 19, narrate the code.

---

## DEMO 6 — Multimodal (webcam live)

**Timing:** 15:00 – 15:30
**URL:** same as Demo 5, switch to webcam tab
**Risk level: HIGH** (this is the one most likely to fail)

### Pre-talk
- Frame the webcam to point at something interesting on the table — a coffee cup, a pen, a card with a printed word.
- Verify the camera permission was granted (no prompt should appear).

### Path
1. In `/multimodal`, switch to **Webcam** mode.
2. Click **Start**.
3. The page begins analyzing frames at ~3-second cadence.
4. **Hold something different** in front of the camera mid-stream — phone, water bottle, a printed slide. Model updates.
5. **Land the privacy beat** — point at the empty network tab.

### Fallback A — webcam fails to start
- Try clicking **Stop** then **Start**. One retry only.
- Check camera permission in address bar.

### Fallback B — analysis hangs
- Skip to slide overlays: *"Downsample. Single in-flight. Reuse session."* — narrate from there.

### Emergency
- Skip the live webcam beat entirely. Go directly to "let's talk about WebMCP." Save 30 seconds.

---

## DEMO 7 — WebMCP recipe agent

**Timing:** 16:30 – 17:30
**URL:** windowai.danduh.me/webmcp
**Risk level: HIGH** (WebMCP is a W3C draft, still moving — do not ship to production; OT flag may not be active; agent flow may stall)

### Pre-talk
- Confirm `chrome://flags/#enable-webmcp-testing` is enabled (local dev path). On a deployed origin you'd rely on the registered origin-trial token instead.
- Sanity-check the entry point in the console: `document.modelContext ?? navigator.modelContext` should be defined. `navigator.modelContext` is **deprecated in Chrome 150** — the page feature-detects both, but verify the modern path resolves.
- Verify in smoke test that the recipe list loads and the agent panel opens.
- Verify a prior `scaleRecipe` call succeeded in the smoke test.

### The one-line beat to land
The page registers its tools with the portable pattern (works across Chrome 146–150):

```js
const modelContext = document.modelContext ?? navigator.modelContext;
const controller = new AbortController();
modelContext.registerTool(
  {
    name: 'scaleRecipe',
    description: 'Scale a recipe to a target number of servings',
    // structured input schema…
  },
  { signal: controller.signal }
);
// abort() to unregister — the portable teardown path across 146–150.
// Chrome 150 also adds modelContext.unregisterTool(name) and modelContext.clearContext().
```

**Session inheritance is the point:** the agent is a guest in the user's tab and reuses the user's existing login/cookies, so a `purchase()` or `book()` tool works with no separate auth or API key. Structured tools also beat the old "agent reads screenshots and clicks" approach — roughly 98% task accuracy, ~89% fewer tokens (no images to process), ~68% less overhead. If asked "who's actually doing this?": Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, Redfin are already experimenting; Google shipped a demo suite (a maze you escape by prompting an agent, CineFlow for movie tickets, the L'Atelier hotel-booking app, and a smart-home demo).

### Path
1. Switch to `/webmcp` tab.
2. **Show the recipe browser briefly** — scroll through 2–3 recipes.
3. **Open the agent panel** (usually a right-side drawer).
4. Type: **"Scale the chocolate cake to 12 servings and generate a shopping list."**
5. Watch the agent:
   - Invoke `scaleRecipe({ servings: 12 })`
   - Invoke `generateShoppingList()`
6. Show the **Tool Inspector** if the Chrome Canary extension is installed — surface the registered tools.

### Fallback A — agent doesn't invoke tools
- Type a simpler prompt: **"What recipes are available?"** to force a `listRecipes` invocation.

### Fallback B — page shows the MissingFlagBanner
- This means `document.modelContext ?? navigator.modelContext` resolved to nothing — the WebMCP origin trial isn't active for this session (flag off, or OT token missing on a deployed origin). **Restart Chrome** is not an option on stage.
- Skip the demo entirely. Go directly to slide 21 and narrate the code (the `document.modelContext` + `registerTool` snippet above).

### Emergency
- Skip the WebMCP demo. Narrate the API from slides 20–21. This is the highest-risk demo; skipping it doesn't hurt the talk.

---

## DEMO 8 — The finale ("kitchen sink")

**Timing:** 17:30 – 19:00 (the closer)
**URL:** windowai.danduh.me/finale
**Risk level: HIGH** (chains most of the APIs together; any one link can stall)

This is the new v2 closer: **one app that uses most of the APIs together.** Pick ONE of the two interchangeable forms depending on the slot and what smoke-tested clean — they make the same point, so the runbook stays slot-neutral.

**Form A — "Sidekick" (Chrome extension side panel, works on ANY site):** summarize the current page, translate a selection, proofread an input, rewrite text, explain an image, warn before pasting private data, and drive the page's WebMCP tools.

**Form B — "The Fridge" (web app):** fridge photo → recipe ideas (Prompt API, multimodal) → translate a foreign recipe (Translator) → summarize the steps (Summarizer) → a voice agent scales/swaps ingredients via WebMCP.

### Path (Form B — The Fridge, the default demo)
1. Switch to `/finale`.
2. Drag the **pre-prepared fridge photo** onto the page. The Prompt API returns 2–3 recipe ideas from what it "sees." (Multimodal input is stable on Chrome 150 — no flag.)
3. Pick a recipe that's written in another language; hit **Translate**. Translator localizes it.
4. Hit **Summarize steps**. Summarizer condenses to key points.
5. Open the **voice agent** and say: *"Scale this to six servings and swap butter for olive oil."* The agent calls the page's WebMCP tools (`scaleRecipe`, `swapIngredient`) via `document.modelContext`.
6. **Land the closer:** one page, on-device, no backend, tools the agent drives through session inheritance.

### Path (Form A — Sidekick, if that's the slotted form)
1. Open the extension **side panel** on any pre-loaded article tab.
2. **Summarize this page** → key points.
3. Select a foreign-language paragraph → **Translate selection**.
4. Type into a form field → **Proofread** (flagged; only if it smoke-tested clean) and **Rewrite** to a friendlier tone.
5. **Explain image** on a photo in the page.
6. Trigger the **"warn before pasting private data"** beat with a fake API key in the clipboard.
7. **Drive the page's WebMCP tools** from the panel to close.

### Fallback — a link in the chain stalls
- Each step is independent. If translate stalls, skip to summarize. If the voice agent stalls, type the same instruction into the agent box.
- Do **not** restart the whole chain on stage. Narrate the skipped link and continue.

### Emergency
- Drop to the pre-recorded finale video (record one — this is the closer, it must land).
- Or narrate from the finale slides: "most of these APIs, one app, all on-device."

---

## Cross-cutting failure protocols

### If model isn't loaded mid-talk
- Open `chrome://on-device-internals/` in the spare tab.
- Show "the model lives here" — even a failure becomes pedagogical.
- Move to narration-only mode for remaining demos.

### If network goes down
- Doesn't matter. All demos are on-device. Translation language packs are cached.
- Exception: the page itself needs to be loaded. If you can't load `windowai.danduh.me`, your pre-loaded tabs save you.

### If Chrome crashes
- Restart Chrome.
- All flags persist; tabs may need to be re-opened.
- Buy time by going to slide 8 (the cost-flipped table) and discussing the economics until you're back.

### If the demo laptop fails entirely
- Switch to backup laptop (have one).
- If no backup: skip all demos, talk entirely from slides. Audience will forgive it once.

## The cardinal rule

**The talk is the artifact, not the demo.**

Every demo can be cut. Every demo has a slide that carries the same point. If a demo is failing, don't troubleshoot — narrate, advance, recover. Audiences remember a confident speaker who skipped a broken demo; they don't remember the demo that worked. They very much remember a speaker who froze.

Trust the runbook. Skip when needed. Move forward.
