# Slide Outline v2 — "Small LLM in your Browser"
**39 slides · ~30:21 · Payoneer brand**
Design system: background charcoal `#1E1E28`, text white, accent electric-blue `#0033FF`, secondary gray `#6E6E78`, one pink `#FFCCF2` highlight per slide max. Fonts: **Avenir Next LT Pro** (text), **Consolas** (code). 16:9 at 10in × 5.625in. Logo: `notebooklm/image1.png`.
Slides are sparse — the narration (`script/narration-v2.md`) carries the message.

---

## Opening hook

### Slide 1 — Title  (35s)

**Visible:**
- Small LLM in your Browser
- Huge Opportunities for Web Applications
- [Speaker name / handle — placeholder]
- [Talk date — placeholder]

*Design:* Charcoal #1E1E28 background, white title in Avenir Next LT Pro. Electric blue #0033FF underline on the word 'Browser'. Speaker line and date in gray #6E6E78. Very sparse, centered.

*Speaker notes:* Hello everyone, and thank you for being here. I have one small request before we start. Please do not look at my slides right now. Instead, look at my browser. In a moment I will open the developer tools and show you the network tab. That is the panel that lists every request a web page sends to a server. Keep your eyes on it. If nothing appears there, something interesting is happening. Let us find out together.

### Slide D1 — [DEMO] Live translate  (45s)

**[DEMO]** Open windowai.danduh.me/live-translate. Open Chrome DevTools, select the Network tab, and clear it so it is visibly empty. Click the microphone button and speak one short friendly sentence, for example 'Good morning, I hope you are enjoying the conference.' Wait for four translations to appear on screen: Spanish, French, German, Japanese. Then point the audience back to the Network tab, still empty.

*Design:* Full-screen live browser, no slide chrome. DevTools Network panel docked and visible next to the translation output.

*Speaker notes:* So here is the page. This is my microphone button. I will say one sentence out loud. Good morning, I hope you are enjoying the conference. Now watch the screen. There it is in Spanish. In French. In German. And in Japanese. Four languages, in about a second. Now look here at the network tab. It is empty. Zero requests. Nothing was sent to a server. No cloud. No API. My words never left this laptop.

### Slide 2 — What just happened  (37s)

**Visible:**
- No backend
- No API key
- No cost
- No data left the laptop

*Design:* Charcoal background. Four short white lines stacked, generous spacing. The last line 'No data left the laptop' highlighted in pink #FFCCF2.

*Speaker notes:* So what just happened? On a supported desktop, Chrome downloads a small on-device model — Gemini Nano, about four gigabytes — in the background, so on many machines it is already there. Your web page calls it with a small piece of JavaScript. No backend, no API key, no cost per request. It is not on every device — it needs capable hardware, and the user can switch it off — so later I will show you how to check for it and fall back cleanly. This did not exist eighteen months ago. Now it ships in the browser. For the next thirty minutes, I want to show you what this unlocks for the applications you build.

## Section 2 — The shift

### Slide 2b — The old way — every AI feature was a cloud call  (22s)

*Design:* Simple flow diagram on the charcoal canvas: three rounded boxes — Browser → Your server → Cloud LLM — joined by electric-blue forward arrows, with a single muted return arrow beneath labelled "…the answer comes all the way back". Pink caption: "Every call costs money, adds latency, and sends the user’s data off the device."

*Speaker notes:* For years, every AI feature worked the same way. It was a cloud call. The browser talked to your server. Your server talked to a provider. Then the answer came all the way back. This costs money. It also takes time. And it sends user data away from the user.

### Slide 3 — Four forces (2024–2026)  (26s)

**Visible:**
- 1. Small models got good
- 2. Hardware got fast enough
- 3. Browsers made a shared bet
- 4. The cloud AI bill came due

*Design:* Charcoal #1E1E28 background, white numbered list in Avenir Next. Reveal lines one by one. Blue #0033FF accent on the numbers. No code.

*Speaker notes:* So why can we now do this in the browser? Four things changed. Let me show them to you, one by one. First, small models got good. Second, the hardware got fast enough. Third, browsers made a shared bet. And fourth, the cloud AI bill came due. Together, these four forces flipped the whole picture.

### Slide 4 — Force 1 — Small models got good  (28s)

**Visible:**
- Gemini Nano, Phi, Llama, Qwen
- 2B–4B parameters, instruction-tuned
- Good enough for real tasks

*Design:* Charcoal background, white text. Model names in Consolas. Pink #FFCCF2 highlight on 'Good enough for real tasks'. Gray #6E6E78 for the parameter line.

*Speaker notes:* Force one. Small models got good. A model like Gemini Nano, Phi, Llama, or Qwen is now small. Two to four billion parameters. And it is instruction-tuned, so it follows what you ask. The key word here is good enough. These small models now clear the bar for the tasks people really use every day. Summarize a long text. Translate it. Rewrite it. Sort it into categories. Pull out the important parts. They are not GPT-4. And for these jobs, they do not need to be.

### Slide 5 — Force 2 — Hardware got fast enough  (28s)

**Visible:**
- Apple Silicon since 2020
- Windows NPUs mainstream
- Integrated GPUs from 2023+

*Design:* Charcoal background, white text lines. Blue #0033FF accent bar on the left. Keep it sparse, three lines only. Gray for the year details.

*Speaker notes:* Force two. The hardware got fast enough. This is the quiet part. Apple Silicon has been in Macs since 2020. On Windows, the NPU, a chip made for AI work, is now normal. And integrated GPUs from 2023 and later are strong too. So here is the point. The laptop that people already own can run a small model at conversation speed. You do not need a data center. The machine on the desk is enough.

### Slide 6 — Force 3 — Browsers aligned  (34s)

**Visible:**
- Chrome: stable since 138 · 150 today
- Other Chromium (Edge): adopting
- Firefox: signaled interest
- Not multi-vendor-stable yet

*Design:* Charcoal background, white text. Version numbers in Consolas. Pink #FFCCF2 highlight only on the Firefox line to mark it as 'not yet'. Keep four short lines.

*Speaker notes:* Force three. The browsers aligned. This matters, because as web developers we build on the browser. Chrome leads here: the core APIs have been stable since version 138, and as of July 2026 the current stable Chrome is version 150 — so this is shipping software, not an experiment. Other Chromium browsers, like Edge, are picking up the same APIs, and Firefox has signaled interest. Let me be honest: we are not at multi-vendor stability yet — today this is really a Chrome story. But the direction is clear, and everyone is pointing the same way.

### Slide 7 — Force 4 — The bill came due  (30s)

**Visible:**
- 2023: "let us add AI"
- 2025: $0.50 / user / month?
- Not OK for basic features

*Design:* Charcoal background. The 2023 line in gray #6E6E78, the 2025 cost line in white, the '$0.50' figure in pink #FFCCF2. 'Not OK' line in blue #0033FF. Dollar figures in Consolas.

*Speaker notes:* Force four. The bill came due. This is my favorite one. Think back to 2023. Every team said the same thing. Let us add AI to our product. It felt free and exciting. Then 2025 arrived. And now every one of those teams has a spreadsheet. A spreadsheet with the cost for each user, every month. For a big, special feature, maybe that cost is fine. But for a basic feature, paying fifty cents per user per month does not work. Multiply that by a million users, and someone in finance starts asking hard questions.

### Slide 8 — The cost flipped  (40s)

**Visible:**
- Cloud vs On-device
- Per request: $0.001–$0.10  vs  $0
- Network round-trip: 200–2000 ms  vs  none
- Data leaves: always  vs  never
- Offline: no  vs  yes

*Design:* Charcoal background. Two-column compare table. Cloud column gray #6E6E78, On-device column white with a blue #0033FF header. Numbers in Consolas. Pink #FFCCF2 highlight on the '$0' cell only.

*Speaker notes:* So put all four forces together, and the cost flips. Cloud on the left, on-device on the right. Per request, the cloud costs a fraction of a cent up to ten cents; on-device, there is no per-call cost — it is zero. And a cloud call spends two hundred to two thousand milliseconds on the network round trip; on-device there is no round trip at all — the model runs right here, so the network wait is gone. Local inference still takes a moment, but you are not paying the network tax. Does data leave the device? In the cloud, always; on-device, never. Offline? Cloud, no; on-device, yes. Here is the important idea: when the cost becomes truly free, your old habits become wrong. You stop counting calls. You can run the model on every keystroke. The whole design space changed.

## API tour: LanguageModel + task APIs

### Slide 9 — The whole surface, one page  (55s)

**Visible:**
- LanguageModel
- Summarizer
- Writer / Rewriter
- Proofreader
- Translator + LanguageDetector
- document.modelContext (WebMCP)
- Four verbs: availability -> create -> work -> destroy

*Design:* Charcoal bg, seven API names as white list, the four-verb line in electric blue at the bottom; pink accent on the word 'same' if inline. Avenir Next.

*Speaker notes:* Let me show you the whole thing on one slide. This is the complete developer surface. You get seven JavaScript globals, plus one extra layer for tools called WebMCP. That is all of it. And here is the good news. Every single one follows the same four steps. First you check availability. Then you create a session. Then you do the work. Then you destroy the session to free memory. Availability, create, work, destroy. If you learn these four steps once, you already understand every API on this list. So the surface looks big, but the mental model is small.

### Slide 10 — LanguageModel — the chat API  (45s)

**Visible:**
- Generic chat against Gemini Nano
- Use when task APIs do not fit
- Conversation, system prompts, JSON, images

*Design:* Charcoal bg, title in white, three short bullets in gray with the API name 'LanguageModel' in Consolas white; one pink highlight on 'stable since Chrome 148'.

*Speaker notes:* Let's start with LanguageModel. This is the general chat API. It talks to Gemini Nano, the small model that lives inside your browser. Good news for July 2026: this one is now stable on the web since Chrome 148. That means normal web pages can use it, not only extensions. When should you use it? Use it when the task-specific APIs do not fit your case. It handles a full conversation, system prompts, structured JSON output, and even images. So this is your flexible tool. The other APIs, which we will see soon, are more focused.

### Slide 11 — A minimal session  (70s)

```js
(async () => {
  const session = await LanguageModel.create({
    outputLanguage: 'en',
    initialPrompts: [{ role: 'system', content: 'You are a concise pirate.' }],
  });
  const reply = await session.prompt('What is the capital of France?');
  console.log(reply);            // -> Arr, the capital be Paris.
  session.destroy();
})();
```

**[DEMO]** Open /chat. Show a short streaming conversation. Keep the pirate persona as a light running gag.

*Design:* Full-width Consolas code block on charcoal, syntax in white/gray, the pirate comment line in pink; no bullets. Max 12 code lines.

*Speaker notes:* Here is the smallest example that does something real. Three moves. First, we create a session. Inside, we pass an initial prompt with the system role. This sets the personality. Here we tell the model to be a concise pirate. Second, we call prompt with our question. Third, we get text back. And the pirate answers: the capital be Paris. Now two tips for real products. Tip one: stream by default. For anything longer than one sentence, use promptStreaming, so the user sees words appear right away instead of waiting. Tip two: keep your conversation in one session. The session remembers the earlier turns, so the model has context. That is it. Create, prompt, done. The pirate stays with us for the rest of the talk.

### Slide 12 — Structured output  (68s)

```js
(async () => {
  const schema = {
    type: 'object',
    properties: {
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
    },
    required: ['sentiment'],
  };
  const session = await LanguageModel.create({ outputLanguage: 'en' });
  const out = await session.prompt('Classify: best purchase all year!',
    { responseFormat: schema });     // W3C name: responseConstraint
  console.log(JSON.parse(out));      // -> { sentiment: 'positive' }
  session.destroy();
})();
```

*Design:* Consolas code on charcoal; highlight 'responseConstraint' in electric blue; the footnote comment line in gray. Pink reserved for nothing here to keep it calm.

*Speaker notes:* This next slide is the part that makes it shippable. You give the model a JSON schema. Here the schema says: return an object with one field, sentiment, and it must be positive, negative, or neutral. Then you pass that schema as responseConstraint. Now here is the magic. While the model generates, the runtime blocks any token that would break the schema. So you get valid JSON every time. No parsing errors. No retry loops. No cleaning up messy text. This is how you build reliable features like classification and data extraction on top of a small model. One small note for today: the official W3C name is responseConstraint, but the current Chrome build still uses the name responseFormat. Same idea, two names. Check that in your version.

### Slide 13 — The task APIs  (58s)

**Visible:**
- Summarizer · Writer · Rewriter · Proofreader
- Same model, tuned per task
- More reliable than raw prompting

*Design:* Charcoal bg; four task names in white on one line with dot separators; two gray sub-lines; pink highlight only on the word 'honest' or the status caveat.

*Speaker notes:* Now the task APIs. There are four: Summarizer, Writer, Rewriter, and Proofreader. They all run on the same Gemini Nano model. But each one is tuned for its job with special settings you do not see. Because of that tuning, the output is more reliable than if you wrote your own prompt by hand. So if your task fits one of these four, prefer it. You will write less code and get better results. Now let me be honest about status, because it matters in July 2026. Summarizer is stable. But Writer, Rewriter, and Proofreader are still behind a flag or in an origin trial. So they are great for demos and experiments, but not yet ready to ship to every user.

### Slide 14 — Summarizer  (45s)

```js
(async () => {
  const text = 'Order #4021 is late; tracking stuck since Friday. Refund?';
  const summarizer = await Summarizer.create({
    type: 'key-points',
    format: 'markdown',
    length: 'medium',
    sharedContext: 'A customer support email.',
    outputLanguage: 'en',
  });
  console.log(await summarizer.summarize(text));
  summarizer.destroy();
})();
```

**[DEMO]** Open /summary. Paste a long article. Show the four summary types.

*Design:* Consolas code on charcoal; highlight the 'sharedContext' line in electric blue; other lines white/gray. Under 12 lines.

*Speaker notes:* Let's look at Summarizer, the stable one. You create it with a few options. Type key-points, format markdown, length medium. But the option I really want you to notice is sharedContext. This tells the model what kind of text it is reading. Here we say: this is a customer support email. That one line changes everything. The same model will summarize a support email, a medical article, or a team chat in the right way for each. So same model, but the output fits your product. Let me show it live.

### Slide 15 — Writer vs Rewriter  (44s)

**Visible:**
- Writer: new text from a brief
- Rewriter: transform existing text
- Both: tone, length, format

*Design:* Charcoal bg; two short labeled lines white for Writer and Rewriter; shared line in gray; pink accent on one word only, e.g. 'different'.

*Speaker notes:* Next, Writer and Rewriter. The names look almost the same, so people mix them up. But they do different jobs. Writer creates new text from a short brief. You give it an idea, it gives you a first draft. Rewriter takes text you already have and changes it. You can change the tone, make it shorter, or make it more formal. Both let you control tone, length, and format. So a simple rule: no text yet, use Writer. Text already exists, use Rewriter. They are separate APIs because the tuning behind them is different.

### Slide 15b — Writer & Rewriter — in code  (26s)

```js
(async () => {
  // Writer -> new text from a brief
  const writer = await Writer.create({ tone: 'neutral', outputLanguage: 'en' });
  console.log(await writer.write('Release note: we added dark mode.'));
  writer.destroy();

  // Rewriter -> transform text you already have
  const rewriter = await Rewriter.create({
    tone: 'more-formal', outputLanguage: 'en',
  });
  console.log(await rewriter.rewrite('hey send the invoice asap',
    { context: 'Make it polite and professional.' }));
  rewriter.destroy();
})();
```

*Design:* Console-runnable Writer + Rewriter demo. Both create() calls pass outputLanguage so Chrome does not warn. Writer/Rewriter need their Chrome flags (OT lapsed).

*Speaker notes:* Here are those two APIs in real code — and yes, you can paste this straight into the console. Writer takes a short brief and returns a first draft. Rewriter takes text you already have and reshapes it — here, more formal. Notice both calls pass an output language, English, so Chrome does not warn and the output stays clean. One honest note: Writer and Rewriter are still behind a flag today, so keep a canned fallback ready for the live demo.

### Slide 16 — Proofreader — positioned fixes  (47s)

```js
const result = await proofreader.proofread('She dont know nothing.');
// result.correctedInput: "She doesn't know anything."
// result.corrections: [{ startIndex, endIndex, correction, type }]
```

**[DEMO]** Open /proofreader. Type a sentence with mistakes. Show inline tooltips.

*Design:* Consolas code on charcoal; the corrections line with startIndex/endIndex highlighted in electric blue; corrected sentence comment in pink (single highlight).

*Speaker notes:* Last one, Proofreader. You give it a sentence with mistakes. She dont know nothing. It gives you back the corrected sentence: she doesn't know anything. But it gives you more than just clean text. It also returns a list of corrections. Each correction has a start position, an end position, the suggested fix, and a category. Why does that matter? Because with positions, you can highlight each mistake right where it is in the text. You can show a small tooltip on hover. That is exactly what you need to build inline, Grammarly-style suggestions inside your own app. Let me show it live.

## API tour: Translation + Multimodal

### Slide 17 — Translator + LanguageDetector  (50s)

**Visible:**
- LanguageDetector: which language?
- Translator: source to target
- Stable since Chrome 138
- Language packs download on demand

*Design:* Charcoal #1E1E28 background, white title. Four short gray #6E6E78 bullets. 'Stable since Chrome 138' in electric blue #0033FF. One small pink #FFCCF2 dot next to 'download on demand'. Avenir Next LT Pro.

*Speaker notes:* Let me start with the two oldest and most stable APIs. The first one is the Language Detector. You give it some text, and it tells you which language it is. The second one is the Translator. You give it a source language and a target language, and it translates. Both of these have been stable since Chrome 138. That means you can use them today, in normal web pages. The first time you use a language, the browser downloads a small language pack. After that, it stays on the device. And remember the demo I opened this talk with? That was these two APIs, plus the browser Speech API, working together.

### Slide 18 — Composing them  (50s)

**Visible:**
- Speech in, many languages out

```js
const recognition = new SpeechRecognition();
recognition.onresult = async (e) => {
  const text = e.results[i][0].transcript;
  const out = await Promise.all(
    targets.map(t => translators[t].translate(text))
  );
  render(text, out);
};
```

*Design:* Charcoal background. Code in Consolas, white with electric blue #0033FF keywords. One gray #6E6E78 bullet above code. Highlight 'Promise.all' line subtly. 7 code lines, well under limit.

*Speaker notes:* Here is the code that ran in the opening. The browser listens to my voice and turns it into text. Then, for each target language, I call a translator. I run them all in parallel with Promise dot all, and I show the results. Each translator keeps its own small language pack in memory. So after the first translation, the rest are basically instant. And here is one good tip. Create the translators when the page loads, not when the user clicks. Then the packs are already downloaded, and the very first click feels fast.

### Slide 19 — Multimodal — one option  (95s)

**Visible:**
- Add image input with one flag
- Prompts become arrays of parts
- Webcam: shrink, one request, reuse session

```js
const session = await LanguageModel.create({
  expectedInputs: [{ type: 'image' }, { type: 'text' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
  outputLanguage: 'en',
});
await session.prompt([
  { type: 'text', value: 'What is in this picture?' },
  { type: 'image', value: imageBlob },   // a Blob or ImageBitmap
]);
```

**[DEMO]** Open /multimodal. Drop a photo, ask 'What is in this picture?'. Then switch to the webcam tab to show continuous frame analysis. Optional 30s hook: show a photo of a fridge and ask what you can cook tonight — this teases the finale.

*Design:* Charcoal background. Code in Consolas, white with electric blue #0033FF for LanguageModel and keywords. Three gray #6E6E78 bullets. 'fridge' teaser evoked in speech only. Pink #FFCCF2 accent on 'one option' in title.

*Speaker notes:* Now the fun part. The Prompt API can also see images. You turn it on with one option, called expected inputs. You just say: I will send text and images. After that, your prompt is not a single string anymore. It is an array of parts. You mix text parts and image parts together. Let me show you. I open the multimodal page, I drop in a photo, and I ask: what is in this picture? Now let me switch to the webcam tab, where it looks at a live video. Three tips for webcam. First, shrink each frame before you send it, to save time. Second, keep only one request running at a time. Third, reuse one session, do not create a new one for every frame. And here is a simple example to remember: I could take a photo of my fridge and ask what I can cook tonight. Same API, just an image instead of a document.

## Section 5 — WebMCP: The Page as Tools

### Slide 20 — WebMCP — the page as tools  (52s)

**Visible:**
- document.modelContext
- The page declares its actions as tools
- Origin trial, Chrome 149+
- Do not ship to production yet

*Design:* Charcoal #1E1E28 bg, white title. document.modelContext in Consolas, electric blue #0033FF. Last bullet in pink #FFCCF2 as the single highlight. Gray #6E6E78 for the origin-trial line.

*Speaker notes:* Now the last API, and for me the most exciting one. A web page can describe its own actions as tools. Think of a button like "scale this recipe" or "add to cart." The page can expose that action as a tool that an AI agent can call. The agent can live inside the page, or inside the browser. It is a public origin trial today, starting in Chrome 149. And here is my most honest sentence of the whole talk. The entry point was just renamed. It moved from navigator dot modelContext to document dot modelContext in Chrome 150. So please do not ship this to production yet. It is still moving under our feet.

### Slide 21 — registerTool  (44s)

```js
const modelContext = document.modelContext ?? navigator.modelContext;
modelContext.registerTool({
  name: 'scaleRecipe',
  description: 'Scale a recipe to a new servings count...',
  inputSchema: { /* JSON schema */ },
  async execute({ servings }) {
    return await scaleAndSave(servings);
  },
}, { signal: controller.signal });
```

*Design:* Code slide, Consolas. Charcoal bg, white code, electric blue #0033FF for 'registerTool' and 'execute'. No pink here — keep code calm. Gray line numbers optional.

*Speaker notes:* The code is small. One method, one descriptor. You give the tool a name, a short description so the agent knows when to use it, and an input schema. Then you write the execute function. This function runs inside your page. It has your page data and the current user session. So the page is the trust boundary. The agent asks, but your code decides what actually happens. Notice the first line. We read document dot modelContext first, and fall back to the old name. That keeps the demo working across Chrome versions while the API settles down.

### Slide 21b — Session inheritance  (46s)

**Visible:**
- The agent is a guest in your tab
- It uses your existing login
- No API key, no separate auth

*Design:* Charcoal bg, white bullets, generous space. 'guest in your tab' phrase in pink #FFCCF2 as the single highlight. Gray for the third line.

*Speaker notes:* Here is the clever part. The agent does not log in on its own. It is a guest in your tab. You are already signed in on the site. So when the agent calls a tool, like buy this ticket or book this room, it just works with your session. There is no separate API key. There is no second login for the robot. In one simple line: the agent borrows your cookies while you are already logged in. This is a big deal, because it means the site does not have to build a whole new machine-to-machine login just to let an agent help the user.

### Slide 21c — Already happening  (48s)

**Visible:**
- Expedia · Booking · Shopify
- Instacart · TurboTax · Etsy · Target
- ~98% task accuracy (reported)
- ~89% fewer tokens (reported)

*Design:* Charcoal bg, white logos-as-text rows. The two stat lines in electric blue #0033FF, big. Highlight '~89% fewer tokens' in pink #FFCCF2. Gray for the small footnote.

*Speaker notes:* And this is not only a demo on my laptop. Large sites are already testing it — you can see names here that you use every week. Now compare two ways an agent can drive a website. The old way: the agent looks at a screenshot, guesses where to click, and repeats. The new way: the agent calls a real tool with clear inputs. In Google's reported tests, the tool way wins on both counts — much higher task accuracy, around ninety-eight percent, and far fewer tokens, around eighty-nine percent fewer. Why so many fewer tokens? Because there are no images to send to the model. Text tools are simply cheaper than pictures of a screen.

### Slide 21d — Google demo suite  (50s)

**Visible:**
- Maze game — escape by prompting
- CineFlow — buy movie tickets
- Hotel booking, smart home

**[DEMO]** Play a 15-second montage of Google's WebMCP demos (maze, CineFlow, hotel booking). Then open /webmcp on windowai.danduh.me and type a prompt asking the agent to scale the cake recipe to 12 servings; show the scaleRecipe tool firing and the recipe updating live.

*Design:* Charcoal bg, white bullets. One pink #FFCCF2 highlight on 'escape by prompting'. Electric blue accent bar on the left. Leave room for the live demo — minimal text.

*Speaker notes:* Google also shipped a set of demos to show this off. There is a maze that you escape by prompting an agent instead of using the arrow keys. It may be the only game where bad typing is the hard mode. There is a movie ticket flow called CineFlow. There is a hotel booking app, and a small smart home. Now let me bring this back home. Watch our own recipe page. I will simply ask the agent to scale the cake to twelve servings. I do not touch the form. The agent calls our scaleRecipe tool, our code runs, and the recipe updates. Same idea as the big sites, just small enough to fit on one screen.

## Architecture patterns

### Slide 22 — Four patterns to remember  (40s)

**Visible:**
- 1. Check availability before create
- 2. One session per feature, reuse it
- 3. One request in flight for typing
- 4. Degrade gracefully, do not block

*Design:* Charcoal #1E1E28 background, white numbered list, electric blue #0033FF for the numbers. Avenir Next LT Pro. Sparse, four short lines only.

*Speaker notes:* Let me give you four patterns. If you remember only these four, you can ship real features with these APIs. Number one: always check availability before you create a session. The model may not be ready yet. Number two: create one session per feature, and reuse it. Do not make a new session on every click. Number three: for anything that reacts to typing, keep only one request running at a time. Number four: degrade gracefully. If the API is missing, show a normal fallback. Never block the page. Let me show you two of these in code.

### Slide 23 — Show download progress  (50s)

**Visible:**
- First run downloads the model
- Never freeze the page
- Use the monitor callback

```js
const session = await LanguageModel.create({
  outputLanguage: 'en',
  monitor(m) {
    m.addEventListener('downloadprogress', e => {
      setProgress(e.loaded);
    });
  },
});
```

*Design:* Charcoal #1E1E28 background. Code in Consolas, white text, electric blue #0033FF for keywords. Pink #FFCCF2 highlight on 'downloadprogress' only. Max 12 lines. Three short bullets above the code.

*Speaker notes:* The first time a user runs your feature, the model may need to download. It can be large. So never freeze the page. First you check availability. Then, when you create the session, you pass a monitor callback. The browser sends download progress events. Here we simply read how much is loaded and update a progress bar. The user sees something moving, not a frozen screen. This is a small piece of code, but it is the difference between a demo that feels broken and one that feels finished.

### Slide 24 — Abort on new input  (55s)

**Visible:**
- Cancel the old request first
- Keep one controller
- Throttling is now a bug, not a habit

```js
let inFlight = null;
async function onInput(text) {
  if (inFlight) inFlight.abort();
  const controller = new AbortController();
  inFlight = controller;
  // pass controller.signal into promptStreaming
}
```

*Design:* Charcoal #1E1E28 background. Code in Consolas, white text, electric blue #0033FF for keywords. Pink #FFCCF2 highlight on 'abort()' only. Max 12 lines. Three short bullets above the code.

*Speaker notes:* Now the typing case. Imagine the user types, and every keystroke starts a request. Without care, the answer for keystroke five can arrive after keystroke twelve. The user sees the wrong result. So the rule is simple: before you start a new request, cancel the old one. Here we keep one controller. When new input comes, we abort the one in flight, make a fresh AbortController, and pass its signal into prompt streaming. One small note. For network APIs, we often slowed requests down on purpose, to save money. But this model is free and runs on the device. So that old habit is now more of a problem than a good idea. Just cancel and start again.

## Section 7 — Grand finale + opportunity + close

### Slide F1 — One app, every API  (35s)

**Visible:**
- One app.
- Almost every built-in API.
- Working together.

*Design:* Charcoal #1E1E28 bg, white title, three short white lines stacked, electric blue #0033FF underline on the title. Avenir Next LT Pro. Very sparse.

*Speaker notes:* So far, I showed you each API on its own. One box, one job. That is nice, but it is not the real story. The real story starts when you put them in one app, and they start to help each other. So let me show you that now. One app. Almost every built-in API we talked about today. All working together, at the same time, on your device.

### Slide F2 — [FINALE DEMO]  (95s)

**Visible:**
- Summarize · Translate · Proofread
- Rewrite · See images · Guard private data
- Drive page tools (WebMCP)

**[DEMO]** SLOT-NEUTRAL finale. Option A 'Sidekick' (Chrome extension side panel, works on any site): summarize a page, translate a selection, proofread an input, rewrite text, explain an image, warn before pasting private data, drive a WebMCP page. Option B 'The Fridge' (web app): fridge photo → recipes → translate a foreign recipe → summarize the steps → voice agent scales/swaps ingredients via WebMCP. Run one option live; keep the 10–15s pre-recorded backup clip ready and play it if live inference stalls.

*Design:* Charcoal bg, three code-gray #6E6E78 grouping lines with white API verbs, one pink #FFCCF2 dot on 'Guard private data'. IMPORTANT: play the 10–15s pre-recorded backup clip in the corner in case live inference stalls.

*Speaker notes:* Watch what happens. First, I open a page full of text, and I ask for a short summary. The model reads it and gives me the key points in a few seconds. Nothing leaves my machine. Next, part of this page is in another language, so I select it and translate it, right here, offline. Now I type a reply. As I type, the tool proofreads my text and offers a cleaner version if I want it. Then I drop in an image, and I ask, what is this? The model looks at the picture and explains it. And here is my favorite part. Before I paste something that looks private, like an email or a card number, the tool warns me. Finally, the app talks to the page itself through WebMCP, and drives the tools on that page for me. So think about what just happened. I did not build a big AI product. I built one small tool. And suddenly, every website feels smart.

### Slide F3 — Finale punchline  (35s)

**Visible:**
- Not one AI product.
- A smarter browser.

*Design:* Charcoal bg. Two lines, big. 'Not one AI product.' in gray #6E6E78, 'A smarter browser.' in white with electric blue #0033FF accent bar. Lots of empty space.

*Speaker notes:* This is the point I want you to keep. The value is not any single feature on that list. The value is that the browser itself can now make an ordinary page feel intelligent. It reads, it translates, it explains, it protects you. For free. And in private, on your device. You did not add AI to one product. You made the whole browser a little bit smarter.

### Slide 25 — What this unlocks  (20s)

**Visible:**
- What this unlocks

*Design:* Full-bleed charcoal, single centered line in white, electric blue #0033FF underscore. Transition slide, minimal.

*Speaker notes:* So that is the how. Now let me switch to the what. What can you actually build with this? Let me hold here for one second, because this next part is the reason I gave this talk.

### Slide 26 — Seven categories  (70s)

**Visible:**
- Real-time text
- Privacy-first AI
- Offline AI
- Ambient editor help
- Multimodal "show me"
- Agentic web (early)
- The "used to be too expensive" set

*Design:* Charcoal bg, seven short white lines in a tight list, small electric blue #0033FF number badges. Item seven gets a single pink #FFCCF2 highlight. Consolas only if a label is code-like; here plain text.

*Speaker notes:* Here are seven kinds of products. Eighteen months ago, all of them were too expensive for most teams. Today they are cheap. One. Real-time text, like live translation in a chat. Two. Privacy-first AI, where the data never leaves the device. Three. Offline AI, that still works on a plane or a train. Four. Ambient editor help, like proofreading that just happens while you type. Five. Multimodal, where the user points at an image and says, show me what this is. Six. The agentic web, still early, where an agent uses the tools on your page for the user. And seven, the big one. Everything that used to be too expensive to even try. Now you can just try it.

### Slide 27 — What stays in the cloud  (60s)

**Visible:**
- Long-context reasoning
- Complex code and math
- Factual recall
- Multi-user shared state
- Hybrid is the answer

*Design:* Charcoal bg, four gray #6E6E78 'cloud' items, then 'Hybrid is the answer' in white with electric blue #0033FF accent. Clean two-tone contrast.

*Speaker notes:* Now let me be honest with you, because this matters. On-device does not replace the cloud. The model in your browser is small. That is the whole point, but it is also the limit. Long documents that need deep reasoning? Cloud. Complex code and hard math? Cloud. Questions that need broad, up-to-date facts? Cloud. Shared state between many users? That is a server job. So the right design is not local or cloud. It is hybrid. Use the small local model for the fast, private, always-on layer. Send the heavy work to the cloud. Each one does what it is good at.

### Slide 28 — The first thing to ship  (55s)

**Visible:**
- User wishes it was automatic
- Clear privacy stakes
- No long context needed
- A clean fallback exists

*Design:* Charcoal bg, four white checklist lines with electric blue #0033FF check marks. One pink #FFCCF2 tick on the last item. Sparse.

*Speaker notes:* So if your team wants to add just one on-device feature this quarter, how do you pick? Use these four points. One. The user already wishes this thing was automatic. Two. There is a clear privacy reason to keep the data local. Three. It does not need a long document as context. And four. You have a clean fallback for browsers that do not support it yet. If a feature fits all four, ship that one first. Good examples? Live translation. Inline proofreading. Smart paste. Summarize on save. Or private-data detection, like we saw in the demo.

### Slide 29 — Closing line  (58s)

**Visible:**
- The browser became an AI runtime.
- It happened quietly.

*Design:* Charcoal bg. Two lines, large, centered. First line white, second line 'and nobody sent you a memo.' in electric blue #0033FF. Small gray #6E6E78 footnote if any. Big empty margins.

*Speaker notes:* Let me slow down for the close. Not long ago, the idea 'what if we just ran a language model right here' needed a big budget and a long plan. Servers, bills, meetings. Now it needs one create call. That is the shift. The browser quietly became a place to run AI. Nobody announced it. But it is here. The teams that notice this in 2026 will ship the next web apps. And one more calm thought. Your next important user may not be a person. It may be an AI agent that helps them. WebMCP is how your page says hello to that agent. Just remember: WebMCP is still changing quickly, so do not ship it to production yet.

### Slide 30 — Resources  (30s)

**Visible:**
- Live demos: windowai.danduh.me
- Source: github.com/danduh/window-ai
- Chrome docs: developer.chrome.com/docs/ai
- WebMCP: webmachinelearning.github.io/webmcp
- [Speaker handles — placeholder]

**[DEMO]** Stay on this slide for Q&A.

*Design:* Charcoal bg, five monospace Consolas link lines in white, electric blue #0033FF for the URLs, gray #6E6E78 for the placeholder handle line. Keep on screen through Q&A.

*Speaker notes:* Thank you so much for your time. Everything I showed you today is live, running in the browser, and you can try it yourself. The demos are at windowai.danduh.me. The full source code is on GitHub. The Chrome team docs and the WebMCP spec are on these links too. I will stay on this slide, and I would love to take your questions.
